import { useWindowDimensions } from 'react-native';
import { useConfigStore } from '../store';
import { FIELD_COLS, TOTAL_ROWS } from '../logic/types';
import { FIELD_BORDER_WIDTH, MAX_APP_WIDTH } from './constants';

// 履歴エリアの幅
const HISTORY_WIDTH = 80;
// 履歴エリアとフィールドの間隔
const HISTORY_MARGIN = 8;
// 履歴サムネイルのセルサイズ
const HISTORY_CELL_SIZE = 6;
const SMALL_MARGIN = 4;
const LARGE_MARGIN = 20;

/**
 * ゲーム画面・再生画面共通のレイアウト（利き手と画面サイズからセルサイズなどを計算）
 */
export function useGameLayout() {
  const { width: windowWidth, height } = useWindowDimensions();
  // app/_layout でアプリ全体を MAX_APP_WIDTH に収めているので、それに合わせる
  const width = Math.min(windowWidth, MAX_APP_WIDTH);
  const handedness = useConfigStore((state) => state.handedness);

  // 右利き：右マージン大きめ、左利き：左マージン大きめ
  const isRightHanded = handedness === 'right';
  const leftMargin = isRightHanded ? SMALL_MARGIN : LARGE_MARGIN;
  const rightMargin = isRightHanded ? LARGE_MARGIN : SMALL_MARGIN;
  // 履歴エリアとの間隔、フィールドの枠線を考慮してマス目部分の最大幅を計算
  const maxFieldWidth = width - leftMargin - rightMargin - HISTORY_WIDTH - HISTORY_MARGIN - FIELD_BORDER_WIDTH * 2;
  const maxFieldHeight = height * 0.6; // 操作エリア分の余裕を確保
  const cellSizeByWidth = Math.floor(maxFieldWidth / FIELD_COLS);
  const cellSizeByHeight = Math.floor(maxFieldHeight / TOTAL_ROWS);
  const cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);

  return {
    isRightHanded,
    cellSize,
    largeMargin: LARGE_MARGIN,
    historyWidth: HISTORY_WIDTH,
    historyMargin: HISTORY_MARGIN,
    historyCellSize: HISTORY_CELL_SIZE,
    fieldWidth: cellSize * FIELD_COLS + FIELD_BORDER_WIDTH * 2,
    fieldHeight: cellSize * TOTAL_ROWS + FIELD_BORDER_WIDTH * 2,
  };
}
