import { create } from 'zustand';
import { persist, createJSONStorage, PersistStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameState,
  FallingPuyo,
  ErasingPuyo,
  PuyoColor,
  GameSnapshot,
  RngState,
  Position,
} from '../logic/types';
import { cloneField } from '../logic/field';
import {
  createInitialGameState,
  startGame,
  lockFallingPuyo,
  advancePhase,
  updateFallingPuyo,
} from '../logic/game';
import { detectErasingPuyos } from '../logic/chain';
import { useConfigStore, CHAIN_ANIMATION_DELAYS } from './configStore';
import {
  movePuyo,
  rotatePuyo,
  dropPuyo,
  hardDropPuyo,
  setColumn,
  setRotation,
  getSatellitePosition,
  createFallingPuyo,
} from '../logic/puyo';
import { PuyoRng, generateSeed } from '../logic/random';
import { GameAction } from './actions';
import { useGameHistoryStore } from './gameHistoryStore';

interface GameStore extends GameState {
  // 消えているぷよ（エフェクト表示用）
  erasingPuyos: ErasingPuyo[];
  // 操作履歴（スナップショット配列）
  history: GameSnapshot[];
  // 次のスナップショットID
  nextSnapshotId: number;
  // 連鎖中の一時保存用（連鎖完了後にスナップショット作成）
  pendingSnapshot: {
    droppedPositions: Position[];
    rngState: RngState;
    nextQueue: [PuyoColor, PuyoColor][];
  } | null;

  // アクション
  dispatch: (action: GameAction) => void;
  clearErasingPuyos: () => void;
  // 履歴への復元
  restoreToSnapshot: (snapshotId: number) => void;
  // ゲーム履歴からゲームを再開
  resumeFromHistory: (gameHistoryId: string, fromFavorites?: boolean) => boolean;
  // ゲーム履歴から状態を複製して新しいゲームとして開始
  forkFromHistory: (gameHistoryId: string, fromFavorites?: boolean) => boolean;
  // ゲーム履歴から新しいシードで状態を複製して新しいゲームとして開始
  forkWithNewSeedFromHistory: (gameHistoryId: string, fromFavorites?: boolean) => boolean;
}

type PersistedGameState = Pick<
  GameStore,
  'field' | 'nextQueue' | 'score' | 'chainCount' | 'phase' | 'history' | 'nextSnapshotId' | 'selectedColors'
>;

// 消去アニメーション開始までの遅延タイマーID
let erasingDelayId: ReturnType<typeof setTimeout> | null = null;

function cancelErasingDelay(): void {
  if (erasingDelayId !== null) {
    clearTimeout(erasingDelayId);
    erasingDelayId = null;
  }
}

// 消去アニメーション開始までの遅延を取得
function getErasingDelay(): number {
  return CHAIN_ANIMATION_DELAYS[useConfigStore.getState().chainAnimationSpeed];
}

// グローバル乱数生成器
let rng: PuyoRng = new PuyoRng(generateSeed());

// スナップショットを作成するヘルパー関数
function createSnapshot(
  state: GameState,
  id: number,
  rngState: RngState,
  droppedPositions: Position[],
  nextQueue: [PuyoColor, PuyoColor][],  // advancePhase 前の nextQueue を渡す
  selectedColors: PuyoColor[]
): GameSnapshot {
  return {
    id,
    field: cloneField(state.field),
    nextQueue: nextQueue.map(pair => [...pair] as [PuyoColor, PuyoColor]),
    score: state.score,
    chainCount: state.chainCount,
    rngState: [...rngState] as RngState,
    droppedPositions,
    selectedColors: [...selectedColors],
  };
}

// 初期状態を作成するヘルパー関数（エフェクトや連鎖中の一時保存もリセットする）
function createInitialState(): Pick<
  GameStore,
  keyof GameState | 'history' | 'nextSnapshotId' | 'erasingPuyos' | 'pendingSnapshot'
> {
  rng = new PuyoRng(generateSeed());
  // ゲームごとにランダムに4色を選択
  const selectedColors = rng.selectRandomColors();
  // 最初の2手は最大3色制限（ぷよぷよ通の仕様）
  const [firstPair, secondPair] = rng.generateInitialPairs();
  const nextQueue: [PuyoColor, PuyoColor][] = [
    firstPair,
    secondPair,
    rng.nextPuyoPair(),
  ];
  const gameState = createInitialGameState(nextQueue, selectedColors);
  return {
    ...gameState,
    history: [],
    nextSnapshotId: 0,
    erasingPuyos: [],
    pendingSnapshot: null,
  };
}

