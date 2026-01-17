import { Field, Position, PuyoColor, FIELD_COLS, FIELD_ROWS, CONNECT_COUNT } from './types';
import { isValidPosition, getPuyo } from './field';

/**
 * 指定位置から同色で繋がっているぷよを全て探す（幅優先探索）
 */
export function findConnectedPuyos(
  field: Field,
  startPos: Position
): Position[] {
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

    // 上下左右を探索
    const neighbors: Position[] = [
      { x: pos.x - 1, y: pos.y },
      { x: pos.x + 1, y: pos.y },
      { x: pos.x, y: pos.y - 1 },
      { x: pos.x, y: pos.y + 1 },
    ];

    for (const neighbor of neighbors) {
      if (isValidPosition(neighbor) && !visited.has(posToKey(neighbor))) {
        queue.push(neighbor);
      }
    }
  }

  return connected;
}

/**
 * フィールド全体から消えるグループを探す
 */
export function findErasableGroups(field: Field): Position[][] {
  const visited = new Set<string>();
  const groups: Position[][] = [];
  const posToKey = (pos: Position): string => `${pos.x},${pos.y}`;

  for (let y = 0; y < FIELD_ROWS; y++) {
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
