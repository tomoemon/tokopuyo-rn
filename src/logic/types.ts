// ぷよの色
export type PuyoColor = 'red' | 'blue' | 'green' | 'yellow';

// フィールド定数
export const FIELD_COLS = 6;
export const FIELD_ROWS = 13; // 隠し行を含む総行数
export const VISIBLE_ROWS = 12; // 画面に表示される行数
export const HIDDEN_ROWS = 1; // 見えない行（最上部、y=0）
export const CONNECT_COUNT = 4; // 消えるのに必要な連結数

// 使用する色
export const COLORS: PuyoColor[] = ['red', 'blue', 'green', 'yellow'];

// フィールド（6列×12段、nullは空）
export type Field = (PuyoColor | null)[][];

// 座標
export type Position = { x: number; y: number };

// 回転状態（0:上, 1:右, 2:下, 3:左）
export type Rotation = 0 | 1 | 2 | 3;

// 操作中のぷよペア
export type FallingPuyo = {
  // 軸ぷよ（回転の中心）
  pivot: {
    pos: Position;
    color: PuyoColor;
  };
  // 子ぷよ（軸の周りを回転）
  satellite: {
    color: PuyoColor;
  };
  // 回転状態
  rotation: Rotation;
};

// ゲームフェーズ
export type GamePhase =
  | 'ready'      // ゲーム開始前
  | 'falling'    // ぷよ操作中
  | 'dropping'   // ぷよ落下中
  | 'erasing'    // ぷよ消去アニメーション中
  | 'chaining'   // 連鎖処理中
  | 'gameover';  // ゲームオーバー

// ゲーム状態
export type GameState = {
  field: Field;
  fallingPuyo: FallingPuyo | null;
  nextQueue: [PuyoColor, PuyoColor][]; // 次のぷよペア（最低2つ）
  score: number;
  chainCount: number;
  phase: GamePhase;
};

// 連鎖結果
export type ChainResult = {
  groups: Position[][]; // 消えるグループ
  chainCount: number;
  score: number;
  colors: number; // 同時消し色数
};

// 消えているぷよ（エフェクト表示用）
export type ErasingPuyo = {
  pos: Position;
  color: PuyoColor;
};

// 回転方向
export type RotationDirection = 'cw' | 'ccw'; // clockwise / counter-clockwise

// 移動方向
export type MoveDirection = 'left' | 'right';
