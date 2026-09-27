import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import {
  GameSnapshot,
  FIELD_COLS,
  VISIBLE_ROWS,
  HIDDEN_ROWS,
} from '../../logic/types';
import { PUYO_COLORS } from '../constants';

interface HistoryThumbnailProps {
  snapshot: GameSnapshot;
  cellSize: number;
  onPress: (snapshotId: number) => void;
  isSelected?: boolean;
}

// 履歴の再描画時に変更のないサムネイルを描き直さないよう memo 化
export const HistoryThumbnail = React.memo(function HistoryThumbnail({
  snapshot,
  cellSize,
  onPress,
  isSelected = false,
}: HistoryThumbnailProps) {
  const fieldWidth = FIELD_COLS * cellSize;
  const fieldHeight = VISIBLE_ROWS * cellSize;

  // 落下位置かどうかを判定
  const isDroppedPosition = (x: number, y: number): boolean => {
    return snapshot.droppedPositions.some(
      (pos) => pos.x === x && pos.y === y
    );
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(snapshot.id)}
      style={[styles.container, isSelected && styles.containerSelected]}
      activeOpacity={0.7}
    >
      {/* ミニフィールド */}
      <View style={styles.fieldBorder}>
        <View
          style={[
            styles.field,
            {
              width: fieldWidth,
              height: fieldHeight,
            },
          ]}
        >
        {/* フィールド上のぷよ */}
        {snapshot.field.map((row, y) =>
          row.map((color, x) => {
            if (color === null) return null;
            const displayY = y - HIDDEN_ROWS;
            const isDropped = isDroppedPosition(x, y);

            return (
              <View
                key={`${x}-${y}`}
                style={[
                  styles.puyo,
                  {
                    left: x * cellSize,
                    top: displayY * cellSize,
                    width: cellSize,
                    height: cellSize,
                  },
                ]}
              >
                <View
                  style={[
                    styles.puyoInner,
                    {
                      width: cellSize - 1,
                      height: cellSize - 1,
                      backgroundColor: isDropped ? 'transparent' : PUYO_COLORS[color],
                      borderWidth: isDropped ? 1 : 0,
                      borderColor: isDropped ? PUYO_COLORS[color] : undefined,
                    },
                  ]}
                />
              </View>
            );
          })
        )}
        </View>
      </View>

      {/* NEXTぷよ表示 */}
      <View style={styles.nextContainer}>
        {snapshot.nextQueue.slice(0, 2).map((pair, pairIndex) => (
          <View key={pairIndex} style={styles.nextPair}>
            {pair.map((color, colorIndex) => (
              <View
                key={colorIndex}
                style={[
                  styles.nextPuyo,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: PUYO_COLORS[color],
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 4,
    padding: 2,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#3a3a5a',
  },
  containerSelected: {
    borderColor: '#4488ff',
    borderWidth: 2,
    backgroundColor: 'rgba(68, 136, 255, 0.2)',
  },
  fieldBorder: {
    borderWidth: 1,
    borderColor: '#4a4a6a',
  },
  field: {
    backgroundColor: '#1a1a2e',
    position: 'relative',
  },
  puyo: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  puyoInner: {
    borderRadius: 100,
  },
  nextContainer: {
    marginLeft: 2,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  nextPair: {
    marginBottom: 2,
  },
  nextPuyo: {
    borderRadius: 100,
    marginBottom: 1,
  },
});
