import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ScoreDisplayProps {
  score: number;
  chainCount: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, chainCount }) => {
  return (
    <View style={styles.container}>
      <View style={styles.scoreContainer}>
        <Text style={styles.label}>SCORE</Text>
        <Text style={styles.score}>{score.toLocaleString()}</Text>
      </View>
      {chainCount > 0 && (
        <View style={styles.chainContainer}>
          <Text style={styles.chainCount}>{chainCount}</Text>
          <Text style={styles.chainLabel}>連鎖</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  label: {
    color: '#888888',
    fontSize: 14,
  },
  score: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  chainContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
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
