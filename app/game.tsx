import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../src/store';
import { ControlArea, FieldInput } from '../src/input';
import { GameFieldLayout, OperationHistory, useGameLayout, FIELD_BORDER_WIDTH } from '../src/renderer';
import { ConfirmDialog, GameHeader, goBack } from '../src/components';
import { useConfig } from './_layout';

export default function GameScreen() {
  const router = useRouter();
  const { openConfig } = useConfig();
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
  const [backConfirmVisible, setBackConfirmVisible] = useState(false);

  const { isRightHanded, cellSize, largeMargin, historyWidth, historyCellSize, fieldHeight } = useGameLayout();

  // 操作エリアの高さ（cellSize * 3 + marginTop + borderWidth * 2）
  const controlAreaHeight = cellSize * 3 + 10 + FIELD_BORDER_WIDTH * 2;
  // 履歴枠の高さ = フィールド + 操作エリア
  const historyHeight = fieldHeight + controlAreaHeight;

  const handleBackConfirm = useCallback(() => {
    setBackConfirmVisible(false);
    dispatch({ type: 'RESTART_GAME' });
    goBack(router, '/');
  }, [dispatch, router]);

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
      <View style={[styles.controlWrapper, isGameOver && styles.grayedOut]}>
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
        onBack={() => setBackConfirmVisible(true)}
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
          { width: historyWidth, height: historyHeight },
          isRightHanded ? { marginLeft: 8 } : { marginRight: 8 }
        ]}>
          <OperationHistory
            history={history}
            cellSize={historyCellSize}
            onRestoreToSnapshot={restoreToSnapshot}
          />
        </View>

        {/* 右利きモード：ゲームエリアが後 */}
        {isRightHanded && renderGameArea('right')}
      </View>

      <ConfirmDialog
        visible={backConfirmVisible}
        title="Return to title?"
        confirmText="Return"
        onConfirm={handleBackConfirm}
        onCancel={() => setBackConfirmVisible(false)}
      />
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
  gameAreaContainer: {
    flex: 1,
  },
  controlWrapper: {
    flex: 1,
  },
  // ゲームオーバー時：薄く表示して操作を受け付けない
  grayedOut: {
    opacity: 0.4,
    pointerEvents: 'none',
  },
});
