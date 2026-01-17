import React, { useCallback, useRef } from 'react';
import {
  View,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
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
  children: React.ReactNode;
}

export const ControlArea: React.FC<ControlAreaProps> = ({ cellSize, children }) => {
  const dispatch = useGameStore((state) => state.dispatch);
  const phase = useGameStore((state) => state.phase);

  const controlStateRef = useRef<ControlState>('idle');
  const currentSwipeRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // タッチ位置から列を計算
  const getColumnFromX = useCallback((locationX: number): number => {
    // ボーダー幅を考慮
    const BORDER_WIDTH = 3;
    const adjustedX = locationX - BORDER_WIDTH;
    const column = Math.floor(adjustedX / cellSize);
    return Math.max(0, Math.min(FIELD_COLS - 1, column));
  }, [cellSize]);

  // スワイプ方向から回転状態を取得
  const getRotationFromSwipe = useCallback((dx: number, dy: number): Rotation | null => {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) {
      return null; // スワイプとして認識しない
    }

    if (absDx > absDy) {
      // 横方向のスワイプ → 同じ方向にサテライト
      return dx > 0 ? 1 : 3; // 右スワイプ→右:1, 左スワイプ→左:3
    } else {
      // 縦方向のスワイプ → 逆方向にサテライト
      return dy > 0 ? 0 : 2; // 下スワイプ→上:0, 上スワイプ→下:2
    }
  }, []);

  const handleTouchStart = useCallback(
    (evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
      if (phase !== 'falling') return;

      const { locationX } = evt.nativeEvent;
      currentSwipeRef.current = { dx: 0, dy: 0 };
      controlStateRef.current = 'touching';

      // タッチした列を計算して設定
      const column = getColumnFromX(locationX);

      dispatch({ type: 'SET_COLUMN', column });
      // 初期状態は上向き
      dispatch({ type: 'SET_ROTATION', rotation: 0 });
    },
    [dispatch, getColumnFromX, phase]
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
    <View {...panResponder.panHandlers}>
      {children}
    </View>
  );
};
