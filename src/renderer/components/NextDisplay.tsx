import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PuyoColor } from '../../logic/types';
import { Puyo } from './Puyo';

interface NextDisplayProps {
  nextQueue: [PuyoColor, PuyoColor][];
  cellSize: number;
}

export const NextDisplay: React.FC<NextDisplayProps> = ({ nextQueue, cellSize }) => {
  const displayCount = Math.min(nextQueue.length, 2);
  const smallCellSize = cellSize * 0.7;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>NEXT</Text>
      <View style={styles.nextList}>
        {nextQueue.slice(0, displayCount).map((pair, index) => (
          <View
            key={index}
            style={[
              styles.pairContainer,
              index === 0 ? styles.firstPair : styles.secondPair,
            ]}
          >
            {/* 上のぷよ（子ぷよ） */}
            <View style={styles.puyoWrapper}>
              <Puyo
                color={pair[1]}
                size={index === 0 ? cellSize - 4 : smallCellSize - 4}
              />
            </View>
            {/* 下のぷよ（軸ぷよ） */}
            <View style={styles.puyoWrapper}>
              <Puyo
                color={pair[0]}
                size={index === 0 ? cellSize - 4 : smallCellSize - 4}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nextList: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  pairContainer: {
    alignItems: 'center',
  },
  firstPair: {
    // 最初のNEXTは大きく表示
  },
  secondPair: {
    opacity: 0.7,
  },
  puyoWrapper: {
    marginVertical: 2,
  },
});
