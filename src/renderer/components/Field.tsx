import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Field as FieldType, FallingPuyo, FIELD_COLS, FIELD_ROWS } from '../../logic/types';
import { getSatellitePosition } from '../../logic/puyo';
import { Puyo } from './Puyo';

interface FieldProps {
  field: FieldType;
  fallingPuyo: FallingPuyo | null;
  cellSize: number;
}

const BORDER_WIDTH = 3;

export const Field: React.FC<FieldProps> = ({ field, fallingPuyo, cellSize }) => {
  const fieldWidth = FIELD_COLS * cellSize + BORDER_WIDTH * 2;
  const fieldHeight = FIELD_ROWS * cellSize + BORDER_WIDTH * 2;

  // 操作中のぷよの位置
  const fallingPositions: { x: number; y: number; color: string }[] = [];
  if (fallingPuyo) {
    fallingPositions.push({
      x: fallingPuyo.pivot.pos.x,
      y: fallingPuyo.pivot.pos.y,
      color: fallingPuyo.pivot.color,
    });
    const satellitePos = getSatellitePosition(fallingPuyo);
    fallingPositions.push({
      x: satellitePos.x,
      y: satellitePos.y,
      color: fallingPuyo.satellite.color,
    });
  }

  return (
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
      {Array.from({ length: FIELD_ROWS }).map((_, y) => (
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
      {field.map((row, y) =>
        row.map((color, x) => {
          if (color === null) return null;
          return (
            <View
              key={`${x}-${y}`}
              style={[
                styles.puyoContainer,
                {
                  left: x * cellSize,
                  top: y * cellSize,
                  width: cellSize,
                  height: cellSize,
                },
              ]}
            >
              <Puyo color={color} size={cellSize - 4} />
            </View>
          );
        })
      )}

      {/* 操作中のぷよ */}
      {fallingPositions.map((pos, index) => (
        <View
          key={`falling-${index}`}
          style={[
            styles.puyoContainer,
            {
              left: pos.x * cellSize,
              top: pos.y * cellSize,
              width: cellSize,
              height: cellSize,
            },
          ]}
        >
          <Puyo color={pos.color as any} size={cellSize - 4} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    backgroundColor: '#1a1a2e',
    borderWidth: BORDER_WIDTH,
    borderColor: '#4a4a6a',
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    borderColor: '#2a2a4a',
  },
  puyoContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
