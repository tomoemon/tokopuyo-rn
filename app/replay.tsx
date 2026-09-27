import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import * as Haptics from 'expo-haptics';
import { useConfigStore, useGameHistoryStore, CHAIN_ANIMATION_DELAYS } from '../src/store';
import { GameFieldLayout, OperationHistory, useGameLayout, HISTORY_MARGIN } from '../src/renderer';
import { GameHeader, goBack } from '../src/components';
import { ErasingPuyo, Field as FieldType, PuyoColor, Position, GameSnapshot } from '../src/logic/types';
import { detectErasingPuyos } from '../src/logic/chain';
import { applyGravity, removePuyos, cloneField, setPuyo, hasFloatingPuyos } from '../src/logic/field';
import { useConfig } from './_layout';

// Replayのフェーズ
type ReplayPhase =
  | 'idle'              // 静止状態（スナップショットのfieldを表示）
  | 'showing_drop'      // droppedPositions のぷよを表示中（重力適用前）
  | 'showing_gravity'   // 重力適用後のフィールドを表示中（落下があった場合）
  | 'waiting_erasing'   // 消去アニメーション開始待ち（遅延中）
  | 'showing_erasing';  // 消えるぷよをハイライト表示中（重力適用後）

// droppedPositionsのぷよを前のスナップショットのfield上に表示したフィールドを作成
function createFieldWithDroppedPuyos(baseField: FieldType, droppedPositions: Position[], nextQueue: [PuyoColor, PuyoColor][]): FieldType {
  const field = cloneField(baseField);
  if (droppedPositions.length >= 2 && nextQueue.length > 0) {
    const [pivotColor, satelliteColor] = nextQueue[0];
    // droppedPositions[0] = pivot, droppedPositions[1] = satellite
    setPuyo(field, droppedPositions[0], pivotColor);
    setPuyo(field, droppedPositions[1], satelliteColor);
  }
  return field;
}

// 連鎖数に応じた強度で Haptic feedback
function chainHaptic(chainCount: number): void {
  Haptics.impactAsync(chainCount >= 3 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium);
}

export default function GameReplayScreen() {
  const { gameId, fromFavorites } = useLocalSearchParams<{ gameId: string; fromFavorites: string }>();

  const findEntry = useGameHistoryStore((state) => state.findEntry);

  // エントリーを取得
  const entry = useMemo(() => {
    if (!gameId) return null;
    return findEntry(gameId, fromFavorites === '1');
  }, [gameId, fromFavorites, findEntry]);

  // エントリーがない場合は戻る
  if (!entry || entry.operationHistory.length === 0) {
    return (
      <View style={styles.container}>
        <GameHeader onBack={() => goBack('/history')} title="Replay" showConfig={false} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Entry not found</Text>
        </View>
      </View>
    );
  }

  // 早期 return の後でフックを呼ばないよう、再生本体は別コンポーネントにする
  return <ReplayContent history={entry.operationHistory} />;
}