// 次のフェーズへ進める
// 新しいぷよペアは操作ぷよを出したときだけ乱数から消費する。連鎖中やゲームオーバーで使われないペアの分まで
// 乱数を進めると、スナップショットの乱数状態（落下前）から復元したときに NEXT が実際のプレイとずれるため
function advancePhaseWithRng(state: GameState): GameState {
  const rngState = rng.getState();
  const nextState = advancePhase(state, rng.nextPuyoPair());
  if (nextState.phase !== 'falling') {
    rng.setState(rngState);
  }
  return nextState;
}

// 操作ぷよを動かすアクションを適用（動かせない、または操作ぷよを動かすアクションでなければ null）
function applyControlAction(
  state: GameState,
  fallingPuyo: FallingPuyo,
  action: GameAction
): FallingPuyo | null {
  switch (action.type) {
    case 'MOVE_LEFT': return movePuyo(state.field, fallingPuyo, 'left');
    case 'MOVE_RIGHT': return movePuyo(state.field, fallingPuyo, 'right');
    case 'ROTATE_CW': return rotatePuyo(state.field, fallingPuyo, 'cw');
    case 'ROTATE_CCW': return rotatePuyo(state.field, fallingPuyo, 'ccw');
    case 'SOFT_DROP': return dropPuyo(state.field, fallingPuyo);
    case 'SET_COLUMN': return setColumn(state.field, fallingPuyo, action.column);
    case 'SET_ROTATION': return setRotation(state.field, fallingPuyo, action.rotation);
    default: return null;
  }
}

// 操作ぷよの位置と回転が同じか
function isSamePlacement(a: FallingPuyo, b: FallingPuyo): boolean {
  return a.rotation === b.rotation && a.pivot.pos.x === b.pivot.pos.x && a.pivot.pos.y === b.pivot.pos.y;
}

