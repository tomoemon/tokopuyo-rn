import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useGameStore, useConfigStore } from '../src/store';
import { ControlArea, FieldInput } from '../src/input';
import { GameFieldLayout, OperationHistory } from '../src/renderer';
import { GameHeader } from '../src/components';
import { FIELD_COLS, TOTAL_ROWS } from '../src/logic/types';
import { useConfig } from './_layout';

export default function GameScreen() {
  const router = useRouter();
  const { openConfig } = useConfig();
  const { width, height } = useWindowDimensions();
  const field = useGameStore((state) => state.field);
  const fallingPuyo = useGameStore((state) => state.fallingPuyo);
  const nextQueue = useGameStore((state) => state.nextQueue);
  const score = useGameStore((state) => state.score);
  const chainCount = useGameStore((state) => state.chainCount);
  const phase = useGameStore((state) => state.phase);
  const dispatch = useGameStore((state) => state.dispatch);
  const erasingPuyos = useGameStore((state) => state.erasingPuyos);
  const clearErasingPuyos = useGameStore((state) => state.clearErasingPuyos);
  const history = useGameStore((state) => state.history);
  const restoreToSnapshot = useGameStore((state) => state.restoreToSnapshot);
  const handedness = useConfigStore((state) => state.handedness);

  // 履歴エリアの幅
  const historyWidth = 80;
  // 履歴サムネイルのセルサイズ
  const historyCellSize = 6;
  // セルサイズを画面サイズに基づいて計算
  // 右利き：右マージン大きめ、左利き：左マージン大きめ
  const isRightHanded = handedness === 'right';
  const smallMargin = 4;
  const largeMargin = 20;
  const leftMargin = isRightHanded ? smallMargin : largeMargin;
  const rightMargin = isRightHanded ? largeMargin : smallMargin;
  // 履歴エリアを考慮してフィールドの最大幅を計算
  const maxFieldWidth = width - leftMargin - rightMargin - historyWidth;
  const maxFieldHeight = height * 0.6; // 操作エリア分の余裕を確保
  const cellSizeByWidth = Math.floor(maxFieldWidth / FIELD_COLS);
  const cellSizeByHeight = Math.floor(maxFieldHeight / TOTAL_ROWS);
  const cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);

  // フィールドの高さ
  const BORDER_WIDTH = 3;
  const fieldHeight = cellSize * TOTAL_ROWS + BORDER_WIDTH * 2;
  // 操作エリアの高さ（cellSize * 3 + marginTop + borderWidth * 2）
  const controlAreaHeight = cellSize * 3 + 10 + BORDER_WIDTH * 2;
  // 履歴枠の高さ = フィールド + 操作エリア
  const historyHeight = fieldHeight + controlAreaHeight;

  const handleBackDirect = useCallback(() => {
    dispatch({ type: 'RESTART_GAME' });
    router.back();
  }, [dispatch, router]);

  const handleBackWithConfirm = useCallback(() => {
    Alert.alert(
      'Return to title?',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Return', style: 'destructive', onPress: handleBackDirect },
      ]
    );
  }, [handleBackDirect]);

  const handleRestoreToSnapshot = useCallback((snapshotId: number) => {
    restoreToSnapshot(snapshotId);
  }, [restoreToSnapshot]);

  // 連鎖消去時のhaptic feedback
  const prevErasingCountRef = useRef(0);
  useEffect(() => {
    if (erasingPuyos.length > 0 && prevErasingCountRef.current === 0) {
      // 連鎖数に応じて強度を変える
      if (chainCount >= 3) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (chainCount >= 2) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    prevErasingCountRef.current = erasingPuyos.length;
  }, [erasingPuyos, chainCount]);

  const isGameOver = phase === 'gameover';

  // ゲームエリアを描画
  const renderGameArea = (marginSide: 'left' | 'right') => (
    <View style={styles.gameAreaContainer}>
      <View style={[styles.controlWrapper, isGameOver && styles.grayedOut]} pointerEvents={isGameOver ? 'none' : 'auto'}>
        <ControlArea cellSize={cellSize} sideMargin={largeMargin} isRightHanded={marginSide === 'right'}>
          <FieldInput cellSize={cellSize}>
            <GameFieldLayout
              field={field}
              fallingPuyo={fallingPuyo}
              cellSize={cellSize}
              erasingPuyos={erasingPuyos}
              onEffectComplete={clearErasingPuyos}
              nextQueue={nextQueue}
              chainCount={chainCount}
              isGameOver={isGameOver}
            />
          </FieldInput>
        </ControlArea>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <GameHeader
        onBack={handleBackWithConfirm}
        onConfig={openConfig}
        score={score}
        showBorder={false}
      />

      {/* メインエリア（履歴 + ゲームフィールド） */}
      <View style={styles.mainArea}>
        {/* 左利きモード：ゲームエリアが先 */}
        {!isRightHanded && renderGameArea('left')}

        {/* 履歴エリア */}
        <View style={[
          styles.historyContainer,
          { width: historyWidth, height: historyHeight },
          isRightHanded ? { marginLeft: 8 } : { marginRight: 8 }
        ]}>
          <OperationHistory
            history={history}
            cellSize={historyCellSize}
            onRestoreToSnapshot={handleRestoreToSnapshot}
          />
        </View>

        {/* 右利きモード：ゲームエリアが後 */}
        {isRightHanded && renderGameArea('right')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    paddingBottom: 24,
  },
  mainArea: {
    flex: 1,
    flexDirection: 'row',
  },
  historyContainer: {
    marginRight: 0,
  },
  gameAreaContainer: {
    flex: 1,
  },
  controlWrapper: {
    flex: 1,
  },
  grayedOut: {
    opacity: 0.4,
  },
});
