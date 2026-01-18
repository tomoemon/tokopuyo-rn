import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store';
import { Rotation, FIELD_COLS } from '../logic/types';

// スワイプ検出の閾値
const SWIPE_THRESHOLD = 20;
// キャンセル判定の閾値（元の位置からの距離）
const CANCEL_THRESHOLD = 15;

type ControlState = 'idle' | 'touching' | 'swiped' | 'cancelPending';

interface ControlAreaProps {
  cellSize: number;
  rightMargin: number;
  children: React.ReactNode;
}

export const ControlArea: React.FC<ControlAreaProps> = ({ cellSize, rightMargin, children }) => {
  const dispatch = useGameStore((state) => state.dispatch);
  const phase = useGameStore((state) => state.phase);

  const controlStateRef = useRef<ControlState>('idle');
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentSwipeRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const initialColumnRef = useRef<number | null>(null);

  // 視覚的フィードバック用の状態
  const [activeColumn, setActiveColumn] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null);
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const [ripplePosition, setRipplePosition] = useState<{ x: number; y: number } | null>(null);

  // 操作エリアの幅（フィールドと同じ幅：6列分 + ボーダー幅）
  const BORDER_WIDTH = 3;
  const controlAreaWidth = cellSize * FIELD_COLS + BORDER_WIDTH * 2;

  // タッチ位置から列を計算
  const getColumnFromX = useCallback((x: number, areaStartX: number): number => {
    const relativeX = x - areaStartX;
    const column = Math.floor(relativeX / cellSize);
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

  // スワイプ方向を視覚的に表示するための変換
  const getSwipeDirectionFromDelta = useCallback((dx: number, dy: number): 'up' | 'down' | 'left' | 'right' | null => {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) {
      return null;
    }

    if (absDx > absDy) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }, []);

  // タッチリップルアニメーション
  const triggerRipple = useCallback((x: number, y: number) => {
    setRipplePosition({ x, y });
    rippleAnim.setValue(0);
    Animated.timing(rippleAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setRipplePosition(null);
    });
  }, [rippleAnim]);

  const handleTouchStart = useCallback(
    (evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
      if (phase !== 'falling') return;

      const { locationX, locationY, pageX } = evt.nativeEvent;
      startPosRef.current = { x: pageX, y: evt.nativeEvent.pageY };
      currentSwipeRef.current = { dx: 0, dy: 0 };
      controlStateRef.current = 'touching';

      // タッチした列を計算して設定
      // locationXは操作エリア内の相対位置（ボーダー幅を考慮）
      const BORDER_WIDTH = 3;
      const adjustedX = locationX - BORDER_WIDTH;
      const column = Math.floor(adjustedX / cellSize);
      const clampedColumn = Math.max(0, Math.min(FIELD_COLS - 1, column));
      initialColumnRef.current = clampedColumn;

      // 視覚的フィードバック
      setActiveColumn(clampedColumn);
      setSwipeDirection(null);
      triggerRipple(locationX, locationY);

      // 触覚フィードバック（タッチ）
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      dispatch({ type: 'SET_COLUMN', column: clampedColumn });
      // 初期状態は上向き
      dispatch({ type: 'SET_ROTATION', rotation: 0 });
    },
    [dispatch, cellSize, phase, triggerRipple]
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
          setSwipeDirection(null);
        }
        return;
      }

      // スワイプとして処理
      const rotation = getRotationFromSwipe(dx, dy);
      if (rotation !== null) {
        const wasNotSwiped = controlStateRef.current !== 'swiped';
        controlStateRef.current = 'swiped';
        dispatch({ type: 'SET_ROTATION', rotation });
        // 視覚的フィードバック：スワイプ方向を更新
        setSwipeDirection(getSwipeDirectionFromDelta(dx, dy));
        // 触覚フィードバック（スワイプ認識時のみ）
        if (wasNotSwiped) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    },
    [dispatch, getRotationFromSwipe, getSwipeDirectionFromDelta, phase]
  );

  const handleTouchEnd = useCallback(
    (_evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
      // 視覚的フィードバックをリセット
      setActiveColumn(null);
      setSwipeDirection(null);

      if (phase !== 'falling') {
        controlStateRef.current = 'idle';
        return;
      }

      const state = controlStateRef.current;

      if (state === 'cancelPending') {
        // キャンセル：軸ぷよの位置はそのまま、サテライトだけ上に戻す
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
    <View style={[styles.container, { paddingRight: rightMargin }]}>
      {children}
      <View
        style={[
          styles.controlArea,
          {
            width: controlAreaWidth,
            height: cellSize * 3,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* 6列の縦線（タッチイベントは親に伝播） */}
        <View style={styles.columnsContainer} pointerEvents="none">
          {Array.from({ length: FIELD_COLS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.column,
                {
                  width: cellSize,
                  borderRightWidth: i < FIELD_COLS - 1 ? 1 : 0,
                },
                // アクティブな列をハイライト
                activeColumn === i && styles.activeColumn,
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

        {/* タッチリップル効果 */}
        {ripplePosition && (
          <Animated.View
            style={[
              styles.ripple,
              {
                left: ripplePosition.x - 30,
                top: ripplePosition.y - 30,
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 0],
                }),
                transform: [
                  {
                    scale: rippleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 2],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'flex-end',
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
  // タッチリップル
  ripple: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(100, 150, 255, 0.5)',
  },
});
