import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useConfigStore } from '../store';
import { GameHistoryEntry } from '../store/gameHistoryStore';
import { GameFieldLayout, OperationHistory } from '../renderer';
import { GameHeader } from '../components';
import { FIELD_COLS, TOTAL_ROWS, ErasingPuyo, Field as FieldType } from '../logic/types';
import { findErasableGroups, flattenGroups } from '../logic/chain';
import { getPuyo, applyGravity, removePuyos, cloneField } from '../logic/field';

interface GameReplayScreenProps {
  entry: GameHistoryEntry;
  onBack: () => void;
  onOpenConfig: () => void;
}

// 連鎖アニメーションの遅延時間（ミリ秒）
const CHAIN_DELAY = 200;

export const GameReplayScreen: React.FC<GameReplayScreenProps> = ({ entry, onBack, onOpenConfig }) => {
  const { width, height } = useWindowDimensions();
  const handedness = useConfigStore((state) => state.handedness);

  // 現在表示中のスナップショットインデックス
  const [currentIndex, setCurrentIndex] = useState(0);

  // 連鎖アニメーション用の状態
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingField, setAnimatingField] = useState<FieldType | null>(null);
  const [erasingPuyos, setErasingPuyos] = useState<ErasingPuyo[]>([]);
  const [animatingChainCount, setAnimatingChainCount] = useState(0);
  const [animatingScore, setAnimatingScore] = useState(0);

  // 連鎖後のフィールド状態をキャッシュ（インデックス -> 連鎖後フィールド）
  const [finalFieldCache, setFinalFieldCache] = useState<Map<number, FieldType>>(new Map());

  // タイマー参照
  const chainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (chainTimerRef.current) {
        clearTimeout(chainTimerRef.current);
      }
    };
  }, []);

  const history = entry.operationHistory;
  const maxIndex = history.length - 1;

  // 現在のスナップショット
  const currentSnapshot = history[currentIndex];

  // スナップショットのフィールドに重力を適用（メモ化）
  const snapshotFieldWithGravity = useMemo(() => {
    return applyGravity(cloneField(currentSnapshot.field));
  }, [currentSnapshot.field]);

  // 表示用のフィールド（優先順位: アニメーション中 > キャッシュ > 重力適用済みスナップショット）
  const displayField = animatingField ?? finalFieldCache.get(currentIndex) ?? snapshotFieldWithGravity;
  const displayChainCount = isAnimating ? animatingChainCount : currentSnapshot.chainCount;
  const displayScore = isAnimating ? animatingScore : currentSnapshot.score;

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
  const cellSizeByHeight = Math.floor(maxFieldHeight / TOTAL_ROWS);
  const cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);

  // コントロールエリアの幅
  const BORDER_WIDTH = 3;
  const controlAreaWidth = cellSize * FIELD_COLS + BORDER_WIDTH * 2;

  // フィールドの高さ
  const fieldHeight = cellSize * TOTAL_ROWS + BORDER_WIDTH * 2;
  // 再生コントロールの高さ（概算）
  const replayControlsHeight = 80;
  // 履歴枠の高さ = フィールド + 再生コントロール
  const historyHeight = fieldHeight + replayControlsHeight;

  // 消えるぷよを検出
  const detectErasingPuyos = useCallback((field: FieldType): ErasingPuyo[] => {
    const groups = findErasableGroups(field);
    if (groups.length === 0) {
      return [];
    }
    const positions = flattenGroups(groups);
    return positions
      .map((pos) => {
        const color = getPuyo(field, pos);
        if (color !== null) {
          return { pos, color };
        }
        return null;
      })
      .filter((p): p is ErasingPuyo => p !== null);
  }, []);

  // スコア計算（簡易版）
  const calculateChainScore = useCallback((puyoCount: number, chainCount: number): number => {
    // 基本点: ぷよ数 × 10 × 連鎖ボーナス
    const chainBonus = Math.min(999, chainCount === 1 ? 0 : Math.pow(2, chainCount + 1));
    return puyoCount * 10 * Math.max(1, chainBonus);
  }, []);

  // 連鎖アニメーションを開始
  const startChainAnimation = useCallback((targetIndex: number) => {
    const targetSnapshot = history[targetIndex];

    // 重力を適用したフィールドから開始
    let field = applyGravity(cloneField(targetSnapshot.field));

    // 消えるぷよを検出
    const erasing = detectErasingPuyos(field);

    if (erasing.length === 0) {
      // 連鎖なし - 直接移動
      setCurrentIndex(targetIndex);
      return;
    }

    // 連鎖アニメーション開始
    setIsAnimating(true);
    setAnimatingField(field);
    setErasingPuyos(erasing);
    setAnimatingChainCount(1);
    setAnimatingScore(targetSnapshot.score);

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [history, detectErasingPuyos]);

  // 連鎖アニメーション完了時のコールバック
  const handleEffectComplete = useCallback(() => {
    if (!animatingField || !isAnimating) return;

    // 消えるぷよを削除
    const positions = erasingPuyos.map(p => p.pos);
    let newField = removePuyos(animatingField, positions);

    // 重力適用
    newField = applyGravity(newField);

    // スコア加算
    const chainScore = calculateChainScore(erasingPuyos.length, animatingChainCount);
    const newScore = animatingScore + chainScore;

    // 次の消えるぷよを検出
    const nextErasing = detectErasingPuyos(newField);

    if (nextErasing.length > 0) {
      // 次の連鎖あり
      const newChainCount = animatingChainCount + 1;

      // Haptic feedback（連鎖数に応じて強度を変える）
      if (newChainCount >= 3) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      setAnimatingField(newField);
      setAnimatingScore(newScore);
      setAnimatingChainCount(newChainCount);

      // 少し遅延してから次の消去アニメーションを開始
      chainTimerRef.current = setTimeout(() => {
        setErasingPuyos(nextErasing);
      }, CHAIN_DELAY);
    } else {
      // 連鎖終了 - 連鎖後のフィールドをキャッシュに保存
      const nextIndex = currentIndex + 1;
      setFinalFieldCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(nextIndex, newField);
        return newCache;
      });

      // 次のスナップショットに移動
      setIsAnimating(false);
      setAnimatingField(null);
      setErasingPuyos([]);
      setAnimatingChainCount(0);
      setAnimatingScore(0);
      setCurrentIndex(nextIndex);
    }
  }, [animatingField, isAnimating, erasingPuyos, animatingChainCount, animatingScore,
      detectErasingPuyos, calculateChainScore, maxIndex, currentIndex]);

  // ナビゲーション関数
  const goToFirst = useCallback(() => {
    if (isAnimating) return;
    setCurrentIndex(0);
  }, [isAnimating]);

  const goToPrevious = useCallback(() => {
    if (isAnimating) return;
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, [isAnimating]);

  const goToNext = useCallback(() => {
    if (isAnimating) return;
    if (currentIndex >= maxIndex) return;

    // 次のスナップショットで連鎖アニメーションを開始
    startChainAnimation(currentIndex + 1);
  }, [isAnimating, currentIndex, maxIndex, startChainAnimation]);

  const goToLast = useCallback(() => {
    if (isAnimating) return;
    setCurrentIndex(maxIndex);
  }, [isAnimating, maxIndex]);

  // 履歴サムネイルタップでその位置にジャンプ
  const handleHistoryTap = useCallback((snapshotId: number) => {
    if (isAnimating) return;
    const index = history.findIndex((s) => s.id === snapshotId);
    if (index >= 0) {
      setCurrentIndex(index);
    }
  }, [history, isAnimating]);

  // ボタンの無効状態
  const isFirstDisabled = currentIndex === 0 || isAnimating;
  const isPrevDisabled = currentIndex === 0 || isAnimating;
  const isNextDisabled = currentIndex === maxIndex || isAnimating;
  const isLastDisabled = currentIndex === maxIndex || isAnimating;

  // 再生コントロールボタン
  const renderControls = () => (
    <View style={[styles.controlsContainer, { width: controlAreaWidth }]}>
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.controlButton, isFirstDisabled && styles.controlButtonDisabled]}
          onPress={goToFirst}
          disabled={isFirstDisabled}
        >
          <Text style={[styles.controlIcon, isFirstDisabled && styles.controlIconDisabled]}>⏮</Text>
          <Text style={[styles.controlLabel, isFirstDisabled && styles.controlLabelDisabled]}>First</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isPrevDisabled && styles.controlButtonDisabled]}
          onPress={goToPrevious}
          disabled={isPrevDisabled}
        >
          <Text style={[styles.controlIcon, isPrevDisabled && styles.controlIconDisabled]}>◀</Text>
          <Text style={[styles.controlLabel, isPrevDisabled && styles.controlLabelDisabled]}>Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isNextDisabled && styles.controlButtonDisabled]}
          onPress={goToNext}
          disabled={isNextDisabled}
        >
          <Text style={[styles.controlIcon, isNextDisabled && styles.controlIconDisabled]}>▶</Text>
          <Text style={[styles.controlLabel, isNextDisabled && styles.controlLabelDisabled]}>Next</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isLastDisabled && styles.controlButtonDisabled]}
          onPress={goToLast}
          disabled={isLastDisabled}
        >
          <Text style={[styles.controlIcon, isLastDisabled && styles.controlIconDisabled]}>⏭</Text>
          <Text style={[styles.controlLabel, isLastDisabled && styles.controlLabelDisabled]}>Last</Text>
        </TouchableOpacity>
      </View>

      {/* 進捗インジケーター */}
      <Text style={styles.progressText}>
        {currentIndex + 1} / {history.length}
        {isAnimating && ` (${animatingChainCount}連鎖)`}
      </Text>
    </View>
  );

  // ゲームエリア（フィールド + コントロール）
  const renderGameArea = (marginSide: 'left' | 'right') => (
    <View style={styles.gameAreaContainer}>
      {/* フィールド */}
      <GameFieldLayout
        field={displayField}
        fallingPuyo={null}
        cellSize={cellSize}
        erasingPuyos={erasingPuyos}
        onEffectComplete={handleEffectComplete}
        nextQueue={currentSnapshot.nextQueue}
        chainCount={displayChainCount}
        isRightHanded={marginSide === 'right'}
        sideMargin={largeMargin}
      />

      {/* 再生コントロール */}
      <View style={[
        styles.controlsWrapper,
        marginSide === 'left' ? { marginLeft: largeMargin } : { alignSelf: 'flex-end', marginRight: largeMargin }
      ]}>
        {renderControls()}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <GameHeader
        onBack={onBack}
        onConfig={onOpenConfig}
        score={displayScore}
        backDisabled={isAnimating}
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
});
