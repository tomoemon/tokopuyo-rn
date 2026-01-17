import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  StyleSheet,
} from 'react-native';
import { useGameStore } from '../store';
import { Rotation, FIELD_COLS } from '../logic/types';

// スワイプ検出の閾値
const SWIPE_THRESHOLD = 20;
// キャンセル判定の閾値（元の位置からの距離）
const CANCEL_THRESHOLD = 15;

type ControlState = 'idle' | 'touching' | 'swiped' | 'cancelPending';

interface ControlAreaProps {
  cellSize: number;
  leftMargin: number;
  children: React.ReactNode;
}

export const ControlArea: React.FC<ControlAreaProps> = ({ cellSize, leftMargin, children }) => {
  const dispatch = useGameStore((state) => state.dispatch);
  const phase = useGameStore((state) => state.phase);

  const controlStateRef = useRef<ControlState>('idle');
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentSwipeRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const initialColumnRef = useRef<number | null>(null);

  // 操作エリアの幅（6列分）
  const controlAreaWidth = cellSize * FIELD_COLS;

  // タッチ位置から列を計算
  const getColumnFromX = useCallback((x: number, areaStartX: number): number => {
    const relativeX = x - areaStartX;
    const column = Math.floor(relativeX / cellSize);
    return Math.max(0, Math.min(FIELD_COLS - 1, column));
  }, [cellSize]);

  // スワイプ方向から回転状態を取得（スワイプと逆方向にサテライトを配置）
  const getRotationFromSwipe = useCallback((dx: number, dy: number): Rotation | null => {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) {
      return null; // スワイプとして認識しない
    }

    if (absDx > absDy) {
      // 横方向のスワイプ → 逆方向にサテライト
      return dx > 0 ? 3 : 1; // 右スワイプ→左:3, 左スワイプ→右:1
    } else {
      // 縦方向のスワイプ → 逆方向にサテライト
      return dy > 0 ? 0 : 2; // 下スワイプ→上:0, 上スワイプ→下:2
    }
  }, []);

  const handleTouchStart = useCallback(
    (evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
      if (phase !== 'falling') return;

      const { locationX, pageX } = evt.nativeEvent;
      startPosRef.current = { x: pageX, y: evt.nativeEvent.pageY };
      currentSwipeRef.current = { dx: 0, dy: 0 };
      controlStateRef.current = 'touching';

      // タッチした列を計算して設定
      // locationXは操作エリア内の相対位置
      const column = Math.floor(locationX / cellSize);
      const clampedColumn = Math.max(0, Math.min(FIELD_COLS - 1, column));
      initialColumnRef.current = clampedColumn;

      dispatch({ type: 'SET_COLUMN', column: clampedColumn });
      // 初期状態は上向き
      dispatch({ type: 'SET_ROTATION', rotation: 0 });
    },
    [dispatch, cellSize, phase]
  );

  const handleTouchMove = useCallback(
    (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      if (phase !== 'falling') return;
      if (controlStateRef.current === 'idle') return;

      const { dx, dy } = gestureState;
      currentSwipeRef.current = { dx, dy };

      // スワイプ距離が閾値以上か確認
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < CANCEL_THRESHOLD && absDy < CANCEL_THRESHOLD) {
        // 元の位置に近い → キャンセル待ち状態
        if (controlStateRef.current === 'swiped') {
          controlStateRef.current = 'cancelPending';
          // 上向きに戻す
          dispatch({ type: 'SET_ROTATION', rotation: 0 });
        }
        return;
      }

      // スワイプとして処理
      const rotation = getRotationFromSwipe(dx, dy);
      if (rotation !== null) {
        controlStateRef.current = 'swiped';
        dispatch({ type: 'SET_ROTATION', rotation });
      }
    },
    [dispatch, getRotationFromSwipe, phase]
  );

  const handleTouchEnd = useCallback(
    (_evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
      if (phase !== 'falling') {
        controlStateRef.current = 'idle';
        return;
      }

      const state = controlStateRef.current;

      if (state === 'cancelPending') {
        // キャンセル：初期位置に戻す
        dispatch({ type: 'SET_COLUMN', column: 2 }); // 中央に戻す
        dispatch({ type: 'SET_ROTATION', rotation: 0 });
      } else if (state === 'touching' || state === 'swiped') {
        // 配置確定：ハードドロップ
        dispatch({ type: 'HARD_DROP' });
      }

      controlStateRef.current = 'idle';
      initialColumnRef.current = null;
    },
    [dispatch, phase]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleTouchStart,
      onPanResponderMove: handleTouchMove,
      onPanResponderRelease: handleTouchEnd,
      onPanResponderTerminate: handleTouchEnd,
    })
  ).current;

  return (
    <View style={[styles.container, { paddingLeft: leftMargin }]}>
      {children}
      <View
        style={[
          styles.controlArea,
          {
            width: controlAreaWidth,
            height: cellSize * 2,
          },
        ]}
        {...panResponder.panHandlers}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'flex-start',
  },
  controlArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 10,
    borderRadius: 8,
  },
});
