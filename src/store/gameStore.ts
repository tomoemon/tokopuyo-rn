import { create } from 'zustand';
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
  // 操作履歴（スナップショット配列。スナップショットの id は配列の位置と同じ）
  history: GameSnapshot[];
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
  // ゲーム履歴から読み込んだスナップショットで、ゲームを再開する（スナップショットが空なら何もせず false）
  resumeFromHistory: (gameHistoryId: string, snapshots: GameSnapshot[]) => boolean;
  // ゲーム履歴から読み込んだスナップショットの状態を複製して、新しいゲームとして開始
  forkFromHistory: (snapshots: GameSnapshot[]) => boolean;
  // ゲーム履歴から読み込んだスナップショットの状態を複製して、新しいシードで新しいゲームとして開始
  forkWithNewSeedFromHistory: (snapshots: GameSnapshot[]) => boolean;
}

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
  keyof GameState | 'history' | 'erasingPuyos' | 'pendingSnapshot'
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

export const useGameStore = create<GameStore>()((set, get) => {
  // 現在のゲーム状態をゲーム履歴に反映
  const syncCurrentGame = () => {
    const s = get();
    useGameHistoryStore.getState().updateCurrentGame(
      s.field,
      s.score,
      s.chainCount,
      s.history
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
  const loadSnapshot = (snapshot: GameSnapshot, history: GameSnapshot[]) => {
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
      pendingSnapshot: null,
      selectedColors,
    });
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
            const initialSnapshot = createSnapshot(state, 0, rng.getState(), [], state.nextQueue, state.selectedColors);

            const newState = startGame(state, rng.nextPuyoPair());
            set({
              ...newState,
              history: [initialSnapshot],
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
              // 連鎖の途中では保存しない（連鎖が終わってスナップショットを追加したときに保存する）
              scheduleErasing();
              return;
            }

            // 連鎖なしの場合は即座にスナップショットを作成
            // lockedState.nextQueue は advancePhase 前の nextQueue
            const snapshot = createSnapshot(nextState, state.history.length, rngStateBeforeDrop, droppedPositions, lockedState.nextQueue, state.selectedColors);

            set({
              ...nextState,
              history: [...state.history, snapshot],
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
      loadSnapshot(history[snapshotIndex], history.slice(0, snapshotIndex + 1));
      // ゲーム履歴を更新（trimmed された履歴を永続化）
      syncCurrentGame();
    },

    // ゲーム履歴からゲームを再開
    resumeFromHistory: (gameHistoryId: string, snapshots: GameSnapshot[]) => {
      if (snapshots.length === 0) return false;

      loadSnapshot(snapshots[snapshots.length - 1], snapshots);

      // ゲーム履歴の現在のゲームIDを設定
      useGameHistoryStore.getState().setCurrentGameId(gameHistoryId);
      return true;
    },

    // ゲーム履歴から状態を複製して新しいゲームとして開始
    forkFromHistory: (snapshots: GameSnapshot[]) => {
      if (snapshots.length === 0) return false;

      // 同じシードで継続
      loadSnapshot(snapshots[snapshots.length - 1], snapshots);

      // 新しいゲームとして履歴を保存
      useGameHistoryStore.getState().startNewGame();
      syncCurrentGame();
      return true;
    },

    // ゲーム履歴から新しいシードで状態を複製して新しいゲームとして開始
    forkWithNewSeedFromHistory: (snapshots: GameSnapshot[]) => {
      if (snapshots.length === 0) return false;

      const lastSnapshot = snapshots[snapshots.length - 1];
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
      const history = [...snapshots.slice(0, -1), reseededSnapshot];
      loadSnapshot(reseededSnapshot, history);

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
        scheduleErasing();
        return;
      }

      // 連鎖完了：pendingSnapshot があればスナップショットを作成
      const { pendingSnapshot } = state;
      if (pendingSnapshot) {
        const snapshot = createSnapshot(
          afterChainState,
          state.history.length,
          pendingSnapshot.rngState,
          pendingSnapshot.droppedPositions,
          pendingSnapshot.nextQueue,
          state.selectedColors
        );
        set({
          ...afterChainState,
          erasingPuyos: [],
          history: [...state.history, snapshot],
          pendingSnapshot: null,
        });
      } else {
        set({ ...afterChainState, erasingPuyos: [] });
      }
      syncCurrentGame();
    },
  };
});
