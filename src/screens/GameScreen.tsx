import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
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

  const handleRestart = useCallback(() => {
    dispatch({ type: 'RESTART_GAME' });
    onBackToTitle();
  }, [dispatch, onBackToTitle]);

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
      <View style={[
        styles.mainArea,
        { paddingLeft: leftMargin, paddingRight: rightMargin }
      ]}>
        {/* 左利きモード：ゲームエリアが先 */}
        {!isRightHanded && (
          <View style={[styles.gameAreaContainer, { paddingLeft: leftMargin }]}>
            <ControlArea cellSize={cellSize} sideMargin={leftMargin} isRightHanded={false}>
              <View style={styles.fieldContainer}>
                <Field
                  field={field}
                  fallingPuyo={fallingPuyo}
                  cellSize={cellSize}
                  erasingPuyos={erasingPuyos}
                  onEffectComplete={clearErasingPuyos}
                />
                <View style={[styles.nextOverlay, styles.nextOverlayLeft]}>
                  <NextDisplay nextQueue={nextQueue} cellSize={cellSize * 0.6} />
                </View>
              </View>
            </ControlArea>

            {/* スコアと連鎖数（操作エリアの直下） */}
            <View style={[styles.scoreRow, { width: controlAreaWidth }]}>
              <View style={[styles.chainContainer, { opacity: chainCount > 0 ? 1 : 0 }]}>
                <Text style={styles.chainCount}>{chainCount || 1}</Text>
                <Text style={styles.chainLabel}>連鎖</Text>
              </View>
              <Text style={styles.score}>{score.toLocaleString()}</Text>
            </View>

            {/* ボタン行 */}
            <View style={[styles.buttonRow, { width: controlAreaWidth }]}>
              <TouchableOpacity style={styles.smallButton} onPress={handleRestart}>
                <Text style={styles.smallButtonText}>Title</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={onOpenConfig}>
                <Text style={styles.smallButtonText}>Config</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 履歴エリア */}
        <View style={[styles.historyContainer, { width: historyWidth }]}>
          <OperationHistory
            history={history}
            cellSize={historyCellSize}
            onRestoreToSnapshot={handleRestoreToSnapshot}
          />
        </View>

        {/* 右利きモード：ゲームエリアが後 */}
        {isRightHanded && (
          <View style={[styles.gameAreaContainer, { paddingRight: rightMargin }]}>
            <ControlArea cellSize={cellSize} sideMargin={rightMargin} isRightHanded={true}>
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

            {/* スコアと連鎖数（操作エリアの直下） */}
            <View style={[styles.scoreRow, { width: controlAreaWidth, alignSelf: 'flex-end' }]}>
              <View style={[styles.chainContainer, { opacity: chainCount > 0 ? 1 : 0 }]}>
                <Text style={styles.chainCount}>{chainCount || 1}</Text>
                <Text style={styles.chainLabel}>連鎖</Text>
              </View>
              <Text style={styles.score}>{score.toLocaleString()}</Text>
            </View>

            {/* ボタン行 */}
            <View style={[styles.buttonRow, { width: controlAreaWidth, alignSelf: 'flex-end' }]}>
              <TouchableOpacity style={styles.smallButton} onPress={handleRestart}>
                <Text style={styles.smallButtonText}>Title</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={onOpenConfig}>
                <Text style={styles.smallButtonText}>Config</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ゲームオーバー表示 */}
      {isGameOver && (
        <View style={styles.gameOverOverlay}>
          <View style={styles.gameOverContent}>
            <Text style={styles.gameOverText}>GAME OVER</Text>
            <Text style={styles.finalScore}>Score: {score.toLocaleString()}</Text>
            <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
              <Text style={styles.restartButtonText}>タイトルへ</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
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
  fieldContainer: {
    position: 'relative',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 8,
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
  nextOverlayLeft: {
    left: 8,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverContent: {
    alignItems: 'center',
  },
  gameOverText: {
    color: '#ff4444',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  finalScore: {
    color: '#ffffff',
    fontSize: 24,
    marginBottom: 40,
  },
  restartButton: {
    backgroundColor: '#4444ff',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
  },
  restartButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
