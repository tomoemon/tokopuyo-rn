import { Field, PuyoColor, Position, FIELD_COLS, FIELD_ROWS } from './types';

/**
 * 空のフィールドを作成
 */
export function createEmptyField(): Field {
  return Array.from({ length: FIELD_ROWS }, () =>
    Array.from({ length: FIELD_COLS }, () => null)
  );
}

/**
 * フィールドをディープコピー
 */
export function cloneField(field: Field): Field {
  return field.map(row => [...row]);
}

/**
 * 指定位置にぷよを配置
 */
export function placePuyo(
  field: Field,
  pos: Position,
  color: PuyoColor
): Field {
  const newField = cloneField(field);
  if (isValidPosition(pos) && newField[pos.y][pos.x] === null) {
    newField[pos.y][pos.x] = color;
  }
  return newField;
}

/**
 * 指定位置のぷよを取得
 */
export function getPuyo(field: Field, pos: Position): PuyoColor | null {
  if (!isValidPosition(pos)) {
    return null;
  }
  return field[pos.y][pos.x];
}

/**
 * 位置がフィールド内かどうか
 */
export function isValidPosition(pos: Position): boolean {
  return pos.x >= 0 && pos.x < FIELD_COLS && pos.y >= 0 && pos.y < FIELD_ROWS;
}

/**
 * 指定位置が空かどうか
 */
export function isEmpty(field: Field, pos: Position): boolean {
  if (!isValidPosition(pos)) {
    return false;
  }
  return field[pos.y][pos.x] === null;
}

/**
 * ぷよを落下させる（重力適用）
 * 全てのぷよを下に落とす
 */
export function applyGravity(field: Field): Field {
  const newField = cloneField(field);

  for (let x = 0; x < FIELD_COLS; x++) {
    // 各列ごとに処理
    const column: (PuyoColor | null)[] = [];

    // 下から上に向かってぷよを集める
    for (let y = FIELD_ROWS - 1; y >= 0; y--) {
      if (newField[y][x] !== null) {
        column.push(newField[y][x]);
      }
    }

    // 下から詰めて配置
    for (let y = FIELD_ROWS - 1; y >= 0; y--) {
      const index = FIELD_ROWS - 1 - y;
      newField[y][x] = index < column.length ? column[index] : null;
    }
  }

  return newField;
}

/**
 * フィールドに浮いているぷよがあるか
 */
export function hasFloatingPuyos(field: Field): boolean {
  for (let x = 0; x < FIELD_COLS; x++) {
    let foundEmpty = false;
    // 下から上に向かってチェック
    for (let y = FIELD_ROWS - 1; y >= 0; y--) {
      if (field[y][x] === null) {
        foundEmpty = true;
      } else if (foundEmpty) {
        // 空の下にぷよがある = 浮いている
        return true;
      }
    }
  }
  return false;
}

/**
 * 指定位置のぷよを消去
 */
export function removePuyos(field: Field, positions: Position[]): Field {
  const newField = cloneField(field);
  for (const pos of positions) {
    if (isValidPosition(pos)) {
      newField[pos.y][pos.x] = null;
    }
  }
  return newField;
}

/**
 * ゲームオーバー判定（3列目の最上段にぷよがあるか）
 */
export function isGameOver(field: Field): boolean {
  // 3列目（インデックス2）の最上段（インデックス0）をチェック
  return field[0][2] !== null;
}

/**
 * フィールドが空かどうか
 */
export function isFieldEmpty(field: Field): boolean {
  for (let y = 0; y < FIELD_ROWS; y++) {
    for (let x = 0; x < FIELD_COLS; x++) {
      if (field[y][x] !== null) {
        return false;
      }
    }
  }
  return true;
}
