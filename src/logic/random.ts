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

  /**
   * 指定された色の配列からランダムに色を選択
   */
  nextColorFrom(colors: PuyoColor[]): PuyoColor {
    return colors[this.nextInt(colors.length)];
  }

  /**
   * 最初の2手分のぷよペアを生成（最大3色制限あり）
   * ぷよぷよ通の仕様に準拠：最初の2手（4つのぷよ）は最大3色まで
   */
  generateInitialPairs(): [[PuyoColor, PuyoColor], [PuyoColor, PuyoColor]] {
    const firstPair: [PuyoColor, PuyoColor] = this.nextPuyoPair();
    const secondPair: [PuyoColor, PuyoColor] = this.nextPuyoPair();

    // 使用されている色を収集
    const allColors = [...firstPair, ...secondPair];
    const uniqueColors = new Set<PuyoColor>(allColors);

    // 4色使われていたら、最後のぷよを許可された色に変更
    if (uniqueColors.size > 3) {
      // 許可された色（最初の3つのぷよの色）
      const allowedColors = new Set<PuyoColor>([firstPair[0], firstPair[1], secondPair[0]]);
      const allowedColorsArray = [...allowedColors];

      // 最後のぷよの色を許可された色からランダムに選択
      secondPair[1] = this.nextColorFrom(allowedColorsArray);
    }

    return [firstPair, secondPair];
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
