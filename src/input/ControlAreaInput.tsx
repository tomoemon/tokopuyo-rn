import React, { useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFieldGesture } from './useFieldGesture';
import { useGestureStore } from './gestureStore';
import { FIELD_COLS } from '../logic/types';

interface ControlAreaProps {
  cellSize: number;
  sideMargin: number;
  isRightHanded: boolean;
  children: React.ReactNode;
}

export const ControlArea: React.FC<ControlAreaProps> = ({ cellSize, sideMargin, isRightHanded, children }) => {
  // 操作エリアのページ上の位置を記録
  const controlAreaLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const controlAreaViewRef = useRef<View>(null);

  // 操作エリアの幅（フィールドと同じ幅：6列分 + ボーダー幅）
  const BORDER_WIDTH = 3;
  const controlAreaWidth = cellSize * FIELD_COLS + BORDER_WIDTH * 2;

  const getAreaLayout = useCallback(() => controlAreaLayoutRef.current, []);

  const { panResponder } = useFieldGesture({
    cellSize,
    getAreaLayout,
  });

  // ストアから状態を購読
  const activeColumn = useGestureStore((state) => state.activeColumn);
  const blockedColumn = useGestureStore((state) => state.blockedColumn);
  const swipeDirection = useGestureStore((state) => state.swipeDirection);
  const cancelFlash = useGestureStore((state) => state.cancelFlash);

  return (
    <View style={[
      styles.container,
      isRightHanded
        ? { paddingRight: sideMargin, alignItems: 'flex-end' }
        : { paddingLeft: sideMargin, alignItems: 'flex-start' }
    ]}>
      {children}
      <View
        ref={controlAreaViewRef}
        style={[
          styles.controlArea,
          {
            width: controlAreaWidth,
            height: cellSize * 3,
          },
        ]}
        onLayout={() => {
          // ビューのページ上の位置を取得
          controlAreaViewRef.current?.measureInWindow((x, y) => {
            controlAreaLayoutRef.current = { x, y };
          });
        }}
        {...panResponder.panHandlers}
      >
        {/* 6列の縦線（タッチイベントは親に伝播） */}
        <View style={styles.columnsContainer} pointerEvents="none">
          {Array.from({ length: FIELD_COLS }).map((_, i) => (
            <View
              key={`control-col-${i}`}
              style={[
                styles.column,
                {
                  width: cellSize,
                  borderRightWidth: i < FIELD_COLS - 1 ? 1 : 0,
                },
                // アクティブな列をハイライト（キャンセル時は点滅色）
                activeColumn === i && (cancelFlash ? styles.cancelColumn : styles.activeColumn),
                // ブロックされた列を赤くハイライト
                blockedColumn === i && styles.blockedColumn,
              ]}
            />
          ))}
        </View>

        {/* 回転ガイド矢印（スワイプ方向と同じ方向をハイライト） */}
        <View style={styles.swipeGuideContainer} pointerEvents="none">
          <View style={[styles.swipeArrow, styles.swipeArrowUp, swipeDirection === 'up' && styles.swipeArrowActive]}>
            <View style={styles.arrowUp} />
          </View>
          <View style={styles.swipeArrowRow}>
            <View style={[styles.swipeArrow, styles.swipeArrowLeft, swipeDirection === 'left' && styles.swipeArrowActive]}>
              <View style={styles.arrowLeft} />
            </View>
            <View style={styles.centerDot} />
            <View style={[styles.swipeArrow, styles.swipeArrowRight, swipeDirection === 'right' && styles.swipeArrowActive]}>
              <View style={styles.arrowRight} />
            </View>
          </View>
          <View style={[styles.swipeArrow, styles.swipeArrowDown, swipeDirection === 'down' && styles.swipeArrowActive]}>
            <View style={styles.arrowDown} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlArea: {
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#4a4a6a',
    overflow: 'hidden',
  },
  columnsContainer: {
    flex: 1,
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  column: {
    height: '100%',
    borderRightColor: '#2a2a4a',
  },
  activeColumn: {
    backgroundColor: 'rgba(100, 150, 255, 0.3)',
  },
  cancelColumn: {
    backgroundColor: 'rgba(255, 180, 50, 0.5)',
  },
  blockedColumn: {
    backgroundColor: 'rgba(255, 100, 100, 0.4)',
  },
  // 回転ガイド
  swipeGuideContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeArrow: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.3,
  },
  swipeArrowActive: {
    opacity: 1,
  },
  swipeArrowUp: {
    marginBottom: 2,
  },
  swipeArrowDown: {
    marginTop: 2,
  },
  swipeArrowLeft: {
    marginRight: 4,
  },
  swipeArrowRight: {
    marginLeft: 4,
  },
  // 矢印の三角形
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#8888ff',
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#8888ff',
  },
  arrowLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#8888ff',
  },
  arrowRight: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#8888ff',
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(136, 136, 255, 0.5)',
  },
});
