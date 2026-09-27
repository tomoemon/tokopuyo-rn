import { useCallback, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';
import { useConfigStore } from '../store';
import { FIELD_COLS, TOTAL_ROWS } from '../logic/types';
import { FIELD_BORDER_WIDTH } from './constants';

// 履歴サムネイルのマス目の、フィールドのセルサイズに対する比率（セル 44 のとき 6 になる）
const HISTORY_CELL_RATIO = 6 / 44;
// 履歴サムネイルの列数（フィールド6列 + NEXT 1列）
const HISTORY_THUMBNAIL_COLS = FIELD_COLS + 1;
// 履歴エリアのうち、サムネイルのマス目以外の幅（OperationHistory・HistoryThumbnail の枠線と余白）
const HISTORY_FIXED_WIDTH = 38;
// 履歴エリアとフィールドの間隔（履歴エリアのフィールド側に付ける）
const HISTORY_MARGIN = 8;
const SMALL_MARGIN = 4;
const LARGE_MARGIN = 20;
// フィールドの下の操作エリア（src/input/ControlAreaInput.tsx）の行数と上の余白
const CONTROL_ROWS = 3;
const CONTROL_AREA_MARGIN_TOP = 10;

type Size = { width: number; height: number };

/**
 * ゲーム画面・再生画面共通のレイアウト
 * 履歴とフィールドを並べるエリアの実寸（onAreaLayout で測る）と利き手から、セルサイズなどを計算する
 */
export function useGameLayout() {
  const [areaSize, setAreaSize] = useState<Size | null>(null);
  const handedness = useConfigStore((state) => state.handedness);

  const onAreaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setAreaSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  // 右利き：右マージン大きめ、左利き：左マージン大きめ
  const isRightHanded = handedness === 'right';

  // 横：固定の幅（左右のマージン・間隔・枠線・履歴エリアの余白）を除いた幅に、フィールド6列 + セルに比例する履歴サムネイルの列
  // 縦：フィールドと操作エリアの枠線・操作エリアの上の余白を除いた高さに、フィールドの行数 + 操作エリアの行数
  const cellSizeByWidth = areaSize
    ? Math.floor(
        (areaSize.width - SMALL_MARGIN - LARGE_MARGIN - HISTORY_MARGIN - FIELD_BORDER_WIDTH * 2 - HISTORY_FIXED_WIDTH)
          / (FIELD_COLS + HISTORY_THUMBNAIL_COLS * HISTORY_CELL_RATIO)
      )
    : 0;
  const cellSizeByHeight = areaSize
    ? Math.floor((areaSize.height - FIELD_BORDER_WIDTH * 4 - CONTROL_AREA_MARGIN_TOP) / (TOTAL_ROWS + CONTROL_ROWS))
    : 0;
  const cellSize = Math.max(0, Math.min(cellSizeByWidth, cellSizeByHeight));

  const fieldWidth = cellSize * FIELD_COLS + FIELD_BORDER_WIDTH * 2;
  // 履歴エリアもセルサイズに比例させる（画面が大きくてもフィールドとの比率を保つ）
  const historyCellSize = Math.max(1, Math.round(cellSize * HISTORY_CELL_RATIO));
  const historyWidth = historyCellSize * HISTORY_THUMBNAIL_COLS + HISTORY_FIXED_WIDTH;
  const fieldHeight = cellSize * TOTAL_ROWS + FIELD_BORDER_WIDTH * 2;

  return {
    onAreaLayout,
    // エリアの大きさを測り終えるまでは中身を描画しない
    isLayoutReady: areaSize !== null,
    isRightHanded,
    cellSize,
    largeMargin: LARGE_MARGIN,
    historyWidth,
    historyMargin: HISTORY_MARGIN,
    historyCellSize,
    fieldWidth,
    fieldHeight,
    // 履歴の横に並ぶゲームエリアの幅（フィールド + 利き手側の大きいマージン）
    gameAreaWidth: fieldWidth + LARGE_MARGIN,
    controlAreaHeight: cellSize * CONTROL_ROWS + CONTROL_AREA_MARGIN_TOP + FIELD_BORDER_WIDTH * 2,
  };
}
