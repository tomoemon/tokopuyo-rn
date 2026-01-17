import {
  GameState,
  Field,
  FallingPuyo,
  PuyoColor,
  ChainResult,
} from './types';
import {
  createEmptyField,
  placePuyo,
  applyGravity,
  removePuyos,
  isGameOver,
  cloneField,
} from './field';
import {
  findErasableGroups,
  countColors,
  countErasedPuyos,
  flattenGroups,
} from './chain';
import { calculateScore } from './score';
import {
  createFallingPuyo,
  generatePuyoPair,
  getSatellitePosition,
} from './puyo';

/**
 * 初期ゲーム状態を作成
 */
export function createInitialGameState(): GameState {
  // NEXTキューを3つ生成
  const nextQueue: [PuyoColor, PuyoColor][] = [
    generatePuyoPair(),
    generatePuyoPair(),
    generatePuyoPair(),
  ];

  return {
    field: createEmptyField(),
    fallingPuyo: null,
    nextQueue,
    score: 0,
    chainCount: 0,
    phase: 'ready',
  };
}

/**
 * ゲームを開始（最初のぷよを出す）
 */
export function startGame(state: GameState): GameState {
  return spawnNextPuyo(state);
}

/**
 * 次のぷよをスポーン
 */
export function spawnNextPuyo(state: GameState): GameState {
  if (state.nextQueue.length === 0) {
    return state;
  }

  const [pivotColor, satelliteColor] = state.nextQueue[0];
  const fallingPuyo = createFallingPuyo(pivotColor, satelliteColor);

  // 新しいNEXTを追加
  const newNextQueue = [...state.nextQueue.slice(1), generatePuyoPair()];

  return {
    ...state,
    fallingPuyo,
    nextQueue: newNextQueue,
    // chainCountはリセットしない（前回の連鎖数を表示し続ける）
    phase: 'falling',
  };
}

/**
 * 操作ぷよをフィールドに固定
 */
export function lockFallingPuyo(state: GameState): GameState {
  if (state.fallingPuyo === null) {
    return state;
  }

  const pivotPos = state.fallingPuyo.pivot.pos;
  const satellitePos = getSatellitePosition(state.fallingPuyo);

  let newField = cloneField(state.field);
  newField = placePuyo(newField, pivotPos, state.fallingPuyo.pivot.color);
  newField = placePuyo(
    newField,
    satellitePos,
    state.fallingPuyo.satellite.color
  );

  return {
    ...state,
    field: newField,
    fallingPuyo: null,
    phase: 'dropping',
  };
}

/**
 * 重力を適用
 */
export function applyGravityToState(state: GameState): GameState {
  const newField = applyGravity(state.field);

  return {
    ...state,
    field: newField,
  };
}

/**
 * 連鎖処理を1回実行
 */
export function processChain(state: GameState): {
  state: GameState;
  result: ChainResult | null;
} {
  const groups = findErasableGroups(state.field);

  if (groups.length === 0) {
    return { state, result: null };
  }

  const newChainCount = state.chainCount + 1;
  const colors = countColors(state.field, groups);
  const puyoCount = countErasedPuyos(groups);
  const chainScore = calculateScore(puyoCount, newChainCount, groups, colors);

  // ぷよを消去
  const positions = flattenGroups(groups);
  const newField = removePuyos(state.field, positions);

  const result: ChainResult = {
    groups,
    chainCount: newChainCount,
    score: chainScore,
    colors,
  };

  return {
    state: {
      ...state,
      field: newField,
      score: state.score + chainScore,
      chainCount: newChainCount,
      phase: 'chaining',
    },
    result,
  };
}

/**
 * 連鎖が終了したかどうか
 */
export function isChainFinished(state: GameState): boolean {
  const groups = findErasableGroups(state.field);
  return groups.length === 0;
}

/**
 * 次のフェーズに進む
 */
export function advancePhase(state: GameState): GameState {
  switch (state.phase) {
    case 'ready':
      return startGame(state);

    case 'dropping':
      // 重力適用後、連鎖チェック
      const afterGravity = applyGravityToState(state);
      if (!isChainFinished(afterGravity)) {
        // 新しい連鎖シーケンスの開始時にchainCountをリセット
        return { ...afterGravity, phase: 'chaining', chainCount: 0 };
      }
      // 連鎖終了、ゲームオーバーチェック
      if (isGameOver(afterGravity.field)) {
        return { ...afterGravity, phase: 'gameover' };
      }
      // 次のぷよをスポーン
      return spawnNextPuyo(afterGravity);

    case 'chaining':
      // 連鎖処理
      const { state: afterChain } = processChain(state);
      // 重力適用
      const afterChainGravity = applyGravityToState(afterChain);
      // 次の連鎖チェック
      if (!isChainFinished(afterChainGravity)) {
        return { ...afterChainGravity, phase: 'chaining' };
      }
      // 連鎖終了、ゲームオーバーチェック
      if (isGameOver(afterChainGravity.field)) {
        return { ...afterChainGravity, phase: 'gameover' };
      }
      // 次のぷよをスポーン
      return spawnNextPuyo(afterChainGravity);

    default:
      return state;
  }
}

/**
 * 操作ぷよを更新
 */
export function updateFallingPuyo(
  state: GameState,
  newFallingPuyo: FallingPuyo | null
): GameState {
  return {
    ...state,
    fallingPuyo: newFallingPuyo,
  };
}
