import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface TitleScreenProps {
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>とこぷよ</Text>
        <Text style={styles.subtitle}>TOKOPUYO</Text>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={onStartGame}>
        <Text style={styles.startButtonText}>START</Text>
      </TouchableOpacity>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>操作方法</Text>
        <Text style={styles.instruction}>← → スワイプ : 移動</Text>
        <Text style={styles.instruction}>↓ スワイプ : 落下</Text>
        <Text style={styles.instruction}>タップ : 回転</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: '#ff44ff',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#888888',
    marginTop: 8,
  },
  startButton: {
    backgroundColor: '#4444ff',
    paddingHorizontal: 60,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#6666ff',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  instructionsContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  instructionsTitle: {
    color: '#888888',
    fontSize: 16,
    marginBottom: 12,
  },
  instruction: {
    color: '#666666',
    fontSize: 14,
    marginVertical: 4,
  },
});
