import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useGameStore } from '../store';
import { ControlArea } from '../input';
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

  // セルサイズを画面サイズに基づいて計算（横幅いっぱいに使う）
  const horizontalPadding = 20;
  const maxFieldWidth = width - horizontalPadding * 2;
  const maxFieldHeight = height * 0.6; // 操作エリア分の余裕を確保
  const cellSizeByWidth = Math.floor(maxFieldWidth / FIELD_COLS);
  const cellSizeByHeight = Math.floor(maxFieldHeight / FIELD_ROWS);
  const cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);

  const handleRestart = useCallback(() => {
    dispatch({ type: 'RESTART_GAME' });
    onBackToTitle();
  }, [dispatch, onBackToTitle]);

  const isGameOver = phase === 'gameover';

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <ScoreDisplay score={score} chainCount={chainCount} />
      </View>

      {/* メインゲームエリア */}
      <ControlArea cellSize={cellSize}>
        {/* フィールドとNEXT表示のコンテナ */}
        <View style={styles.fieldContainer}>
          {/* フィールド */}
          <Field
            field={field}
            fallingPuyo={fallingPuyo}
            cellSize={cellSize}
            erasingPuyos={erasingPuyos}
            onEffectComplete={clearErasingPuyos}
          />

          {/* NEXT表示（フィールド右上にオーバーレイ） */}
          <View style={styles.nextOverlay}>
            <NextDisplay nextQueue={nextQueue} cellSize={cellSize * 0.6} />
          </View>
        </View>
      </ControlArea>

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
  header: {
    paddingTop: 50,
    paddingBottom: 4,
    alignItems: 'center',
  },
  fieldContainer: {
    position: 'relative',
  },
  nextOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 4,
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
