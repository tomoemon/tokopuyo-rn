import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore, useConfigStore } from '../store';
import { ControlArea } from '../input';
import { Field, NextDisplay, OperationHistory } from '../renderer';
import { GameHeader } from '../components';
import { FIELD_COLS, VISIBLE_ROWS } from '../logic/types';

interface GameScreenProps {
  onBackToTitle: () => void;
  onOpenConfig: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ onBackToTitle, onOpenConfig }) => {
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
  const cellSizeByHeight = Math.floor(maxFieldHeight / VISIBLE_ROWS);
  const cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);

  // フィールドの高さ
  const BORDER_WIDTH = 3;
  const fieldHeight = cellSize * VISIBLE_ROWS + BORDER_WIDTH * 2;
  // 操作エリアの高さ（cellSize * 3 + marginTop + borderWidth * 2）
  const controlAreaHeight = cellSize * 3 + 10 + BORDER_WIDTH * 2;
  // 履歴枠の高さ = フィールド + 操作エリア
  const historyHeight = fieldHeight + controlAreaHeight;

  const handleBackToTitleDirect = useCallback(() => {
    dispatch({ type: 'RESTART_GAME' });
    onBackToTitle();
  }, [dispatch, onBackToTitle]);

  const handleBackToTitleWithConfirm = useCallback(() => {
    Alert.alert(
      'Return to title?',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Return', style: 'destructive', onPress: handleBackToTitleDirect },
      ]
    );
  }, [handleBackToTitleDirect]);

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
          <View style={styles.fieldContainer}>
            <Field
              field={field}
              fallingPuyo={fallingPuyo}
              cellSize={cellSize}
              erasingPuyos={erasingPuyos}
              onEffectComplete={clearErasingPuyos}
            />
            <View style={[styles.nextOverlay, styles.nextOverlayRight]}>
              <NextDisplay nextQueue={nextQueue} cellSize={cellSize * 0.6} />
            </View>
            {/* 連鎖数オーバレイ（左上） */}
            {chainCount > 0 && (
              <View style={styles.chainOverlay}>
                <Text style={styles.chainCount}>{chainCount}</Text>
                <Text style={styles.chainLabel}>連鎖</Text>
              </View>
            )}
            {isGameOver && (
              <View style={styles.gameOverOverlay}>
                <Text style={styles.gameOverText}>GAME OVER</Text>
              </View>
            )}
          </View>
        </ControlArea>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <GameHeader
        onBack={handleBackToTitleWithConfirm}
        onConfig={onOpenConfig}
        score={score}
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
};

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
  fieldContainer: {
    position: 'relative',
  },
  nextOverlay: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 4,
  },
  nextOverlayRight: {
    right: 8,
  },
  chainOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  chainCount: {
    color: '#ffff00',
    fontSize: 28,
    fontWeight: 'bold',
  },
  chainLabel: {
    color: '#ffff00',
    fontSize: 14,
    marginLeft: 2,
  },
  grayedOut: {
    opacity: 0.4,
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 80, 80, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverText: {
    color: '#ff4444',
    fontSize: 28,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});