// 永続化対象が前回の書き込みから変わっていなければ書き込みを省略する
// （操作ぷよの移動など永続化対象外の変更のたびに履歴全体を書き込まないため）
function skipUnchangedWrites<S extends object>(
  storage: PersistStorage<S> | undefined
): PersistStorage<S> | undefined {
  if (!storage) return storage;
  let lastWritten: S | null = null;
  return {
    ...storage,
    setItem: (name, value) => {
      const prev = lastWritten;
      const keys = Object.keys(value.state) as (keyof S)[];
      if (prev && keys.every(key => value.state[key] === prev[key])) return;
      lastWritten = value.state;
      return storage.setItem(name, value);
    },
    removeItem: (name) => {
      // 削除後は同じ状態でも書き込み直す
      lastWritten = null;
      return storage.removeItem(name);
    },
  };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      // 現在のゲーム状態をゲーム履歴に反映
      const syncCurrentGame = () => {
        const s = get();
        useGameHistoryStore.getState().updateCurrentGame(
          s.field,
          s.score,
          s.chainCount,
          s.history,
          s.nextSnapshotId
        );
      };

      // 遅延後に消えるぷよを検出して erasing フェーズへ遷移
      const scheduleErasing = () => {
        erasingDelayId = setTimeout(() => {
          const currentState = get();
          if (currentState.phase === 'chaining') {
            const erasingPuyos = detectErasingPuyos(currentState.field);
            if (erasingPuyos.length > 0) {
              set({ erasingPuyos, phase: 'erasing' });
            }
          }
        }, getErasingDelay());
      };

      // スナップショットの状態からゲームを再開する
      const loadSnapshot = (
        snapshot: GameSnapshot,
        history: GameSnapshot[],
        nextSnapshotId: number
      ) => {
        cancelErasingDelay();

        // 乱数生成器の状態を復元
        rng.setState(snapshot.rngState);
        const selectedColors = snapshot.selectedColors;
        rng.setSelectedColors(selectedColors);

        // NEXT の先頭を操作ぷよにして、新しいぷよペアを末尾に追加
        const [[pivotColor, satelliteColor], ...restQueue] = snapshot.nextQueue;
        const newPair = rng.nextPuyoPair();

        set({
          // 連鎖完了後の状態なので重力適用不要
          field: cloneField(snapshot.field),
          fallingPuyo: createFallingPuyo(pivotColor, satelliteColor),
          nextQueue: [...restQueue, newPair],
          score: snapshot.score,
          chainCount: snapshot.chainCount,
          phase: 'falling',
          erasingPuyos: [],
          history,
          nextSnapshotId,
          pendingSnapshot: null,
          selectedColors,
        });
      };

      // 再開可能なゲーム履歴エントリを取得
      const findResumableEntry = (gameHistoryId: string, fromFavorites: boolean) => {
        const entry = useGameHistoryStore.getState().findEntry(gameHistoryId, fromFavorites);
        return entry && entry.operationHistory.length > 0 ? entry : undefined;
      };

      return {
        // 初期状態
        ...createInitialState(),

        // アクションディスパッチャー
        dispatch: (action: GameAction) => {
          const state = get();

          switch (action.type) {
            case 'START_GAME': {
              if (state.phase === 'ready') {
                // ゲーム履歴に新しいゲームを開始
                useGameHistoryStore.getState().startNewGame();

                // ゲーム開始前のスナップショットを保存（初期状態なので落下位置は空）
                const initialSnapshot = createSnapshot(state, state.nextSnapshotId, rng.getState(), [], state.nextQueue, state.selectedColors);

                const newState = startGame(state, rng.nextPuyoPair());
                set({
                  ...newState,
                  history: [initialSnapshot],
                  nextSnapshotId: state.nextSnapshotId + 1,
                });
                syncCurrentGame();
              }
              break;
            }

            case 'RESTART_GAME': {
              cancelErasingDelay();
              set(createInitialState());
              break;
            }

            case 'HARD_DROP': {
              if (state.phase === 'falling' && state.fallingPuyo) {
                // 乱数状態を先に保存（復元用）
                const rngStateBeforeDrop = rng.getState();

                const droppedPuyo = hardDropPuyo(state.field, state.fallingPuyo);

                // 落下位置を記録
                const droppedPositions: Position[] = [
                  { ...droppedPuyo.pivot.pos },
                  getSatellitePosition(droppedPuyo),
                ];

                // 新しいぷよを落下させる前に連鎖数をリセット
                const lockedState = lockFallingPuyo(
                  updateFallingPuyo({ ...state, chainCount: 0 }, droppedPuyo)
                );

                const nextState = advancePhaseWithRng(lockedState);

                // chainingフェーズになったら連鎖完了後にスナップショットを作成
                if (nextState.phase === 'chaining') {
                  // pendingSnapshot に一時保存（連鎖完了後にスナップショット作成）
                  // lockedState.nextQueue は advancePhase 前の nextQueue
                  set({
                    ...nextState,
                    pendingSnapshot: {
                      droppedPositions,
                      rngState: rngStateBeforeDrop,
                      nextQueue: lockedState.nextQueue,
                    },
                  });
                  // 連鎖中の状態を保存（スナップショットはまだ追加しない）
                  syncCurrentGame();
                  scheduleErasing();
                  return;
                }

                // 連鎖なしの場合は即座にスナップショットを作成
                // lockedState.nextQueue は advancePhase 前の nextQueue
                const snapshot = createSnapshot(nextState, state.nextSnapshotId, rngStateBeforeDrop, droppedPositions, lockedState.nextQueue, state.selectedColors);

                set({
                  ...nextState,
                  history: [...state.history, snapshot],
                  nextSnapshotId: state.nextSnapshotId + 1,
                  pendingSnapshot: null,
                });
                syncCurrentGame();
              }
              break;
            }

            default: {
              if (state.phase === 'falling' && state.fallingPuyo) {
                const newFallingPuyo = applyControlAction(state, state.fallingPuyo, action);
                // 位置も回転も変わらない場合は更新しない（タッチ・スワイプ中の連続入力で不要な再描画をしない）
                if (newFallingPuyo && !isSamePlacement(newFallingPuyo, state.fallingPuyo)) {
                  set({ fallingPuyo: newFallingPuyo });
                }
              }
              break;
            }
          }
        },

        // 履歴への復元
        restoreToSnapshot: (snapshotId: number) => {
          const { history } = get();
          const snapshotIndex = history.findIndex(s => s.id === snapshotId);
          if (snapshotIndex === -1) return;

          // 履歴をスナップショット時点まで切り詰める
          // （ID が位置と一致しない履歴でも重複しないよう、次の ID はスナップショットの ID から決める）
          loadSnapshot(history[snapshotIndex], history.slice(0, snapshotIndex + 1), snapshotId + 1);
          // ゲーム履歴を更新（trimmed された履歴を永続化）
          syncCurrentGame();
        },

        // ゲーム履歴からゲームを再開
        resumeFromHistory: (gameHistoryId: string, fromFavorites: boolean = false) => {
          const entry = findResumableEntry(gameHistoryId, fromFavorites);
          if (!entry) return false;

          const history = entry.operationHistory;
          loadSnapshot(history[history.length - 1], history, entry.nextSnapshotId);

          // ゲーム履歴の現在のゲームIDを設定
          useGameHistoryStore.getState().setCurrentGameId(gameHistoryId);
          return true;
        },

        // ゲーム履歴から状態を複製して新しいゲームとして開始
        forkFromHistory: (gameHistoryId: string, fromFavorites: boolean = false) => {
          const entry = findResumableEntry(gameHistoryId, fromFavorites);
          if (!entry) return false;

          // 同じシードで継続
          const history = entry.operationHistory;
          loadSnapshot(history[history.length - 1], history, entry.nextSnapshotId);

          // 新しいゲームとして履歴を保存
          useGameHistoryStore.getState().startNewGame();
          syncCurrentGame();
          return true;
        },

        // ゲーム履歴から新しいシードで状態を複製して新しいゲームとして開始
        forkWithNewSeedFromHistory: (gameHistoryId: string, fromFavorites: boolean = false) => {
          const entry = findResumableEntry(gameHistoryId, fromFavorites);
          if (!entry) return false;

          const lastSnapshot = entry.operationHistory[entry.operationHistory.length - 1];
          // 同じフィールド状態を継続するため、色は元のゲームと同じにする
          const selectedColors = lastSnapshot.selectedColors;

          // 新しいシードで乱数生成器を初期化し、最後のスナップショットの NEXT と乱数状態を差し替える
          rng = new PuyoRng(generateSeed(), selectedColors);
          const reseededSnapshot: GameSnapshot = {
            ...lastSnapshot,
            nextQueue: [rng.nextPuyoPair(), rng.nextPuyoPair(), rng.nextPuyoPair()],
            rngState: rng.getState(),
            selectedColors,
          };
          const history = [...entry.operationHistory.slice(0, -1), reseededSnapshot];
          loadSnapshot(reseededSnapshot, history, entry.nextSnapshotId);

          // 新しいゲームとして履歴を保存
          useGameHistoryStore.getState().startNewGame();
          syncCurrentGame();
          return true;
        },

        // 消えているぷよをクリア（アニメーション完了時に呼ばれる）
        clearErasingPuyos: () => {
          const state = get();
          if (state.phase !== 'erasing') {
            set({ erasingPuyos: [] });
            return;
          }

          // アニメーション完了後、連鎖処理を実行して次のフェーズへ
          const afterChainState = advancePhaseWithRng({ ...state, phase: 'chaining' });

          // 次の連鎖があれば遅延後にerasingへ遷移
          if (afterChainState.phase === 'chaining') {
            set({ ...afterChainState, erasingPuyos: [] });
            // 連鎖中のスコアと連鎖数を保存
            syncCurrentGame();
            scheduleErasing();
            return;
          }

          // 連鎖完了：pendingSnapshot があればスナップショットを作成
          const { pendingSnapshot } = state;
          if (pendingSnapshot) {
            const snapshot = createSnapshot(
              afterChainState,
              state.nextSnapshotId,
              pendingSnapshot.rngState,
              pendingSnapshot.droppedPositions,
              pendingSnapshot.nextQueue,
              state.selectedColors
            );
            set({
              ...afterChainState,
              erasingPuyos: [],
              history: [...state.history, snapshot],
              nextSnapshotId: state.nextSnapshotId + 1,
              pendingSnapshot: null,
            });
          } else {
            set({ ...afterChainState, erasingPuyos: [] });
          }
          syncCurrentGame();
        },
      };
    },
    {
      name: 'renren-game',
      storage: skipUnchangedWrites(createJSONStorage<PersistedGameState>(() => AsyncStorage)),
      // 永続化する項目を選択（関数やエフェクト状態は除外）
      partialize: (state): PersistedGameState => ({
        field: state.field,
        nextQueue: state.nextQueue,
        score: state.score,
        chainCount: state.chainCount,
        phase: state.phase,
        history: state.history,
        nextSnapshotId: state.nextSnapshotId,
        selectedColors: state.selectedColors,
      }),
      // 復元時の処理
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // 終了したゲームは、戻るボタンで抜けたとき（RESTART_GAME）と同じく初期状態に戻す
        if (state.phase === 'gameover') {
          useGameStore.setState(createInitialState());
          return;
        }

        if (state.history.length === 0) {
          // 開始前の状態：乱数生成器が永続化された NEXT と同じ色でぷよを生成するよう揃える
          rng.setSelectedColors(state.selectedColors);
          return;
        }

        // 最後のスナップショットから乱数状態を復元
        const lastSnapshot = state.history[state.history.length - 1];
        rng.setState(lastSnapshot.rngState);
        const restoredColors = lastSnapshot.selectedColors;
        rng.setSelectedColors(restoredColors);

        // 進行中だったゲームは ready フェーズに戻す（fallingPuyo は永続化されないため）
        // 次のゲーム開始時に正しく動作するよう、盤面と NEXT も乱数状態と対応する最後のスナップショットに揃える
        // （永続化された NEXT は操作ぷよを出した後のもので、連鎖途中の盤面には消えるぷよが残っていることがある）
        useGameStore.setState({
          field: cloneField(lastSnapshot.field),
          nextQueue: lastSnapshot.nextQueue,
          score: lastSnapshot.score,
          chainCount: lastSnapshot.chainCount,
          phase: 'ready',
          fallingPuyo: null,
          selectedColors: restoredColors,
        });
      },
    }
  )
);
