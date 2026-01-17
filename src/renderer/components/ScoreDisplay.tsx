import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ScoreDisplayProps {
  score: number;
  chainCount: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, chainCount }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.score}>{score.toLocaleString()}</Text>
      <View style={[styles.chainContainer, { opacity: chainCount > 0 ? 1 : 0 }]}>
        <Text style={styles.chainCount}>{chainCount || 1}</Text>
        <Text style={styles.chainLabel}>連鎖</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  score: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  chainContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 80, // 連鎖数の表示領域を常に確保してレイアウトのずれを防ぐ
  },
  chainCount: {
    color: '#ffff00',
    fontSize: 36,
    fontWeight: 'bold',
  },
  chainLabel: {
    color: '#ffff00',
    fontSize: 18,
    marginLeft: 4,
  },
});
