import { XorShift } from 'xorshift';
import { PuyoColor, COLORS, RngState } from './types';

/**
 * シード付き擬似乱数生成器のラッパー
 * 履歴から復元時に同じ乱数系列を再現するために使用
 */
export class PuyoRng {
  private rng: XorShift;

  constructor(seed: RngState) {
    this.rng = new XorShift(seed);
  }

  /**
   * 現在のシード状態を取得（復元用）
   */
  getState(): RngState {
    return [
      this.rng._state0U,
      this.rng._state0L,
      this.rng._state1U,
      this.rng._state1L,
    ];
  }

  /**
   * シード状態を設定（復元用）
   */
  setState(state: RngState): void {
    this.rng._state0U = state[0];
    this.rng._state0L = state[1];
    this.rng._state1U = state[2];
    this.rng._state1L = state[3];
  }

  /**
   * 0以上1未満の浮動小数点数を生成
   */
  random(): number {
    return this.rng.random();
  }

  /**
   * 0以上max未満の整数を生成
   */
  nextInt(max: number): number {
    return Math.floor(this.random() * max);
  }

  /**
   * ランダムなぷよの色を取得
   */
  nextColor(): PuyoColor {
    return COLORS[this.nextInt(COLORS.length)];
  }

  /**
   * ランダムなぷよペアを生成
   */
  nextPuyoPair(): [PuyoColor, PuyoColor] {
    return [this.nextColor(), this.nextColor()];
  }
}

/**
 * 新しいシード値を生成
 */
export function generateSeed(): RngState {
  return [
    Math.floor(Math.random() * 0x100000000),
    Math.floor(Math.random() * 0x100000000),
    Math.floor(Math.random() * 0x100000000),
    Math.floor(Math.random() * 0x100000000),
  ];
}
