import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Field } from './Field';
import { NextDisplay } from './NextDisplay';
import { Field as FieldType, FallingPuyo, ErasingPuyo, HIDDEN_ROWS } from '../../logic/types';
import { PuyoColor } from '../../logic/types';

interface GameFieldLayoutProps {
  field: FieldType;
  fallingPuyo: FallingPuyo | null;
  cellSize: number;
  erasingPuyos?: ErasingPuyo[];
  onEffectComplete?: () => void;
  nextQueue: [PuyoColor, PuyoColor][];
  chainCount: number;
  isGameOver?: boolean;
}

export const GameFieldLayout: React.FC<GameFieldLayoutProps> = ({
  field,
  fallingPuyo,
  cellSize,
  erasingPuyos = [],
  onEffectComplete,
  nextQueue,
  chainCount,
  isGameOver = false,
}) => {
  const overlayTop = HIDDEN_ROWS * cellSize + 8;

  return (
    <View style={styles.fieldContainer}>
      <Field
        field={field}
        fallingPuyo={fallingPuyo}
        cellSize={cellSize}
        erasingPuyos={erasingPuyos}
        onEffectComplete={onEffectComplete}
      />
      <View style={[styles.nextOverlay, { top: overlayTop, right: 8 }]}>
        <NextDisplay nextQueue={nextQueue} cellSize={cellSize * 0.6} />
      </View>
      {/* 連鎖数オーバレイ（可視マスの左上） */}
      {chainCount > 0 && (
        <View style={[styles.chainOverlay, { top: overlayTop }]}>
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
  );
};

const styles = StyleSheet.create({
  fieldContainer: {
    position: 'relative',
  },
  nextOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 4,
  },
  chainOverlay: {
    position: 'absolute',
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
