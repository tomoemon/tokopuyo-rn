import {
  Field,
  FallingPuyo,
  Position,
  Rotation,
  RotationDirection,
  MoveDirection,
  PuyoColor,
  COLORS,
  FIELD_COLS,
  FIELD_ROWS,
} from './types';
import { isEmpty, isValidPosition } from './field';

/**
 * 回転状態から子ぷよの相対位置を取得
 */
export function getSatelliteOffset(rotation: Rotation): Position {
  switch (rotation) {
    case 0: return { x: 0, y: -1 }; // 上
    case 1: return { x: 1, y: 0 };  // 右
    case 2: return { x: 0, y: 1 };  // 下
    case 3: return { x: -1, y: 0 }; // 左
  }
}

/**
 * 子ぷよの絶対位置を取得
 */
export function getSatellitePosition(fallingPuyo: FallingPuyo): Position {
  const offset = getSatelliteOffset(fallingPuyo.rotation);
  return {
    x: fallingPuyo.pivot.pos.x + offset.x,
    y: fallingPuyo.pivot.pos.y + offset.y,
  };
}

/**
 * 操作ぷよが指定位置に配置可能か
 * サテライトがy < 0（隠し行より上）の場合も許可（設置時に消滅する）
 */
export function canPlace(field: Field, fallingPuyo: FallingPuyo): boolean {
  const pivotPos = fallingPuyo.pivot.pos;
  const satellitePos = getSatellitePosition(fallingPuyo);

  // 軸ぷよは必ずフィールド内かつ空である必要がある
  if (!isValidPosition(pivotPos) || !isEmpty(field, pivotPos)) {
    return false;
  }

  // 子ぷよがフィールド上方向に出る場合は許可（設置時に消滅）
  if (satellitePos.y < 0) {
    // x座標はフィールド範囲内である必要がある
    return satellitePos.x >= 0 && satellitePos.x < FIELD_COLS;
  }

  // 子ぷよがフィールド内の場合は通常のチェック
  return isValidPosition(satellitePos) && isEmpty(field, satellitePos);
}

/**
 * 操作ぷよを移動
 */
export function movePuyo(
  field: Field,
  fallingPuyo: FallingPuyo,
  direction: MoveDirection
): FallingPuyo | null {
  const dx = direction === 'left' ? -1 : 1;

  const newFallingPuyo: FallingPuyo = {
    ...fallingPuyo,
    pivot: {
      ...fallingPuyo.pivot,
      pos: {
        x: fallingPuyo.pivot.pos.x + dx,
        y: fallingPuyo.pivot.pos.y,
      },
    },
  };

  if (canPlace(field, newFallingPuyo)) {
    return newFallingPuyo;
  }

  return null;
}

/**
 * 操作ぷよを1段落下
 */
export function dropPuyo(
  field: Field,
  fallingPuyo: FallingPuyo
): FallingPuyo | null {
  const newFallingPuyo: FallingPuyo = {
    ...fallingPuyo,
    pivot: {
      ...fallingPuyo.pivot,
      pos: {
        x: fallingPuyo.pivot.pos.x,
        y: fallingPuyo.pivot.pos.y + 1,
      },
    },
  };

  if (canPlace(field, newFallingPuyo)) {
    return newFallingPuyo;
  }

  return null;
}

/**
 * 操作ぷよを回転
 */
