import { Position } from './types';

/**
 * 全消しボーナス（ぷよぷよ通準拠）
 */
export const ALL_CLEAR_BONUS = 2100;

/**
 * 連鎖ボーナステーブル（ぷよぷよ通準拠）
 */
const CHAIN_BONUS: number[] = [
  0,    // 1連鎖
  8,    // 2連鎖
  16,   // 3連鎖
  32,   // 4連鎖
  64,   // 5連鎖
  96,   // 6連鎖
  128,  // 7連鎖
  160,  // 8連鎖
  192,  // 9連鎖
  224,  // 10連鎖
  256,  // 11連鎖
  288,  // 12連鎖
  320,  // 13連鎖以上（最大値）
];

/**
 * 連結ボーナステーブル（ぷよぷよ通準拠）
 * インデックス0 = 4個連結
 */
const CONNECTION_BONUS: number[] = [
  0,   // 4個
  2,   // 5個
  3,   // 6個
  4,   // 7個
  5,   // 8個
  6,   // 9個
  7,   // 10個
  10,  // 11個以上（最大値）
];

/**
 * 色数ボーナステーブル（ぷよぷよ通準拠）
 * インデックス0 = 1色
 */
const COLOR_BONUS: number[] = [
  0,   // 1色
  3,   // 2色
  6,   // 3色
  12,  // 4色
];

/**
 * 連鎖ボーナスを取得
 */
export function getChainBonus(chainCount: number): number {
  if (chainCount <= 0) {
    return 0;
  }
  const index = Math.min(chainCount - 1, CHAIN_BONUS.length - 1);
  return CHAIN_BONUS[index];
}

/**
 * 連結ボーナスを取得（1グループあたり）
 */
export function getConnectionBonus(connectionCount: number): number {
  if (connectionCount < 4) {
    return 0;
  }
  const index = Math.min(connectionCount - 4, CONNECTION_BONUS.length - 1);
  return CONNECTION_BONUS[index];
}

/**
 * 色数ボーナスを取得
 */
export function getColorBonus(colorCount: number): number {
  if (colorCount <= 0) {
    return 0;
  }
  const index = Math.min(colorCount - 1, COLOR_BONUS.length - 1);
  return COLOR_BONUS[index];
}

/**
 * 全グループの連結ボーナス合計を計算
 */
export function getTotalConnectionBonus(groups: Position[][]): number {
  return groups.reduce((sum, group) => {
    return sum + getConnectionBonus(group.length);
  }, 0);
}

/**
 * スコアを計算（ぷよぷよ通準拠）
 *
 * スコア = 消したぷよ数 × 10 × (連鎖ボーナス + 連結ボーナス + 色数ボーナス)
 * ※ ボーナス合計が0の場合は1として計算
 */
export function calculateScore(
  puyoCount: number,
  chainCount: number,
  groups: Position[][],
  colorCount: number
): number {
  const chainBonus = getChainBonus(chainCount);
  const connectionBonus = getTotalConnectionBonus(groups);
  const colorBonus = getColorBonus(colorCount);

  let totalBonus = chainBonus + connectionBonus + colorBonus;

  // ボーナス合計が0の場合は1として計算
  if (totalBonus === 0) {
    totalBonus = 1;
  }

  // ボーナスの最大値は999
  totalBonus = Math.min(totalBonus, 999);

  return puyoCount * 10 * totalBonus;
}
