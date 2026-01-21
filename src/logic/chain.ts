import { Field, Position, PuyoColor, ErasingPuyo, FIELD_COLS, FIELD_ROWS, CONNECT_COUNT, HIDDEN_ROWS } from './types';
import { isValidPosition, getPuyo } from './field';

/**
 * 連鎖判定に使用する有効な位置かどうか（隠しマスを除外）
 */
function isValidChainPosition(pos: Position): boolean {
  return isValidPosition(pos) && pos.y >= HIDDEN_ROWS;
}

/**
 * 指定位置から同色で繋がっているぷよを全て探す（幅優先探索）
 * 隠しマス（y < HIDDEN_ROWS）は連鎖判定に含めない
 */
export function findConnectedPuyos(
  field: Field,
  startPos: Position
): Position[] {
  // 隠しマスからは探索しない
  if (!isValidChainPosition(startPos)) {
    return [];
  }

  const color = getPuyo(field, startPos);
  if (color === null) {
    return [];
  }

  const connected: Position[] = [];
  const visited = new Set<string>();
  const queue: Position[] = [startPos];

  const posToKey = (pos: Position): string => `${pos.x},${pos.y}`;

  while (queue.length > 0) {
    const pos = queue.shift()!;
    const key = posToKey(pos);

    if (visited.has(key)) {
      continue;
    }
    visited.add(key);

    const currentColor = getPuyo(field, pos);
    if (currentColor !== color) {
      continue;
    }

    connected.push(pos);

    // 上下左右を探索（隠しマスは除外）
    const neighbors: Position[] = [
      { x: pos.x - 1, y: pos.y },
      { x: pos.x + 1, y: pos.y },
      { x: pos.x, y: pos.y - 1 },
      { x: pos.x, y: pos.y + 1 },
    ];

    for (const neighbor of neighbors) {
      // 隠しマスには探索しない
      if (isValidChainPosition(neighbor) && !visited.has(posToKey(neighbor))) {
        queue.push(neighbor);
      }
    }
  }

  return connected;
}

/**
 * フィールド全体から消えるグループを探す
 * 隠しマス（y < HIDDEN_ROWS）は連鎖判定に含めない
 */
export function findErasableGroups(field: Field): Position[][] {
  const visited = new Set<string>();
  const groups: Position[][] = [];
  const posToKey = (pos: Position): string => `${pos.x},${pos.y}`;

  // 隠しマス（y < HIDDEN_ROWS）はスキップ
  for (let y = HIDDEN_ROWS; y < FIELD_ROWS; y++) {
    for (let x = 0; x < FIELD_COLS; x++) {
      const pos: Position = { x, y };
      const key = posToKey(pos);

      if (visited.has(key) || field[y][x] === null) {
        continue;
      }

      const connected = findConnectedPuyos(field, pos);

      // 訪問済みに追加
      for (const p of connected) {
        visited.add(posToKey(p));
      }

      // 4つ以上繋がっていれば消える
      if (connected.length >= CONNECT_COUNT) {
        groups.push(connected);
      }
    }
  }

  return groups;
}

/**
 * 消えるぷよがあるかどうか
 */
export function hasErasableGroups(field: Field): boolean {
  return findErasableGroups(field).length > 0;
}

/**
 * グループに含まれる色の数を取得
 */
export function countColors(field: Field, groups: Position[][]): number {
  const colors = new Set<PuyoColor>();

  for (const group of groups) {
    for (const pos of group) {
      const color = getPuyo(field, pos);
      if (color !== null) {
        colors.add(color);
      }
    }
  }

  return colors.size;
}

/**
 * 消えるぷよの総数を取得
 */
export function countErasedPuyos(groups: Position[][]): number {
  return groups.reduce((sum, group) => sum + group.length, 0);
}

/**
 * 全グループのポジションをフラットにして返す
 */
export function flattenGroups(groups: Position[][]): Position[] {
  return groups.flat();
}

/**
 * フィールドから消えるぷよを検出
 * エフェクト表示用の ErasingPuyo 配列を返す
 */
export function detectErasingPuyos(field: Field): ErasingPuyo[] {
  const groups = findErasableGroups(field);
  if (groups.length === 0) {
    return [];
  }
  const positions = flattenGroups(groups);
  return positions
    .map((pos) => {
      const color = getPuyo(field, pos);
      if (color !== null) {
        return { pos, color };
      }
      return null;
    })
    .filter((p): p is ErasingPuyo => p !== null);
}
