import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface GameHeaderProps {
  onBack: () => void;
  onConfig: () => void;
  score: number;
  backDisabled?: boolean;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  onBack,
  onConfig,
  score,
  backDisabled = false,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.button, backDisabled && styles.buttonDisabled]}
        onPress={onBack}
        disabled={backDisabled}
      >
        <Text style={[styles.buttonText, backDisabled && styles.buttonTextDisabled]}>Back</Text>
      </TouchableOpacity>

      <View style={styles.scoreContainer}>
        <Text style={styles.score}>{score.toLocaleString()}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={onConfig}>
        <Text style={styles.buttonText}>Config</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
    minWidth: 70,
    alignItems: 'center',
  },
  buttonDisabled: {
    borderColor: '#444',
  },
  buttonText: {
    color: '#888',
    fontSize: 14,
  },
  buttonTextDisabled: {
    color: '#444',
  },
  scoreContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: 16,
  },
  score: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
