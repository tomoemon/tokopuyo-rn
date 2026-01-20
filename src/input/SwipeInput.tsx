import React, { useCallback, useRef } from 'react';
import {
  View,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  StyleSheet,
} from 'react-native';
import { useGameStore } from '../store';
import { InputAdapter } from './types';

// スワイプ検出の閾値
const SWIPE_THRESHOLD = 30;
// タップ判定の閾値（移動距離がこれ以下ならタップ）
const TAP_THRESHOLD = 10;

interface SwipeInputProviderProps {
  children: React.ReactNode;
}

const SwipeInputProvider: React.FC<SwipeInputProviderProps> = ({ children }) => {
  const dispatch = useGameStore((state) => state.dispatch);
  const startPosRef = useRef({ x: 0, y: 0 });
  const hasFiredRef = useRef(false);

  const handleGestureStart = useCallback(
    (_evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
      hasFiredRef.current = false;
    },
    []
  );

  const handleGestureMove = useCallback(
    (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      if (hasFiredRef.current) {
        return;
      }

      const { dx, dy } = gestureState;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // 閾値を超えたらスワイプとして処理
      if (absDx > SWIPE_THRESHOLD || absDy > SWIPE_THRESHOLD) {
        if (absDx > absDy) {
          // 横スワイプ
          if (dx > 0) {
            dispatch({ type: 'MOVE_RIGHT' });
          } else {
            dispatch({ type: 'MOVE_LEFT' });
          }
        } else {
          // 縦スワイプ
          if (dy > 0) {
            dispatch({ type: 'HARD_DROP' });
          }
          // 上スワイプは無視
        }
        hasFiredRef.current = true;
      }
    },
    [dispatch]
  );

  const handleGestureEnd = useCallback(
    (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      const { dx, dy } = gestureState;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // スワイプが発火していない & 移動距離が少ない = タップ
      if (!hasFiredRef.current && absDx < TAP_THRESHOLD && absDy < TAP_THRESHOLD) {
        dispatch({ type: 'ROTATE_CW' });
      }
    },
    [dispatch]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleGestureStart,
      onPanResponderMove: handleGestureMove,
      onPanResponderRelease: handleGestureEnd,
      onPanResponderTerminate: handleGestureEnd,
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

/**
 * スワイプ入力アダプター
 */
export const SwipeInput: InputAdapter = {
  InputProvider: SwipeInputProvider,
};
