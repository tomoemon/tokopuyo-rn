import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenConfig: () => void;
  onOpenHistory: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame, onOpenConfig, onOpenHistory }) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>とこぷよ</Text>
        <Text style={styles.subtitle}>TOKOPUYO</Text>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={onStartGame}>
        <Text style={styles.startButtonText}>START</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.configButton} onPress={onOpenConfig}>
        <Text style={styles.configButtonText}>Config</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.historyButton} onPress={onOpenHistory}>
        <Text style={styles.historyButtonText}>History</Text>
      </TouchableOpacity>
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
  configButton: {
    marginTop: 30,
    backgroundColor: 'transparent',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#666666',
  },
  configButtonText: {
    color: '#888888',
    fontSize: 18,
  },
  historyButton: {
    marginTop: 16,
    backgroundColor: 'transparent',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#666666',
  },
  historyButtonText: {
    color: '#888888',
    fontSize: 18,
  },
});
