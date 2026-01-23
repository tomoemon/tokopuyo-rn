// ぷよの色
export type PuyoColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple';

// フィールド定数
export const FIELD_COLS = 6;
export const FIELD_ROWS = 13; // 隠し行を含む総行数
export const VISIBLE_ROWS = 12; // 画面に表示される行数
export const HIDDEN_ROWS = 1; // 見えない行（最上部、y=0）
export const TOTAL_ROWS = VISIBLE_ROWS + HIDDEN_ROWS; // 表示される総行数（隠しマス含む）
export const CONNECT_COUNT = 4; // 消えるのに必要な連結数

// 全ての色（毎ゲーム開始時にここから4色を選択）
export const ALL_COLORS: PuyoColor[] = ['red', 'blue', 'green', 'yellow', 'purple'];

// 使用する色（後方互換性のため維持、デフォルトは最初の4色）
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
  selectedColors: PuyoColor[]; // このゲームで使用する4色
};

// 連鎖結果
export type ChainResult = {
  groups: Position[][]; // 消えるグループ
  chainCount: number;
  score: number;
  colors: number; // 同時消し色数
  isAllClear: boolean; // 全消しかどうか
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

// 乱数生成器の状態
export type RngState = [number, number, number, number];

// ゲーム状態のスナップショット（履歴用）
export type GameSnapshot = {
  id: number;
  field: Field;
  nextQueue: [PuyoColor, PuyoColor][];
  score: number;
  chainCount: number;
  // 乱数系列を再現するための状態
  rngState: RngState;
  // 落下させたぷよの位置（連鎖で消えた場合も含む）
  droppedPositions: Position[];
  // このゲームで使用する4色（オプショナル、後方互換性のため）
  selectedColors?: PuyoColor[];
};
