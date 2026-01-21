import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useConfigStore, useGameHistoryStore } from '../src/store';
import { GameFieldLayout, OperationHistory } from '../src/renderer';
import { GameHeader } from '../src/components';
import { FIELD_COLS, TOTAL_ROWS, ErasingPuyo, Field as FieldType, PuyoColor } from '../src/logic/types';
import { findErasableGroups, flattenGroups } from '../src/logic/chain';
import { getPuyo, applyGravity, removePuyos, cloneField, setPuyo } from '../src/logic/field';
import { useConfig } from './_layout';

// Replayのフェーズ
type ReplayPhase =
  | 'idle'              // 静止状態（スナップショットのfieldを表示）
  | 'showing_drop'      // droppedPositions のぷよを表示中（重力適用前）
  | 'showing_gravity'   // 重力適用後のフィールドを表示中（落下があった場合）
  | 'showing_erasing';  // 消えるぷよをハイライト表示中（重力適用後）

// フィールドが同じかどうかを比較
function fieldsEqual(a: FieldType, b: FieldType): boolean {
  for (let y = 0; y < a.length; y++) {
    for (let x = 0; x < a[y].length; x++) {
      if (a[y][x] !== b[y][x]) return false;
    }
  }
  return true;
}

export default function GameReplayScreen() {
  const router = useRouter();
  const { gameId, fromFavorites } = useLocalSearchParams<{ gameId: string; fromFavorites: string }>();
  const { openConfig } = useConfig();

  const getEntry = useGameHistoryStore((state) => state.getEntry);
  const getFavoriteEntry = useGameHistoryStore((state) => state.getFavoriteEntry);

  // エントリーを取得
  const entry = useMemo(() => {
    if (!gameId) return null;
    return fromFavorites === '1' ? getFavoriteEntry(gameId) : getEntry(gameId);
  }, [gameId, fromFavorites, getEntry, getFavoriteEntry]);

  const { width, height } = useWindowDimensions();
  const handedness = useConfigStore((state) => state.handedness);

  // 現在表示中のスナップショットインデックス
  const [currentIndex, setCurrentIndex] = useState(0);

  // Replayフェーズ
  const [replayPhase, setReplayPhase] = useState<ReplayPhase>('idle');

  // 連鎖アニメーション用の状態
  const [workingField, setWorkingField] = useState<FieldType | null>(null);
  const [erasingPuyos, setErasingPuyos] = useState<ErasingPuyo[]>([]);
  const [currentChainCount, setCurrentChainCount] = useState(0);

  // エントリーがない場合は戻る
  if (!entry || entry.operationHistory.length === 0) {
    return (
      <View style={styles.container}>
        <GameHeader onBack={() => router.back()} title="Replay" showConfig={false} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Entry not found</Text>
        </View>
      </View>
    );
  }

  const history = entry.operationHistory;
  const maxIndex = history.length - 1;

  // 現在のスナップショット
  const currentSnapshot = history[currentIndex];

  // 次のスナップショット（遷移中に使用）
  const nextSnapshot = currentIndex < maxIndex ? history[currentIndex + 1] : null;

  // droppedPositionsのぷよを前のスナップショットのfield上に表示したフィールドを作成
  const createFieldWithDroppedPuyos = useCallback((baseField: FieldType, droppedPositions: { x: number; y: number }[], nextQueue: [PuyoColor, PuyoColor][]): FieldType => {
    const field = cloneField(baseField);
    if (droppedPositions.length >= 2 && nextQueue.length > 0) {
      const [pivotColor, satelliteColor] = nextQueue[0];
      // droppedPositions[0] = pivot, droppedPositions[1] = satellite
      setPuyo(field, droppedPositions[0], pivotColor);
      setPuyo(field, droppedPositions[1], satelliteColor);
    }
    return field;
  }, []);

  // 表示用のフィールドを計算
  const displayField = useMemo(() => {
    if (replayPhase === 'idle') {
      // 静止状態: スナップショットのfieldをそのまま表示
      return currentSnapshot.field;
    } else if (replayPhase === 'showing_drop' && nextSnapshot) {
      // droppedPositions表示中: 前のスナップショットのfield + droppedPositions（重力適用前）
      return createFieldWithDroppedPuyos(
        currentSnapshot.field,
        nextSnapshot.droppedPositions,
        currentSnapshot.nextQueue
      );
    } else if (replayPhase === 'showing_gravity' && workingField) {
      // 重力適用後のフィールドを表示
      return workingField;
    } else if (replayPhase === 'showing_erasing' && workingField) {
      // 連鎖表示中: workingFieldを表示
      return workingField;
    }
    return currentSnapshot.field;
  }, [replayPhase, currentSnapshot, nextSnapshot, workingField, createFieldWithDroppedPuyos]);

  // 表示用のスコアと連鎖数
  const displayScore = currentSnapshot.score;
  const displayChainCount = replayPhase === 'showing_erasing' ? currentChainCount : 0;

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

  // 消去エフェクト完了時のコールバック（1タップ1連鎖方式）
  const handleEffectComplete = useCallback(() => {
    if (replayPhase !== 'showing_erasing' || !workingField) return;

    // 消えるぷよを削除
    const positions = erasingPuyos.map(p => p.pos);
    let newField = removePuyos(workingField, positions);

    // 重力適用
    newField = applyGravity(newField);

    // 次の消えるぷよを検出
    const nextErasing = detectErasingPuyos(newField);

    if (nextErasing.length > 0) {
      // 次の連鎖あり - 連鎖数を更新して次の消去をハイライト
      const newChainCount = currentChainCount + 1;

      // Haptic feedback（連鎖数に応じて強度を変える）
      if (newChainCount >= 3) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      setWorkingField(newField);
      setErasingPuyos(nextErasing);
      setCurrentChainCount(newChainCount);
    } else {
      // 連鎖終了 - 次のスナップショットに移動
      setReplayPhase('idle');
      setWorkingField(null);
      setErasingPuyos([]);
      setCurrentChainCount(0);
      setCurrentIndex(currentIndex + 1);
    }
  }, [replayPhase, workingField, erasingPuyos, currentChainCount, currentIndex, detectErasingPuyos]);

  // アニメーション中かどうか（First/Prev/Lastボタンを無効にする）
  const isAnimating = replayPhase !== 'idle';
  // Nextボタンは showing_erasing 以外では有効
  const isNextProcessing = replayPhase === 'showing_erasing';

  // ナビゲーション関数
  const goToFirst = useCallback(() => {
    if (isAnimating) return;
    setCurrentIndex(0);
  }, [isAnimating]);

  const goToPrevious = useCallback(() => {
    if (isAnimating) return;
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, [isAnimating]);

  // 連鎖判定を行い、適切なフェーズに遷移する共通処理
  const checkChainAndTransition = useCallback((fieldAfterGravity: FieldType) => {
    const erasing = detectErasingPuyos(fieldAfterGravity);

    if (erasing.length > 0) {
      // 連鎖あり → showing_erasing
      setWorkingField(fieldAfterGravity);
      setErasingPuyos(erasing);
      setCurrentChainCount(1);
      setReplayPhase('showing_erasing');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      // 連鎖なし → 次のスナップショットへ
      const nextIndex = currentIndex + 1;
      setWorkingField(null);
      if (nextIndex >= maxIndex) {
        // 最後のスナップショット → idle
        setReplayPhase('idle');
        setCurrentIndex(nextIndex);
      } else {
        // まだ続きがある → showing_drop のまま次の配置を表示
        setReplayPhase('showing_drop');
        setCurrentIndex(nextIndex);
      }
    }
  }, [currentIndex, maxIndex, detectErasingPuyos]);

  const goToNext = useCallback(() => {
    if (currentIndex >= maxIndex && replayPhase === 'idle') return;

    if (replayPhase === 'idle') {
      // idle → showing_drop: droppedPositions のぷよを表示
      setReplayPhase('showing_drop');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (replayPhase === 'showing_drop' && nextSnapshot) {
      // showing_drop → 重力判定
      const fieldWithDrops = createFieldWithDroppedPuyos(
        currentSnapshot.field,
        nextSnapshot.droppedPositions,
        currentSnapshot.nextQueue
      );
      const fieldAfterGravity = applyGravity(fieldWithDrops);

      // 重力で落下があったかチェック
      if (!fieldsEqual(fieldWithDrops, fieldAfterGravity)) {
        // 落下あり → showing_gravity（タップ待ち）
        setWorkingField(fieldAfterGravity);
        setReplayPhase('showing_gravity');
      } else {
        // 落下なし → 連鎖判定
        const erasing = detectErasingPuyos(fieldAfterGravity);

        if (erasing.length > 0) {
          // 連鎖あり → showing_erasing
          setWorkingField(fieldAfterGravity);
          setErasingPuyos(erasing);
          setCurrentChainCount(1);
          setReplayPhase('showing_erasing');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          // 連鎖なし → 次のスナップショットへ
          const nextIndex = currentIndex + 1;
          if (nextIndex >= maxIndex) {
            // 最後のスナップショット → idle
            setReplayPhase('idle');
            setCurrentIndex(nextIndex);
          } else {
            // まだ続きがある → showing_drop のまま次の配置を表示
            setCurrentIndex(nextIndex);
            // replayPhase は showing_drop のまま
          }
        }
      }
    } else if (replayPhase === 'showing_gravity' && workingField) {
      // showing_gravity → 連鎖判定
      checkChainAndTransition(workingField);
    }
    // showing_erasing の場合は handleEffectComplete で処理される
  }, [replayPhase, currentIndex, maxIndex, nextSnapshot, currentSnapshot, workingField, createFieldWithDroppedPuyos, detectErasingPuyos, checkChainAndTransition]);

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

  const handleBack = () => {
    router.back();
  };

  // ボタンの無効状態
  const isFirstDisabled = currentIndex === 0 || isAnimating;
  const isPrevDisabled = currentIndex === 0 || isAnimating;
  // Nextは最後のインデックスでない限り有効（連鎖アニメーション中も進められる）
  const isNextDisabled = currentIndex === maxIndex && replayPhase === 'idle';
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
          <Ionicons
            name="play-skip-back"
            size={18}
            color={isFirstDisabled ? '#555' : '#4488ff'}
          />
          <Text style={[styles.controlLabel, isFirstDisabled && styles.controlLabelDisabled]}>First</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isPrevDisabled && styles.controlButtonDisabled]}
          onPress={goToPrevious}
          disabled={isPrevDisabled}
        >
          <Ionicons
            name="play-back"
            size={18}
            color={isPrevDisabled ? '#555' : '#4488ff'}
          />
          <Text style={[styles.controlLabel, isPrevDisabled && styles.controlLabelDisabled]}>Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isNextDisabled && styles.controlButtonDisabled]}
          onPress={goToNext}
          disabled={isNextDisabled}
        >
          <Ionicons
            name="play-forward"
            size={18}
            color={isNextDisabled ? '#555' : '#4488ff'}
          />
          <Text style={[styles.controlLabel, isNextDisabled && styles.controlLabelDisabled]}>Next</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isLastDisabled && styles.controlButtonDisabled]}
          onPress={goToLast}
          disabled={isLastDisabled}
        >
          <Ionicons
            name="play-skip-forward"
            size={18}
            color={isLastDisabled ? '#555' : '#4488ff'}
          />
          <Text style={[styles.controlLabel, isLastDisabled && styles.controlLabelDisabled]}>Last</Text>
        </TouchableOpacity>
      </View>

      {/* 進捗インジケーター */}
      <Text style={styles.progressText}>
        {currentIndex + 1} / {history.length}
        {replayPhase === 'showing_drop' && ' (配置)'}
        {replayPhase === 'showing_gravity' && ' (落下)'}
        {replayPhase === 'showing_erasing' && ` (${currentChainCount}連鎖)`}
      </Text>
    </View>
  );

  // ゲームエリア（フィールド + コントロール）
  const renderGameArea = (marginSide: 'left' | 'right') => (
    <View style={styles.gameAreaContainer}>
      {/* フィールド */}
      <View style={[
        styles.fieldWrapper,
        marginSide === 'left'
          ? { alignSelf: 'flex-start', marginLeft: largeMargin }
          : { alignSelf: 'flex-end', marginRight: largeMargin }
      ]}>
        <GameFieldLayout
          field={displayField}
          fallingPuyo={null}
          cellSize={cellSize}
          erasingPuyos={erasingPuyos}
          onEffectComplete={handleEffectComplete}
          nextQueue={currentSnapshot.nextQueue}
          chainCount={displayChainCount}
        />
      </View>

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
        onBack={handleBack}
        onConfig={openConfig}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
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
  fieldWrapper: {
    // フィールドの配置用ラッパー
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