function ReplayContent({ history }: { history: GameSnapshot[] }) {
  const { openConfig } = useConfig();

  const {
    onAreaLayout, isLayoutReady, isRightHanded, cellSize, largeMargin,
    historyWidth, historyCellSize, fieldWidth, fieldHeight, gameAreaWidth,
  } = useGameLayout();
  const chainAnimationSpeed = useConfigStore((state) => state.chainAnimationSpeed);
  const erasingDelay = CHAIN_ANIMATION_DELAYS[chainAnimationSpeed];

  // 現在表示中のスナップショットインデックス
  const [currentIndex, setCurrentIndex] = useState(0);

  // Replayフェーズ
  const [replayPhase, setReplayPhase] = useState<ReplayPhase>('idle');

  // 連鎖アニメーション用の状態
  const [workingField, setWorkingField] = useState<FieldType | null>(null);
  const [erasingPuyos, setErasingPuyos] = useState<ErasingPuyo[]>([]);
  const [currentChainCount, setCurrentChainCount] = useState(0);

  // 消去アニメーション開始までの遅延タイマー
  const erasingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (erasingDelayRef.current !== null) {
        clearTimeout(erasingDelayRef.current);
      }
    };
  }, []);

  const maxIndex = history.length - 1;

  // 現在のスナップショット
  const currentSnapshot = history[currentIndex];

  // 次のスナップショット（遷移中に使用）
  const nextSnapshot = currentIndex < maxIndex ? history[currentIndex + 1] : null;

  // 表示用のフィールドを計算
  const displayField = useMemo(() => {
    if (replayPhase === 'showing_drop' && nextSnapshot) {
      // droppedPositions表示中: 前のスナップショットのfield + droppedPositions（重力適用前）
      return createFieldWithDroppedPuyos(
        currentSnapshot.field,
        nextSnapshot.droppedPositions,
        currentSnapshot.nextQueue
      );
    }
    // 重力適用後・消去待ち・消去中は workingField、静止状態はスナップショットのfieldを表示
    return (replayPhase !== 'idle' && workingField) || currentSnapshot.field;
  }, [replayPhase, currentSnapshot, nextSnapshot, workingField]);

  // 表示用のスコアと連鎖数
  const displayScore = currentSnapshot.score;
  const displayChainCount = replayPhase === 'showing_erasing' ? currentChainCount : 0;

  // 表示用のNEXTキュー
  // idle: currentSnapshot.nextQueue（次に落とすぷよを表示）
  // showing_drop以降: nextSnapshot.nextQueue（落としたぷよの次を表示）
  const displayNextQueue = useMemo(() => {
    if (replayPhase === 'idle') {
      return currentSnapshot.nextQueue;
    } else if (nextSnapshot) {
      return nextSnapshot.nextQueue;
    }
    return currentSnapshot.nextQueue;
  }, [replayPhase, currentSnapshot.nextQueue, nextSnapshot]);

  // コントロールエリアの幅はフィールドと同じ
  const controlAreaWidth = fieldWidth;
  // 再生コントロールの高さ（概算）
  const replayControlsHeight = 80;
  // 履歴枠の高さ = フィールド + 再生コントロール
  const historyHeight = fieldHeight + replayControlsHeight;

  // 消去アニメーション開始待ちのタイマーをクリア
  const clearErasingDelay = useCallback(() => {
    if (erasingDelayRef.current !== null) {
      clearTimeout(erasingDelayRef.current);
      erasingDelayRef.current = null;
    }
  }, []);

  // waiting_erasing に遷移し、遅延後に showing_erasing へ
  const startErasingAfterDelay = useCallback((field: FieldType, erasing: ErasingPuyo[], chainCount: number) => {
    setWorkingField(field);
    setReplayPhase('waiting_erasing');
    clearErasingDelay();
    erasingDelayRef.current = setTimeout(() => {
      setErasingPuyos(erasing);
      setCurrentChainCount(chainCount);
      setReplayPhase('showing_erasing');
      chainHaptic(chainCount);
    }, erasingDelay);
  }, [clearErasingDelay, erasingDelay]);

  // アニメーション状態をリセットして idle に戻す
  const resetToIdle = useCallback(() => {
    clearErasingDelay();
    setReplayPhase('idle');
    setWorkingField(null);
    setErasingPuyos([]);
    setCurrentChainCount(0);
  }, [clearErasingDelay]);

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
      // 次の連鎖あり - waiting_erasing → 遅延後に showing_erasing
      setErasingPuyos([]);
      startErasingAfterDelay(newField, nextErasing, currentChainCount + 1);
    } else {
      // 連鎖終了 - 次のスナップショットに移動
      resetToIdle();
      setCurrentIndex(currentIndex + 1);
    }
  }, [replayPhase, workingField, erasingPuyos, currentChainCount, currentIndex, startErasingAfterDelay, resetToIdle]);

  // アニメーション中かどうか
  const isAnimating = replayPhase !== 'idle';

  // ナビゲーション関数
  const goToFirst = useCallback(() => {
    // 状態をリセットして最初に戻る
    resetToIdle();
    setCurrentIndex(0);
  }, [resetToIdle]);

  const goToPrevious = useCallback(() => {
    if (currentIndex === 0 && replayPhase === 'idle') return;

    // idle 状態なら1つ前に戻り、途中状態なら現在のスナップショットの idle に戻る
    if (replayPhase === 'idle') {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    }
    resetToIdle();
  }, [currentIndex, replayPhase, resetToIdle]);

  // 連鎖判定を行い、適切なフェーズに遷移する共通処理
  const checkChainAndTransition = useCallback((fieldAfterGravity: FieldType) => {
    const erasing = detectErasingPuyos(fieldAfterGravity);

    if (erasing.length > 0) {
      // 連鎖あり → waiting_erasing → 遅延後に showing_erasing
      startErasingAfterDelay(fieldAfterGravity, erasing, 1);
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
  }, [currentIndex, maxIndex, startErasingAfterDelay]);

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

      // 重力で落下があったかチェック
      if (hasFloatingPuyos(fieldWithDrops)) {
        // 落下あり → showing_gravity（タップ待ち）
        setWorkingField(applyGravity(fieldWithDrops));
        setReplayPhase('showing_gravity');
      } else {
        // 落下なし → 連鎖判定
        checkChainAndTransition(fieldWithDrops);
      }
    } else if (replayPhase === 'showing_gravity' && workingField) {
      // showing_gravity → 連鎖判定
      checkChainAndTransition(workingField);
    }
    // showing_erasing の場合は handleEffectComplete で処理される
  }, [replayPhase, currentIndex, maxIndex, nextSnapshot, currentSnapshot, workingField, checkChainAndTransition]);

  const goToLast = useCallback(() => {
    // 状態をリセットして最後に移動
    resetToIdle();
    setCurrentIndex(maxIndex);
  }, [maxIndex, resetToIdle]);

  // 履歴サムネイルタップでその位置にジャンプ
  const handleHistoryTap = useCallback((snapshotId: number) => {
    if (isAnimating) return;
    const index = history.findIndex((s) => s.id === snapshotId);
    if (index >= 0) {
      setCurrentIndex(index);
    }
  }, [history, isAnimating]);

  const handleBack = () => goBack('/history');

  // ボタンの無効状態
  const isAtStart = currentIndex === 0 && replayPhase === 'idle';
  // Next/Lastは最後のインデックスでない限り有効（連鎖アニメーション中も進められる）
  const isAtEnd = currentIndex === maxIndex && replayPhase === 'idle';
  const controlButtons = [
    { label: 'First', icon: 'play-skip-back', onPress: goToFirst, disabled: isAtStart },
    { label: 'Prev', icon: 'play-back', onPress: goToPrevious, disabled: isAtStart },
    { label: 'Next', icon: 'play-forward', onPress: goToNext, disabled: isAtEnd },
    { label: 'Last', icon: 'play-skip-forward', onPress: goToLast, disabled: isAtEnd },
  ] as const;

  // 再生コントロールボタン
  const renderControls = () => (
    <View style={[styles.controlsContainer, { width: controlAreaWidth }]}>
      <View style={styles.controlsRow}>
        {controlButtons.map(({ label, icon, onPress, disabled }) => (
          <TouchableOpacity
            key={label}
            style={[styles.controlButton, disabled && styles.controlButtonDisabled]}
            onPress={onPress}
            disabled={disabled}
          >
            <Ionicons name={icon} size={18} color={disabled ? '#555' : '#4488ff'} />
            <Text style={[styles.controlLabel, disabled && styles.controlLabelDisabled]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 進捗インジケーター */}
      <Text style={styles.progressText}>
        {currentIndex + 1} / {history.length}
        {replayPhase === 'showing_drop' && ' (配置)'}
        {replayPhase === 'showing_gravity' && ' (落下)'}
        {replayPhase === 'waiting_erasing' && ' (連鎖待ち)'}
        {replayPhase === 'showing_erasing' && ` (${currentChainCount}連鎖)`}
      </Text>
    </View>
  );

  // ゲームエリア（フィールド + コントロール）
  const renderGameArea = (marginSide: 'left' | 'right') => (
    <View style={{ width: gameAreaWidth }}>
      {/* フィールド */}
      <View style={[
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
          nextQueue={displayNextQueue}
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
      <View style={styles.mainArea} onLayout={onAreaLayout}>
        {isLayoutReady && (
          <>
            {/* 左利きモード：ゲームエリアが先 */}
            {!isRightHanded && renderGameArea('left')}

            {/* 履歴エリア */}
            <View style={{ width: historyWidth, height: historyHeight }}>
              <OperationHistory
                history={history}
                cellSize={historyCellSize}
                onRestoreToSnapshot={handleHistoryTap}
                currentSnapshotId={currentSnapshot.id}
              />
            </View>

            {/* 右利きモード：ゲームエリアが後 */}
            {isRightHanded && renderGameArea('right')}
          </>
        )}
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
  // 履歴とゲームエリアを中央に寄せて並べる（余った幅は両端に回す）
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: HISTORY_MARGIN,
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
