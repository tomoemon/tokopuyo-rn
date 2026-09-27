import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface GameHeaderProps {
  onBack: () => void;
  // 中央コンテンツ: title か score のどちらか
  title?: string;
  score?: number;
  // 右側: Config ボタンを表示するか
  showConfig?: boolean;
  onConfig?: () => void;
  // 下部ボーダーを表示するか
  showBorder?: boolean;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  onBack,
  title,
  score,
  showConfig = true,
  onConfig,
  showBorder = true,
}) => {
  return (
    <View style={[styles.header, showBorder && styles.headerBorder]}>
      <TouchableOpacity style={styles.button} onPress={onBack}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>

      {/* 中央コンテンツ */}
      {title ? (
        <Text style={styles.title}>{title}</Text>
      ) : score !== undefined ? (
        <View style={styles.scoreContainer}>
          <Text style={styles.score}>{score.toLocaleString()}</Text>
        </View>
      ) : (
        <View style={styles.placeholder} />
      )}

      {/* 右側コンテンツ */}
      {showConfig && onConfig ? (
        <TouchableOpacity style={styles.button} onPress={onConfig}>
          <Text style={styles.buttonText}>Config</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
  buttonText: {
    color: '#888',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
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
  placeholder: {
    minWidth: 70,
  },
});
