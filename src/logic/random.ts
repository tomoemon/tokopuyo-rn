import { PuyoColor, COLORS } from './types';

/**
 * シード付き擬似乱数生成器（XorShift128）
 * 履歴から復元時に同じ乱数系列を再現するために使用
 */
export class PuyoRng {
  private state: [number, number, number, number];

  constructor(seed: number) {
    // シードから初期状態を生成
    // シードが0の場合は現在時刻を使用
    const s = seed === 0 ? Date.now() : seed;
    this.state = [
      s ^ 0x12345678,
      (s * 1103515245 + 12345) >>> 0,
      (s * 48271) >>> 0,
      (s * 69621) >>> 0,
    ];
    // 最初の数回を捨てて初期化を安定させる
    for (let i = 0; i < 20; i++) {
      this.next();
    }
  }

  /**
   * 現在のシード状態を取得（復元用）
   */
  getState(): [number, number, number, number] {
    return [...this.state] as [number, number, number, number];
  }

  /**
   * シード状態を設定（復元用）
   */
  setState(state: [number, number, number, number]): void {
    this.state = [...state] as [number, number, number, number];
  }

  /**
   * 次の乱数を生成（0以上2^32未満の整数）
   */
  next(): number {
    let t = this.state[3];
    const s = this.state[0];
    this.state[3] = this.state[2];
    this.state[2] = this.state[1];
    this.state[1] = s;
    t ^= t << 11;
    t ^= t >>> 8;
    this.state[0] = t ^ s ^ (s >>> 19);
    return this.state[0] >>> 0;
  }

  /**
   * 0以上1未満の浮動小数点数を生成
   */
  nextFloat(): number {
    return this.next() / 0x100000000;
  }

  /**
   * 0以上max未満の整数を生成
   */
  nextInt(max: number): number {
    return Math.floor(this.nextFloat() * max);
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
export function generateSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}
