import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useConfigStore } from '../store';
import { GameHistoryEntry } from '../store/gameHistoryStore';
import { Field, NextDisplay, OperationHistory } from '../renderer';
import { FIELD_COLS, VISIBLE_ROWS } from '../logic/types';

interface GameReplayScreenProps {
  entry: GameHistoryEntry;
  onBack: () => void;
}

export const GameReplayScreen: React.FC<GameReplayScreenProps> = ({ entry, onBack }) => {
  const { width, height } = useWindowDimensions();
  const handedness = useConfigStore((state) => state.handedness);

  // 現在表示中のスナップショットインデックス
  const [currentIndex, setCurrentIndex] = useState(0);

  const history = entry.operationHistory;
  const maxIndex = history.length - 1;

  // 現在のスナップショット
  const currentSnapshot = history[currentIndex];

  // 履歴エリアの幅
  const historyWidth = 80;
  // 履歴サムネイルのセルサイズ
  const historyCellSize = 6;
  // セルサイズを画面サイズに基づいて計算
  const isRightHanded = handedness === 'right';
  const smallMargin = 4;
  const largeMargin = 20;
  const leftMargin = isRightHanded ? smallMargin : largeMargin;
  const rightMargin = isRightHanded ? largeMargin : smallMargin;
  // 履歴エリアを考慮してフィールドの最大幅を計算
  const maxFieldWidth = width - leftMargin - rightMargin - historyWidth;
  const maxFieldHeight = height * 0.6;
  const cellSizeByWidth = Math.floor(maxFieldWidth / FIELD_COLS);
  const cellSizeByHeight = Math.floor(maxFieldHeight / VISIBLE_ROWS);
  const cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);

  // コントロールエリアの幅
  const BORDER_WIDTH = 3;
  const controlAreaWidth = cellSize * FIELD_COLS + BORDER_WIDTH * 2;

  // ナビゲーション関数
  const goToFirst = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  }, [maxIndex]);

  const goToLast = useCallback(() => {
    setCurrentIndex(maxIndex);
  }, [maxIndex]);

  // 履歴サムネイルタップでその位置にジャンプ
  const handleHistoryTap = useCallback((snapshotId: number) => {
    const index = history.findIndex((s) => s.id === snapshotId);
    if (index >= 0) {
      setCurrentIndex(index);
    }
  }, [history]);

  // 再生コントロールボタン
  const renderControls = () => (
    <View style={[styles.controlsContainer, { width: controlAreaWidth }]}>
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.controlButton, currentIndex === 0 && styles.controlButtonDisabled]}
          onPress={goToFirst}
          disabled={currentIndex === 0}
        >
          <Text style={[styles.controlIcon, currentIndex === 0 && styles.controlIconDisabled]}>⏮</Text>
          <Text style={[styles.controlLabel, currentIndex === 0 && styles.controlLabelDisabled]}>First</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, currentIndex === 0 && styles.controlButtonDisabled]}
          onPress={goToPrevious}
          disabled={currentIndex === 0}
        >
          <Text style={[styles.controlIcon, currentIndex === 0 && styles.controlIconDisabled]}>◀</Text>
          <Text style={[styles.controlLabel, currentIndex === 0 && styles.controlLabelDisabled]}>Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, currentIndex === maxIndex && styles.controlButtonDisabled]}
          onPress={goToNext}
          disabled={currentIndex === maxIndex}
        >
          <Text style={[styles.controlIcon, currentIndex === maxIndex && styles.controlIconDisabled]}>▶</Text>
          <Text style={[styles.controlLabel, currentIndex === maxIndex && styles.controlLabelDisabled]}>Next</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, currentIndex === maxIndex && styles.controlButtonDisabled]}
          onPress={goToLast}
          disabled={currentIndex === maxIndex}
        >
          <Text style={[styles.controlIcon, currentIndex === maxIndex && styles.controlIconDisabled]}>⏭</Text>
          <Text style={[styles.controlLabel, currentIndex === maxIndex && styles.controlLabelDisabled]}>Last</Text>
        </TouchableOpacity>
      </View>

      {/* 進捗インジケーター */}
      <Text style={styles.progressText}>
        {currentIndex + 1} / {history.length}
      </Text>
    </View>
  );

  // ゲームエリア（フィールド + コントロール）
  const renderGameArea = (marginSide: 'left' | 'right') => (
    <View style={styles.gameAreaContainer}>
      {/* フィールド */}
      <View style={styles.fieldContainer}>
        <Field
          field={currentSnapshot.field}
          fallingPuyo={null}
          cellSize={cellSize}
        />
        <View style={[styles.nextOverlay, styles.nextOverlayRight]}>
          <NextDisplay nextQueue={currentSnapshot.nextQueue} cellSize={cellSize * 0.6} />
        </View>
      </View>

      {/* 再生コントロール */}
      <View style={[
        styles.controlsWrapper,
        marginSide === 'left' ? { marginLeft: largeMargin } : { alignSelf: 'flex-end', marginRight: largeMargin }
      ]}>
        {renderControls()}
      </View>

      {/* スコアと連鎖数 */}
      <View style={[
        styles.scoreRow,
        { width: controlAreaWidth },
        marginSide === 'left' ? { marginLeft: largeMargin } : { alignSelf: 'flex-end', marginRight: largeMargin }
      ]}>
        <View style={[styles.chainContainer, { opacity: currentSnapshot.chainCount > 0 ? 1 : 0 }]}>
          <Text style={styles.chainCount}>{currentSnapshot.chainCount || 1}</Text>
          <Text style={styles.chainLabel}>連鎖</Text>
        </View>
        <Text style={styles.score}>{currentSnapshot.score.toLocaleString()}</Text>
      </View>

      {/* 戻るボタン */}
      <View style={[
        styles.buttonRow,
        { width: controlAreaWidth },
        marginSide === 'left' ? { marginLeft: largeMargin } : { alignSelf: 'flex-end', marginRight: largeMargin }
      ]}>
        <TouchableOpacity style={styles.smallButton} onPress={onBack}>
          <Text style={styles.smallButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.replayBadge}>
          <Text style={styles.replayBadgeText}>REPLAY</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 上部スペーサー（ノッチ対策 + 1マス分のマージン） */}
      <View style={[styles.topSpacer, { height: 50 + cellSize }]} />

      {/* メインエリア（履歴 + ゲームフィールド） */}
      <View style={styles.mainArea}>
        {/* 左利きモード：ゲームエリアが先 */}
        {!isRightHanded && renderGameArea('left')}

        {/* 履歴エリア */}
        <View style={[
          styles.historyContainer,
          { width: historyWidth },
          isRightHanded ? { marginLeft: 8 } : { marginRight: 8 }
        ]}>
          <OperationHistory
            history={history}
            cellSize={historyCellSize}
            onRestoreToSnapshot={handleHistoryTap}
            currentSnapshotId={currentSnapshot.id}
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
    alignSelf: 'center',
  },
  controlsWrapper: {
    marginTop: 12,
  },
  controlsContainer: {
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  controlButton: {
    backgroundColor: 'rgba(68, 136, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#4488ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 50,
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
    borderColor: '#444',
  },
  controlIcon: {
    fontSize: 18,
    color: '#4488ff',
  },
  controlIconDisabled: {
    color: '#555',
  },
  controlLabel: {
    fontSize: 10,
    color: '#4488ff',
    marginTop: 2,
  },
  controlLabelDisabled: {
    color: '#555',
  },
  progressText: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
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
    alignItems: 'center',
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
  replayBadge: {
    backgroundColor: 'rgba(68, 136, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4488ff',
  },
  replayBadgeText: {
    color: '#4488ff',
    fontSize: 12,
    fontWeight: 'bold',
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
});
