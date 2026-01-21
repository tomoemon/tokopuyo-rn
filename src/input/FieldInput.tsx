import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFieldGesture } from './useFieldGesture';
import { FIELD_COLS, TOTAL_ROWS } from '../logic/types';

const BORDER_WIDTH = 3;

interface FieldInputProps {
  cellSize: number;
  children: React.ReactNode;
}

export const FieldInput: React.FC<FieldInputProps> = ({ cellSize, children }) => {
  const fieldViewRef = useRef<View>(null);
  const fieldLayoutRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const getAreaLayout = useCallback(() => fieldLayoutRef.current, []);

  const { panResponder, gestureState } = useFieldGesture({
    cellSize,
    getAreaLayout,
  });

  const { activeColumn, blockedColumn, swipeDirection, cancelFlash } = gestureState;

  const fieldWidth = cellSize * FIELD_COLS + BORDER_WIDTH * 2;
  const fieldHeight = cellSize * TOTAL_ROWS + BORDER_WIDTH * 2;

  return (
    <View
      ref={fieldViewRef}
      style={[styles.container, { width: fieldWidth, height: fieldHeight }]}
      onLayout={() => {
        fieldViewRef.current?.measureInWindow((x, y) => {
          fieldLayoutRef.current = { x, y };
        });
      }}
      {...panResponder.panHandlers}
    >
      {children}

      {/* 列ハイライトオーバーレイ */}
      <View style={styles.overlayContainer} pointerEvents="none">
        {Array.from({ length: FIELD_COLS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.columnOverlay,
              { width: cellSize, left: BORDER_WIDTH + i * cellSize },
              activeColumn === i && (cancelFlash ? styles.cancelColumn : styles.activeColumn),
              blockedColumn === i && styles.blockedColumn,
            ]}
          />
        ))}
      </View>

      {/* スワイプ方向インジケーター */}
      {swipeDirection && (
        <View style={styles.swipeIndicatorContainer} pointerEvents="none">
          <View style={[
            styles.swipeIndicator,
            swipeDirection === 'up' && styles.swipeUp,
            swipeDirection === 'down' && styles.swipeDown,
            swipeDirection === 'left' && styles.swipeLeft,
            swipeDirection === 'right' && styles.swipeRight,
          ]}>
            <View style={[
              styles.arrow,
              swipeDirection === 'up' && styles.arrowUp,
              swipeDirection === 'down' && styles.arrowDown,
              swipeDirection === 'left' && styles.arrowLeft,
              swipeDirection === 'right' && styles.arrowRight,
            ]} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  columnOverlay: {
    position: 'absolute',
    top: BORDER_WIDTH,
    bottom: BORDER_WIDTH,
  },
  activeColumn: {
    backgroundColor: 'rgba(100, 150, 255, 0.25)',
  },
  cancelColumn: {
    backgroundColor: 'rgba(255, 180, 50, 0.4)',
  },
  blockedColumn: {
    backgroundColor: 'rgba(255, 100, 100, 0.35)',
  },
  // スワイプインジケーター
  swipeIndicatorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(136, 136, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeUp: {},
  swipeDown: {},
  swipeLeft: {},
  swipeRight: {},
  // 矢印
  arrow: {
    width: 0,
    height: 0,
  },
  arrowUp: {
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
  },
  arrowDown: {
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
  arrowLeft: {
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#ffffff',
  },
  arrowRight: {
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#ffffff',
  },
});
