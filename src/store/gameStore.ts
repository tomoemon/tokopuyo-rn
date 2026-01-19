import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameState,
  FallingPuyo,
  ChainResult,
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
import { findErasableGroups, flattenGroups } from '../logic/chain';
import { getPuyo } from '../logic/field';
import {
  movePuyo,
  rotatePuyo,
  dropPuyo,
  hardDropPuyo,
  isLanded,
  setColumn,
  setRotation,
  getSatellitePosition,
} from '../logic/puyo';
import { PuyoRng, generateSeed } from '../logic/random';
import { GameAction } from './actions';
import { useGameHistoryStore } from './gameHistoryStore';

interface GameStore extends GameState {
  // 現在の連鎖結果（エフェクト表示用）
  currentChainResult: ChainResult | null;
  // 消えているぷよ（エフェクト表示用）
  erasingPuyos: ErasingPuyo[];
  // 操作履歴（スナップショット配列）
  history: GameSnapshot[];
  // 次のスナップショットID
  nextSnapshotId: number;

  // アクション
  dispatch: (action: GameAction) => void;
  clearErasingPuyos: () => void;
  // 履歴への復元
  restoreToSnapshot: (snapshotId: number) => void;
  // ゲーム履歴からゲームを再開
  resumeFromHistory: (gameHistoryId: string, fromFavorites?: boolean) => boolean;

  // 内部メソッド
  tick: () => void;
  startGameLoop: () => void;
  stopGameLoop: () => void;
}

// ゲームループのインターバルID
let gameLoopId: ReturnType<typeof setInterval> | null = null;

// 消去アニメーション開始までの遅延タイマーID
let erasingDelayId: ReturnType<typeof setTimeout> | null = null;

// 落下速度（ミリ秒）
const DROP_INTERVAL = 1000;

// 消去アニメーション開始までの遅延（ミリ秒）
const ERASING_DELAY = 200;

// グローバル乱数生成器
let rng: PuyoRng = new PuyoRng(generateSeed());

// 消えるぷよを検出してerasingフェーズに遷移する処理
function detectErasingPuyos(
  field: GameState['field']
): { erasingPuyos: ErasingPuyo[]; phase: 'erasing' } | null {
  const groups = findErasableGroups(field);
  if (groups.length === 0) {
    return null;
  }
  const positions = flattenGroups(groups);
  const erasingPuyos: ErasingPuyo[] = positions
    .map((pos) => {
      const color = getPuyo(field, pos);
      if (color !== null) {
        return { pos, color };
      }
      return null;
    })
    .filter((p): p is ErasingPuyo => p !== null);
  return { erasingPuyos, phase: 'erasing' };
}

// スナップショットを作成するヘルパー関数
function createSnapshot(
  state: GameState,
  id: number,
  rngState: RngState,
  droppedPositions: Position[]
): GameSnapshot {
  return {
    id,
    field: cloneField(state.field),
    nextQueue: state.nextQueue.map(pair => [...pair] as [PuyoColor, PuyoColor]),
    score: state.score,
    chainCount: state.chainCount,
    rngState: [...rngState] as RngState,
    droppedPositions,
  };
}

