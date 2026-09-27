import { useCallback, useMemo, useRef } from 'react';
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
import { useGestureStore, SwipeDirection } from './gestureStore';
import { FIELD_BORDER_WIDTH } from '../renderer/constants';

// スワイプ検出の閾値
const SWIPE_THRESHOLD = 20;
// キャンセル判定の閾値（元の位置からの距離）
const CANCEL_THRESHOLD = 15;

type ControlState = 'idle' | 'touching' | 'swiped' | 'cancelPending' | 'blocked';

// スワイプ方向ごとのサテライトの回転状態
// 横方向のスワイプ → 同じ方向にサテライト、縦方向のスワイプ → 逆方向にサテライト
const ROTATION_BY_SWIPE: Record<SwipeDirection, Rotation> = {
  right: 1,
  left: 3,
  down: 0,
  up: 2,
};

// 移動量からスワイプ方向を取得（閾値未満ならスワイプとして認識しない）
function getSwipeDirection(dx: number, dy: number): SwipeDirection | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) {
    return null;
  }

  if (absDx > absDy) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

export interface FieldGestureResult {
  panResponder: PanResponderInstance;
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
  const cancelFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(
    (evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
      // 最新の状態をストアから直接取得（panResponderのクロージャ問題を回避）
      const currentState = useGameStore.getState();
      const currentPhase = currentState.phase;
      const currentField = currentState.field;
      const currentFallingPuyo = currentState.fallingPuyo;
      const gestureStore = useGestureStore.getState();

      if (currentPhase !== 'falling' || !currentFallingPuyo) return;

      const { pageX } = evt.nativeEvent;

      // タッチした列を計算して設定
      // pageXからエリアの位置を引いて相対位置を計算
      const areaLayout = getAreaLayout();
      const relativeX = pageX - areaLayout.x - FIELD_BORDER_WIDTH;
      const column = Math.floor(relativeX / cellSize);
      const clampedColumn = Math.max(0, Math.min(FIELD_COLS - 1, column));

      // その列に配置可能かチェック（回転0で試す）
      const testPuyo = { ...currentFallingPuyo, rotation: 0 as Rotation };
      const canPlaceInColumn = setColumn(currentField, testPuyo, clampedColumn) !== null;

      if (!canPlaceInColumn) {
        // 配置不可：長いhaptic feedbackでフィードバック
        controlStateRef.current = 'blocked';
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // 視覚的フィードバック（エラー表示：赤くハイライト）
        gestureStore.setActiveColumn(null);
        gestureStore.setBlockedColumn(clampedColumn);
        gestureStore.setSwipeDirection(null);
        return;
      }

      controlStateRef.current = 'touching';

      // 視覚的フィードバック
      gestureStore.setActiveColumn(clampedColumn);
      gestureStore.setBlockedColumn(null);
      gestureStore.setSwipeDirection(null);

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
      const gestureStore = useGestureStore.getState();
      if (currentPhase !== 'falling') return;
      if (controlStateRef.current === 'idle' || controlStateRef.current === 'blocked') return;

      const { dx, dy } = gestureState;

      // スワイプ距離が閾値以上か確認
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < CANCEL_THRESHOLD && absDy < CANCEL_THRESHOLD) {
        // 元の位置に近い → キャンセル待ち状態
        if (controlStateRef.current === 'swiped') {
          controlStateRef.current = 'cancelPending';
          // 上向きに戻す
          dispatch({ type: 'SET_ROTATION', rotation: 0 });
          gestureStore.setSwipeDirection(null);
          // 触覚フィードバック（キャンセル：Warning通知パターン）
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          // 視覚的フィードバック（列を点滅）
          gestureStore.setCancelFlash(true);
          if (cancelFlashTimeoutRef.current) {
            clearTimeout(cancelFlashTimeoutRef.current);
          }
          cancelFlashTimeoutRef.current = setTimeout(() => {
            useGestureStore.getState().setCancelFlash(false);
            cancelFlashTimeoutRef.current = null;
          }, 200);
        }
        return;
      }

      // スワイプとして処理
      const swipeDirection = getSwipeDirection(dx, dy);
      if (swipeDirection !== null) {
        const wasNotSwiped = controlStateRef.current !== 'swiped';
        controlStateRef.current = 'swiped';
        dispatch({ type: 'SET_ROTATION', rotation: ROTATION_BY_SWIPE[swipeDirection] });
        // 視覚的フィードバック：スワイプ方向を更新
        gestureStore.setSwipeDirection(swipeDirection);
        // 触覚フィードバック（スワイプ認識時のみ）
        if (wasNotSwiped) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    },
    [dispatch]
  );

  const handleTouchEnd = useCallback(
    (_evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
      // タイマーをクリア
      if (cancelFlashTimeoutRef.current) {
        clearTimeout(cancelFlashTimeoutRef.current);
        cancelFlashTimeoutRef.current = null;
      }

      // 視覚的フィードバックをリセット
      const gestureStore = useGestureStore.getState();
      gestureStore.reset();

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
  };
}
