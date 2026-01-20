import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import {
  GameSnapshot,
  FIELD_COLS,
  VISIBLE_ROWS,
  HIDDEN_ROWS,
  PuyoColor,
} from '../../logic/types';

interface HistoryThumbnailProps {
  snapshot: GameSnapshot;
  cellSize: number;
  onPress: () => void;
  isSelected?: boolean;
}

// 色の定義（縮小版用にシンプルな色）
const COLOR_MAP: Record<PuyoColor, string> = {
  red: '#FF4444',
  blue: '#4444FF',
  green: '#44FF44',
  yellow: '#FFFF44',
};

export const HistoryThumbnail: React.FC<HistoryThumbnailProps> = ({
  snapshot,
  cellSize,
  onPress,
  isSelected = false,
}) => {
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
      onPress={onPress}
      style={[styles.container, isSelected ? styles.containerSelected : undefined]}
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
        {/* グリッド背景 */}
        {Array.from({ length: VISIBLE_ROWS }).map((_, y) => (
          <View key={y} style={styles.row}>
            {Array.from({ length: FIELD_COLS }).map((_, x) => (
              <View
                key={x}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                  },
                ]}
              />
            ))}
          </View>
        ))}

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
                      backgroundColor: isDropped ? 'transparent' : COLOR_MAP[color],
                      borderWidth: isDropped ? 1 : 0,
                      borderColor: isDropped ? COLOR_MAP[color] : undefined,
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
                    backgroundColor: COLOR_MAP[color],
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

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
  row: {
    flexDirection: 'row',
  },
  cell: {
    // グリッド線は省略（サイズを正確に保つため）
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