// 初期状態を作成するヘルパー関数
function createInitialState(): GameState & { history: GameSnapshot[]; nextSnapshotId: number } {
  rng = new PuyoRng(generateSeed());
  const nextQueue: [PuyoColor, PuyoColor][] = [
    rng.nextPuyoPair(),
    rng.nextPuyoPair(),
    rng.nextPuyoPair(),
  ];
  const gameState = createInitialGameState(nextQueue);
  return {
    ...gameState,
    history: [],
    nextSnapshotId: 0,
  };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
  // 初期状態
  ...createInitialState(),
  currentChainResult: null,
  erasingPuyos: [],

  // アクションディスパッチャー
  dispatch: (action: GameAction) => {
    const state = get();

    switch (action.type) {
      case 'START_GAME': {
        if (state.phase === 'ready') {
          // ゲーム履歴に新しいゲームを開始
          useGameHistoryStore.getState().startNewGame();

          // ゲーム開始前のスナップショットを保存（初期状態なので落下位置は空）
          const rngState = rng.getState();
          const initialSnapshot = createSnapshot(state, state.nextSnapshotId, rngState, []);

          const newPair = rng.nextPuyoPair();
          const newState = startGame(state, newPair);
          set({
            ...newState,
            history: [initialSnapshot],
            nextSnapshotId: state.nextSnapshotId + 1,
          });

          // ゲーム履歴を更新（初期状態）
          useGameHistoryStore.getState().updateCurrentGame(
            newState.field,
            newState.score,
            0,
            [initialSnapshot],
            state.nextSnapshotId + 1
          );

          get().startGameLoop();
        }
        break;
      }

      case 'RESTART_GAME': {
        get().stopGameLoop();
        if (erasingDelayId !== null) {
          clearTimeout(erasingDelayId);
          erasingDelayId = null;
        }
        const newState = createInitialState();
        set({ ...newState, currentChainResult: null, erasingPuyos: [] });
        break;
      }

      case 'MOVE_LEFT': {
        if (state.phase === 'falling' && state.fallingPuyo) {
          const newFallingPuyo = movePuyo(state.field, state.fallingPuyo, 'left');
          if (newFallingPuyo) {
            set({ fallingPuyo: newFallingPuyo });
          }
        }
        break;
      }

      case 'MOVE_RIGHT': {
        if (state.phase === 'falling' && state.fallingPuyo) {
          const newFallingPuyo = movePuyo(state.field, state.fallingPuyo, 'right');
          if (newFallingPuyo) {
            set({ fallingPuyo: newFallingPuyo });
          }
        }
        break;
      }

      case 'ROTATE_CW': {
        if (state.phase === 'falling' && state.fallingPuyo) {
          const newFallingPuyo = rotatePuyo(state.field, state.fallingPuyo, 'cw');
          if (newFallingPuyo) {
            set({ fallingPuyo: newFallingPuyo });
          }
        }
        break;
      }

      case 'ROTATE_CCW': {
        if (state.phase === 'falling' && state.fallingPuyo) {
          const newFallingPuyo = rotatePuyo(state.field, state.fallingPuyo, 'ccw');
          if (newFallingPuyo) {
            set({ fallingPuyo: newFallingPuyo });
          }
        }
        break;
      }

      case 'SOFT_DROP': {
        if (state.phase === 'falling' && state.fallingPuyo) {
          const newFallingPuyo = dropPuyo(state.field, state.fallingPuyo);
          if (newFallingPuyo) {
            set({ fallingPuyo: newFallingPuyo });
          }
        }
        break;
      }

      case 'HARD_DROP': {
        if (state.phase === 'falling' && state.fallingPuyo) {
          // 乱数状態を先に保存（復元用）
          const rngStateBeforeDrop = rng.getState();

          const droppedPuyo = hardDropPuyo(state.field, state.fallingPuyo);

          // 落下位置を記録
          const pivotPos = droppedPuyo.pivot.pos;
          const satellitePos = getSatellitePosition(droppedPuyo);
          const droppedPositions: Position[] = [
            { x: pivotPos.x, y: pivotPos.y },
            { x: satellitePos.x, y: satellitePos.y },
          ];

          const stateWithDroppedPuyo = updateFallingPuyo(state, droppedPuyo);
          const lockedState = lockFallingPuyo(stateWithDroppedPuyo);

          // 落下後のフィールドでスナップショットを作成（落下位置を含む）
          const snapshot = createSnapshot(lockedState, state.nextSnapshotId, rngStateBeforeDrop, droppedPositions);

          // 新しいぷよペアを生成
          const newPair = rng.nextPuyoPair();
          const nextState = advancePhase(lockedState, newPair);

          // 履歴に追加
          const newHistory = [...state.history, snapshot];

          // chainingフェーズになったら遅延後にerasingへ遷移
          if (nextState.phase === 'chaining') {
            set({
              ...nextState,
              history: newHistory,
              nextSnapshotId: state.nextSnapshotId + 1,
            });

            // ゲーム履歴を更新
            useGameHistoryStore.getState().updateCurrentGame(
              nextState.field,
              nextState.score,
              nextState.chainCount,
              newHistory,
              state.nextSnapshotId + 1
            );

            erasingDelayId = setTimeout(() => {
              const currentState = get();
              if (currentState.phase === 'chaining') {
                const erasing = detectErasingPuyos(currentState.field);
                if (erasing) {
                  set(erasing);
                }
              }
            }, ERASING_DELAY);
            return;
          }
          set({
            ...nextState,
            history: newHistory,
            nextSnapshotId: state.nextSnapshotId + 1,
          });

          // ゲーム履歴を更新
          useGameHistoryStore.getState().updateCurrentGame(
            nextState.field,
            nextState.score,
            nextState.chainCount,
            newHistory,
            state.nextSnapshotId + 1
          );
        }
        break;
      }

      case 'SET_COLUMN': {
        if (state.phase === 'falling' && state.fallingPuyo) {
          const newFallingPuyo = setColumn(state.field, state.fallingPuyo, action.column);
          if (newFallingPuyo) {
            set({ fallingPuyo: newFallingPuyo });
          }
        }
        break;
      }

      case 'SET_ROTATION': {
        if (state.phase === 'falling' && state.fallingPuyo) {
          const newFallingPuyo = setRotation(state.field, state.fallingPuyo, action.rotation);
          if (newFallingPuyo) {
            set({ fallingPuyo: newFallingPuyo });
          }
        }
        break;
      }
    }
  },

  // 履歴への復元
  restoreToSnapshot: (snapshotId: number) => {
    const state = get();
    const snapshotIndex = state.history.findIndex(s => s.id === snapshotId);
    if (snapshotIndex === -1) return;

    const snapshot = state.history[snapshotIndex];

    // 乱数生成器の状態を復元
    rng.setState(snapshot.rngState);

    // NEXTキューを復元（ディープコピー）
    const restoredNextQueue = snapshot.nextQueue.map(
      pair => [...pair] as [PuyoColor, PuyoColor]
    );

    // 新しいぷよペアを生成してゲームを開始
    const newPair = rng.nextPuyoPair();
    const [pivotColor, satelliteColor] = restoredNextQueue[0];
    const newNextQueue = [...restoredNextQueue.slice(1), newPair];

    // フィールドを復元
    const restoredField = cloneField(snapshot.field);

    // 履歴をスナップショット時点まで切り詰める
    const trimmedHistory = state.history.slice(0, snapshotIndex + 1);

    // fallingPuyoを作成
    const fallingPuyo: FallingPuyo = {
      pivot: {
        pos: { x: 2, y: 0 },
        color: pivotColor,
      },
      satellite: {
        color: satelliteColor,
      },
      rotation: 0,
    };

    set({
      field: restoredField,
      fallingPuyo,
      nextQueue: newNextQueue,
      score: snapshot.score,
      chainCount: snapshot.chainCount,
      phase: 'falling',
      erasingPuyos: [],
      currentChainResult: null,
      history: trimmedHistory,
    });
  },

  // ゲーム履歴からゲームを再開
  resumeFromHistory: (gameHistoryId: string, fromFavorites: boolean = false) => {
    const gameHistoryStore = useGameHistoryStore.getState();
    const entry = fromFavorites
      ? gameHistoryStore.getFavoriteEntry(gameHistoryId)
      : gameHistoryStore.getEntry(gameHistoryId);
    if (!entry || entry.operationHistory.length === 0) {
      return false;
    }

    // 現在のゲームループを停止
    get().stopGameLoop();
    if (erasingDelayId !== null) {
      clearTimeout(erasingDelayId);
      erasingDelayId = null;
    }

    // 最後のスナップショットを取得
    const lastSnapshot = entry.operationHistory[entry.operationHistory.length - 1];

    // 乱数生成器の状態を復元
    rng.setState(lastSnapshot.rngState);

    // NEXTキューを復元（ディープコピー）
    const restoredNextQueue = lastSnapshot.nextQueue.map(
      pair => [...pair] as [PuyoColor, PuyoColor]
    );

    // 新しいぷよペアを生成してゲームを開始
    const newPair = rng.nextPuyoPair();
    const [pivotColor, satelliteColor] = restoredNextQueue[0];
    const newNextQueue = [...restoredNextQueue.slice(1), newPair];

    // フィールドを復元
    const restoredField = cloneField(lastSnapshot.field);

    // 操作履歴を復元（ディープコピー）
    const restoredHistory = entry.operationHistory.map(s => ({
      ...s,
      field: cloneField(s.field),
      nextQueue: s.nextQueue.map(pair => [...pair] as [PuyoColor, PuyoColor]),
      rngState: [...s.rngState] as RngState,
    }));

    // fallingPuyoを作成
    const fallingPuyo: FallingPuyo = {
      pivot: {
        pos: { x: 2, y: 0 },
        color: pivotColor,
      },
      satellite: {
        color: satelliteColor,
      },
      rotation: 0,
    };

    set({
      field: restoredField,
      fallingPuyo,
      nextQueue: newNextQueue,
      score: lastSnapshot.score,
      chainCount: lastSnapshot.chainCount,
      phase: 'falling',
      erasingPuyos: [],
      currentChainResult: null,
      history: restoredHistory,
      nextSnapshotId: entry.nextSnapshotId,
    });

    // ゲーム履歴の現在のゲームIDを設定
    gameHistoryStore.setCurrentGameId(gameHistoryId);

    // ゲームループを開始
    get().startGameLoop();

    return true;
  },

  // 消えているぷよをクリア（アニメーション完了時に呼ばれる）
  clearErasingPuyos: () => {
    const state = get();
    if (state.phase === 'erasing') {
      // 新しいぷよペアを生成
      const newPair = rng.nextPuyoPair();

      // アニメーション完了後、連鎖処理を実行して次のフェーズへ
      const afterChainState = advancePhase({ ...state, phase: 'chaining' }, newPair);

      // 次の連鎖があれば遅延後にerasingへ遷移
      if (afterChainState.phase === 'chaining') {
        set({ ...afterChainState, erasingPuyos: [] });

        // ゲーム履歴を更新（連鎖中のスコアと連鎖数を保存）
        useGameHistoryStore.getState().updateCurrentGame(
          afterChainState.field,
          afterChainState.score,
          afterChainState.chainCount,
          state.history,
          state.nextSnapshotId
        );

        erasingDelayId = setTimeout(() => {
          const currentState = get();
          if (currentState.phase === 'chaining') {
            const erasing = detectErasingPuyos(currentState.field);
            if (erasing) {
              set(erasing);
            }
          }
        }, ERASING_DELAY);
        return;
      }
      set({ ...afterChainState, erasingPuyos: [] });

      // ゲーム履歴を更新（連鎖完了後の状態を保存）
      useGameHistoryStore.getState().updateCurrentGame(
        afterChainState.field,
        afterChainState.score,
        afterChainState.chainCount,
        state.history,
        state.nextSnapshotId
      );
    } else {
      set({ erasingPuyos: [] });
    }
  },

  // ゲームティック（自動落下はOFF、連鎖処理のみ）
  tick: () => {
    const state = get();

    // fallingフェーズでは自動落下しない（下スワイプで落下）
    if (state.phase === 'dropping') {
      // 新しいぷよペアを生成
      const newPair = rng.nextPuyoPair();

      // 落下中は自動で進める
      const nextState = advancePhase(state, newPair);

      // chainingフェーズになったら遅延後にerasingへ遷移
      if (nextState.phase === 'chaining') {
        set(nextState);
        erasingDelayId = setTimeout(() => {
          const currentState = get();
          if (currentState.phase === 'chaining') {
            const erasing = detectErasingPuyos(currentState.field);
            if (erasing) {
              set(erasing);
            }
          }
        }, ERASING_DELAY);
        return;
      }
      set(nextState);
    } else if (state.phase === 'chaining') {
      // 連鎖フェーズ：タイマーで処理されるので何もしない
    } else if (state.phase === 'erasing') {
      // アニメーション中は何もしない（clearErasingPuyosで進行）
    } else if (state.phase === 'gameover') {
      // ゲームオーバーでループ停止
      get().stopGameLoop();
    }
  },

  // ゲームループ開始
  startGameLoop: () => {
    if (gameLoopId !== null) {
      return;
    }
    gameLoopId = setInterval(() => {
      get().tick();
    }, DROP_INTERVAL);
  },

  // ゲームループ停止
  stopGameLoop: () => {
    if (gameLoopId !== null) {
      clearInterval(gameLoopId);
      gameLoopId = null;
    }
  },
}),
    {
      name: 'tokopuyo-game',
      storage: createJSONStorage(() => AsyncStorage),
      // 永続化する項目を選択（関数やエフェクト状態は除外）
      partialize: (state) => ({
        field: state.field,
        nextQueue: state.nextQueue,
        score: state.score,
        chainCount: state.chainCount,
        phase: state.phase,
        history: state.history,
        nextSnapshotId: state.nextSnapshotId,
      }),
      // 復元時の処理
      onRehydrateStorage: () => (state) => {
        if (state && state.history.length > 0) {
          // 最後のスナップショットから乱数状態を復元
          const lastSnapshot = state.history[state.history.length - 1];
          rng.setState(lastSnapshot.rngState);

          // 進行中だったゲームがある場合、readyフェーズに戻す
          // （fallingPuyoは永続化されないため）
          if (state.phase === 'falling' || state.phase === 'dropping' ||
              state.phase === 'chaining' || state.phase === 'erasing') {
            // 次のゲーム開始時に正しく動作するようにreadyに
            useGameStore.setState({ phase: 'ready', fallingPuyo: null });
          }
        }
      },
    }
  )
);
