import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useGameStore } from '../store';
import { SwipeInput } from '../input';
import { Field, NextDisplay, ScoreDisplay } from '../renderer';
import { FIELD_COLS, FIELD_ROWS } from '../logic/types';

interface GameScreenProps {
  onBackToTitle: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({ onBackToTitle }) => {
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

  // セルサイズを画面サイズに基づいて計算
  const maxFieldWidth = width * 0.6;
  const maxFieldHeight = height * 0.7;
  const cellSizeByWidth = Math.floor(maxFieldWidth / FIELD_COLS);
  const cellSizeByHeight = Math.floor(maxFieldHeight / FIELD_ROWS);
  const cellSize = Math.min(cellSizeByWidth, cellSizeByHeight, 50);

  const handleRestart = useCallback(() => {
    dispatch({ type: 'RESTART_GAME' });
    onBackToTitle();
  }, [dispatch, onBackToTitle]);

  const isGameOver = phase === 'gameover';

  return (
    <SwipeInput.InputProvider>
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <ScoreDisplay score={score} chainCount={chainCount} />
        </View>

        {/* メインゲームエリア */}
        <View style={styles.gameArea}>
          {/* フィールド */}
          <Field
            field={field}
            fallingPuyo={fallingPuyo}
            cellSize={cellSize}
            erasingPuyos={erasingPuyos}
            onEffectComplete={clearErasingPuyos}
          />

          {/* NEXT表示 */}
          <View style={styles.sidePanel}>
            <NextDisplay nextQueue={nextQueue} cellSize={cellSize} />
          </View>
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
    </SwipeInput.InputProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  gameArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 20,
    paddingHorizontal: 20,
  },
  sidePanel: {
    paddingTop: 20,
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
