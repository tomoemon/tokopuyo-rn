import { create } from 'zustand';
import {
  GameState,
  FallingPuyo,
  ChainResult,
  ErasingPuyo,
  PuyoColor,
} from '../logic/types';
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
} from '../logic/puyo';
import { GameAction } from './actions';

interface GameStore extends GameState {
  // 現在の連鎖結果（エフェクト表示用）
  currentChainResult: ChainResult | null;
  // 消えているぷよ（エフェクト表示用）
  erasingPuyos: ErasingPuyo[];

  // アクション
  dispatch: (action: GameAction) => void;
  clearErasingPuyos: () => void;

  // 内部メソッド
  tick: () => void;
  startGameLoop: () => void;
  stopGameLoop: () => void;
}

// ゲームループのインターバルID
let gameLoopId: ReturnType<typeof setInterval> | null = null;

// 落下速度（ミリ秒）
const DROP_INTERVAL = 1000;

export const useGameStore = create<GameStore>((set, get) => ({
  // 初期状態
  ...createInitialGameState(),
  currentChainResult: null,
  erasingPuyos: [],

  // アクションディスパッチャー
  dispatch: (action: GameAction) => {
    const state = get();

    switch (action.type) {
      case 'START_GAME': {
        if (state.phase === 'ready') {
          const newState = startGame(state);
          set(newState);
          get().startGameLoop();
        }
        break;
      }

      case 'RESTART_GAME': {
        get().stopGameLoop();
        const newState = createInitialGameState();
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
          const droppedPuyo = hardDropPuyo(state.field, state.fallingPuyo);
          const stateWithDroppedPuyo = updateFallingPuyo(state, droppedPuyo);
          const lockedState = lockFallingPuyo(stateWithDroppedPuyo);
          const nextState = advancePhase(lockedState);
          set(nextState);
        }
        break;
      }
    }
  },

  // 消えているぷよをクリア（アニメーション完了時に呼ばれる）
  clearErasingPuyos: () => {
    const state = get();
    if (state.phase === 'erasing') {
      // アニメーション完了後、連鎖処理を実行して次のフェーズへ
      const afterChainState = advancePhase({ ...state, phase: 'chaining' });
      set({ ...afterChainState, erasingPuyos: [] });
    } else {
      set({ erasingPuyos: [] });
    }
  },

  // ゲームティック（自動落下）
  tick: () => {
    const state = get();

    if (state.phase === 'falling' && state.fallingPuyo) {
      // 落下を試みる
      const newFallingPuyo = dropPuyo(state.field, state.fallingPuyo);

      if (newFallingPuyo) {
        // 落下成功
        set({ fallingPuyo: newFallingPuyo });
      } else {
        // 着地 → 固定 → 次のフェーズへ
        const lockedState = lockFallingPuyo(state);
        const nextState = advancePhase(lockedState);
        set(nextState);
      }
    } else if (state.phase === 'dropping') {
      // 落下中は自動で進める
      const nextState = advancePhase(state);
      set(nextState);
    } else if (state.phase === 'chaining') {
      // 連鎖フェーズ：消えるぷよを検出してアニメーション開始
      const groups = findErasableGroups(state.field);
      if (groups.length > 0) {
        const positions = flattenGroups(groups);
        const erasingPuyos: ErasingPuyo[] = positions
          .map((pos) => {
            const color = getPuyo(state.field, pos);
            if (color !== null) {
              return { pos, color };
            }
            return null;
          })
          .filter((p): p is ErasingPuyo => p !== null);
        // erasingフェーズに移行してアニメーション待ち
        set({ erasingPuyos, phase: 'erasing' });
      } else {
        // 消えるぷよがない場合は次のフェーズへ
        const nextState = advancePhase(state);
        set(nextState);
      }
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
}));
