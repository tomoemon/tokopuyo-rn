import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore, useConfigStore } from '../store';
import { ControlArea } from '../input';
import { Field, NextDisplay, OperationHistory } from '../renderer';
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

  // 操作エリアの幅（フィールドと同じ幅：6列分 + ボーダー幅）
  const BORDER_WIDTH = 3;
  const controlAreaWidth = cellSize * FIELD_COLS + BORDER_WIDTH * 2;

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

  return (
    <View style={styles.container}>
      {/* 上部スペーサー（ノッチ対策 + 1マス分のマージン） */}
      <View style={[styles.topSpacer, { height: 50 + cellSize }]} />

      {/* メインエリア（履歴 + ゲームフィールド） */}
      <View style={styles.mainArea}>
        {/* 左利きモード：ゲームエリアが先 */}
        {!isRightHanded && (
          <View style={styles.gameAreaContainer}>
            <View style={[styles.controlWrapper, isGameOver && styles.grayedOut]} pointerEvents={isGameOver ? 'none' : 'auto'}>
              <ControlArea cellSize={cellSize} sideMargin={largeMargin} isRightHanded={false}>
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
                </View>
              </ControlArea>
            </View>

            {/* スコアと連鎖数（操作エリアの直下） */}
            <View style={[styles.scoreRow, { width: controlAreaWidth, marginLeft: largeMargin }]}>
              <View style={[styles.chainContainer, { opacity: chainCount > 0 ? 1 : 0 }]}>
                <Text style={styles.chainCount}>{chainCount || 1}</Text>
                <Text style={styles.chainLabel}>連鎖</Text>
              </View>
              <Text style={styles.score}>{score.toLocaleString()}</Text>
            </View>

            {/* ボタン行 */}
            <View style={[styles.buttonRow, { width: controlAreaWidth, marginLeft: largeMargin }]}>
              <TouchableOpacity style={styles.smallButton} onPress={handleBackToTitleWithConfirm}>
                <Text style={styles.smallButtonText}>Title</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={onOpenConfig}>
                <Text style={styles.smallButtonText}>Config</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 履歴エリア */}
        <View style={[
          styles.historyContainer,
          { width: historyWidth },
          isRightHanded ? { marginLeft: 8 } : { marginRight: 8 }
        ]}>
          <OperationHistory
            history={history}
            cellSize={historyCellSize}
            onRestoreToSnapshot={handleRestoreToSnapshot}
          />
        </View>

        {/* 右利きモード：ゲームエリアが後 */}
        {isRightHanded && (
          <View style={styles.gameAreaContainer}>
            <View style={[styles.controlWrapper, isGameOver && styles.grayedOut]} pointerEvents={isGameOver ? 'none' : 'auto'}>
              <ControlArea cellSize={cellSize} sideMargin={largeMargin} isRightHanded={true}>
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
                </View>
              </ControlArea>
            </View>

            {/* スコアと連鎖数（操作エリアの直下） */}
            <View style={[styles.scoreRow, { width: controlAreaWidth, alignSelf: 'flex-end', marginRight: largeMargin }]}>
              <View style={[styles.chainContainer, { opacity: chainCount > 0 ? 1 : 0 }]}>
                <Text style={styles.chainCount}>{chainCount || 1}</Text>
                <Text style={styles.chainLabel}>連鎖</Text>
              </View>
              <Text style={styles.score}>{score.toLocaleString()}</Text>
            </View>

            {/* ボタン行 */}
            <View style={[styles.buttonRow, { width: controlAreaWidth, alignSelf: 'flex-end', marginRight: largeMargin }]}>
              <TouchableOpacity style={styles.smallButton} onPress={handleBackToTitleWithConfirm}>
                <Text style={styles.smallButtonText}>Title</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={onOpenConfig}>
                <Text style={styles.smallButtonText}>Config</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  topSpacer: {
    // height is set dynamically based on cellSize
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
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 0,
    paddingHorizontal: 4,
  },
  score: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  chainContainer: {
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  smallButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#666666',
  },
  smallButtonText: {
    color: '#888888',
    fontSize: 14,
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
  grayedOut: {
    opacity: 0.4,
  },
});
