import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  PanResponderInstance,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../store';
import { Rotation, FIELD_COLS } from '../logic/types';
import { setColumn } from '../logic/puyo';

// スワイプ検出の閾値
const SWIPE_THRESHOLD = 20;
// キャンセル判定の閾値（元の位置からの距離）
const CANCEL_THRESHOLD = 15;

type ControlState = 'idle' | 'touching' | 'swiped' | 'cancelPending' | 'blocked';

export interface FieldGestureState {
  activeColumn: number | null;
  blockedColumn: number | null;
  swipeDirection: 'up' | 'down' | 'left' | 'right' | null;
  cancelFlash: boolean;
}

export interface FieldGestureResult {
  panResponder: PanResponderInstance;
  gestureState: FieldGestureState;
  triggerRipple: (x: number, y: number) => void;
}

interface UseFieldGestureParams {
  cellSize: number;
  getAreaLayout: () => { x: number; y: number };
}

export function useFieldGesture({
  cellSize,
  getAreaLayout,
}: UseFieldGestureParams): FieldGestureResult {
  const dispatch = useGameStore((state) => state.dispatch);

  const controlStateRef = useRef<ControlState>('idle');
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentSwipeRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const initialColumnRef = useRef<number | null>(null);

  // 視覚的フィードバック用の状態
  const [activeColumn, setActiveColumn] = useState<number | null>(null);
  const [blockedColumn, setBlockedColumn] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null);
  const [cancelFlash, setCancelFlash] = useState(false);

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

  // タッチリップルアニメーション用のトリガー（外部で使用）
  const triggerRipple = useCallback((_x: number, _y: number) => {
    // リップルアニメーションは各コンポーネントで個別に実装
  }, []);

  const handleTouchStart = useCallback(
    (evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
      // 最新の状態をストアから直接取得（panResponderのクロージャ問題を回避）
      const currentState = useGameStore.getState();
      const currentPhase = currentState.phase;
      const currentField = currentState.field;
      const currentFallingPuyo = currentState.fallingPuyo;

      if (currentPhase !== 'falling' || !currentFallingPuyo) return;

      const { pageX } = evt.nativeEvent;
      startPosRef.current = { x: pageX, y: evt.nativeEvent.pageY };
      currentSwipeRef.current = { dx: 0, dy: 0 };

      // タッチした列を計算して設定
      // pageXからエリアの位置を引いて相対位置を計算
      const BORDER_WIDTH = 3;
      const areaLayout = getAreaLayout();
      const relativeX = pageX - areaLayout.x - BORDER_WIDTH;
      const column = Math.floor(relativeX / cellSize);
      const clampedColumn = Math.max(0, Math.min(FIELD_COLS - 1, column));
      initialColumnRef.current = clampedColumn;

      // その列に配置可能かチェック（回転0で試す）
      const testPuyo = { ...currentFallingPuyo, rotation: 0 as Rotation };
      const canPlaceInColumn = setColumn(currentField, testPuyo, clampedColumn) !== null;

      if (!canPlaceInColumn) {
        // 配置不可：長いhaptic feedbackでフィードバック
        controlStateRef.current = 'blocked';
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // 視覚的フィードバック（エラー表示：赤くハイライト）
        setActiveColumn(null);
        setBlockedColumn(clampedColumn);
        setSwipeDirection(null);
        return;
      }

      controlStateRef.current = 'touching';

      // 視覚的フィードバック
      setActiveColumn(clampedColumn);
      setBlockedColumn(null);
      setSwipeDirection(null);

      // 触覚フィードバック（タッチ）
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      dispatch({ type: 'SET_COLUMN', column: clampedColumn });
      // 初期状態は上向き
      dispatch({ type: 'SET_ROTATION', rotation: 0 });
    },
    [dispatch, cellSize, getAreaLayout]
  );

  const handleTouchMove = useCallback(
    (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      const currentPhase = useGameStore.getState().phase;
      if (currentPhase !== 'falling') return;
      if (controlStateRef.current === 'idle' || controlStateRef.current === 'blocked') return;

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
          // 触覚フィードバック（キャンセル：Warning通知パターン）
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          // 視覚的フィードバック（列を点滅）
          setCancelFlash(true);
          setTimeout(() => setCancelFlash(false), 200);
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
    [dispatch, getRotationFromSwipe, getSwipeDirectionFromDelta]
  );

  const handleTouchEnd = useCallback(
    (_evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
      // 視覚的フィードバックをリセット
      setActiveColumn(null);
      setBlockedColumn(null);
      setSwipeDirection(null);

      const currentPhase = useGameStore.getState().phase;
      if (currentPhase !== 'falling') {
        controlStateRef.current = 'idle';
        return;
      }

      const state = controlStateRef.current;

      if (state === 'blocked') {
        // ブロックされた列：何もしない（キャンセル扱い）
        // 状態をリセットするだけ
      } else if (state === 'cancelPending') {
        // キャンセル：軸ぷよの位置はそのまま、サテライトだけ上に戻す
        dispatch({ type: 'SET_ROTATION', rotation: 0 });
      } else if (state === 'touching' || state === 'swiped') {
        // 配置確定：ハードドロップ
        dispatch({ type: 'HARD_DROP' });
      }

      controlStateRef.current = 'idle';
      initialColumnRef.current = null;
    },
    [dispatch]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: handleTouchStart,
        onPanResponderMove: handleTouchMove,
        onPanResponderRelease: handleTouchEnd,
        onPanResponderTerminate: handleTouchEnd,
      }),
    [handleTouchStart, handleTouchMove, handleTouchEnd]
  );

  return {
    panResponder,
    gestureState: {
      activeColumn,
      blockedColumn,
      swipeDirection,
      cancelFlash,
    },
    triggerRipple,
  };
}