export function rotatePuyo(
  field: Field,
  fallingPuyo: FallingPuyo,
  direction: RotationDirection
): FallingPuyo | null {
  const delta = direction === 'cw' ? 1 : 3; // 時計回りは+1、反時計回りは+3（= -1 mod 4）
  const newRotation = ((fallingPuyo.rotation + delta) % 4) as Rotation;

  let newFallingPuyo: FallingPuyo = {
    ...fallingPuyo,
    rotation: newRotation,
  };

  // そのまま回転できる場合
  if (canPlace(field, newFallingPuyo)) {
    return newFallingPuyo;
  }

  // 壁蹴り（回転先が壁や他のぷよにぶつかる場合、軸ぷよを移動させる）
  const satelliteOffset = getSatelliteOffset(newRotation);

  // 回転先の子ぷよ位置
  const newSatellitePos = {
    x: fallingPuyo.pivot.pos.x + satelliteOffset.x,
    y: fallingPuyo.pivot.pos.y + satelliteOffset.y,
  };

  // 壁蹴りの方向を決定
  let kickX = 0;
  let kickY = 0;

  // 左右の壁蹴り
  if (newSatellitePos.x < 0) {
    kickX = 1;
  } else if (newSatellitePos.x >= FIELD_COLS) {
    kickX = -1;
  } else if (!isEmpty(field, newSatellitePos)) {
    // 他のぷよにぶつかる場合、逆方向に蹴る
    kickX = -satelliteOffset.x;
  }

  // 床への壁蹴り（子ぷよが下にある場合）
  if (newSatellitePos.y >= FIELD_ROWS) {
    kickY = -1;
  } else if (
    isValidPosition(newSatellitePos) &&
    !isEmpty(field, newSatellitePos) &&
    satelliteOffset.y > 0
  ) {
    kickY = -1;
  }

  if (kickX !== 0 || kickY !== 0) {
    newFallingPuyo = {
      ...newFallingPuyo,
      pivot: {
        ...newFallingPuyo.pivot,
        pos: {
          x: fallingPuyo.pivot.pos.x + kickX,
          y: fallingPuyo.pivot.pos.y + kickY,
        },
      },
    };

    if (canPlace(field, newFallingPuyo)) {
      return newFallingPuyo;
    }
  }

  // 回転不可
  return null;
}

/**
 * 操作ぷよを即落下（ハードドロップ）
 */
export function hardDropPuyo(
  field: Field,
  fallingPuyo: FallingPuyo
): FallingPuyo {
  let current = fallingPuyo;
  let next = dropPuyo(field, current);

  while (next !== null) {
    current = next;
    next = dropPuyo(field, current);
  }

  return current;
}

/**
 * ランダムな色を取得
 */
export function getRandomColor(): PuyoColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

/**
 * ランダムなぷよペアを生成
 */
export function generatePuyoPair(): [PuyoColor, PuyoColor] {
  return [getRandomColor(), getRandomColor()];
}

/**
 * 新しい操作ぷよを生成（初期位置：3列目、隠し行）
 * y=0は隠し行、y=1はゲームオーバーゾーン（バツ印表示位置）
 * 軸ぷよはy=0（隠し行）に出現し、子ぷよはy=-1（フィールド外）に出現
 * フィールド外のぷよは設置時に消滅する
 */
export function createFallingPuyo(
  pivotColor: PuyoColor,
  satelliteColor: PuyoColor
): FallingPuyo {
  return {
    pivot: {
      pos: { x: 2, y: 0 }, // 3列目（インデックス2）、隠し行
      color: pivotColor,
    },
    satellite: {
      color: satelliteColor,
    },
    rotation: 0, // 子ぷよは上（y=-1、フィールド外に出現）
  };
}

/**
 * 操作ぷよが着地可能か（これ以上落下できないか）
 */
export function isLanded(field: Field, fallingPuyo: FallingPuyo): boolean {
  return dropPuyo(field, fallingPuyo) === null;
}

/**
 * 軸ぷよの列を直接設定
 */
export function setColumn(
  field: Field,
  fallingPuyo: FallingPuyo,
  column: number
): FallingPuyo | null {
  const newFallingPuyo: FallingPuyo = {
    ...fallingPuyo,
    pivot: {
      ...fallingPuyo.pivot,
      pos: {
        x: column,
        y: fallingPuyo.pivot.pos.y,
      },
    },
  };

  if (canPlace(field, newFallingPuyo)) {
    return newFallingPuyo;
  }

  return null;
}

/**
 * 回転状態を直接設定
 */
export function setRotation(
  field: Field,
  fallingPuyo: FallingPuyo,
  rotation: Rotation
): FallingPuyo | null {
  const newFallingPuyo: FallingPuyo = {
    ...fallingPuyo,
    rotation,
  };

  // 配置できる場合のみ適用
  if (canPlace(field, newFallingPuyo)) {
    return newFallingPuyo;
  }

  // 配置不可
  return null;
}
