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

// アプリ全体の最大幅の、画面の高さに対する比率（PC ブラウザや iPad など横に広い画面で、スマホに近い縦長の幅に中央でまとめるため）
export const MAX_APP_WIDTH_RATIO = 0.5;
