import { PuyoColor } from '../logic/types';

// ぷよの色
export const PUYO_COLORS: Record<PuyoColor, string> = {
  red: '#FF4444',
  blue: '#4444FF',
  green: '#44FF44',
  yellow: '#FFFF44',
  purple: '#AA44FF',
};

// フィールドの枠線の太さ（タッチ位置から列を計算する入力層もこの値に依存する）
export const FIELD_BORDER_WIDTH = 3;

// フィールドの下の操作エリアの行数（セル単位）と上の余白（操作エリアとレイアウト計算の両方で使う）
export const CONTROL_AREA_ROWS = 3;
export const CONTROL_AREA_MARGIN_TOP = 10;

// アプリ全体の最大幅の、画面の高さに対する比率（PC ブラウザや iPad など横に広い画面で、スマホに近い縦長の幅に中央でまとめるため）
export const MAX_APP_WIDTH_RATIO = 0.5;
// 上の比率で絞るときも、この幅までは広げてよい（16:9 のスマホや、ツールバーで高さが減るモバイルブラウザで、画面の幅いっぱいに表示するため）
export const MIN_MAX_APP_WIDTH = 430;
