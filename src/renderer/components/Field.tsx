import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Field as FieldType, FallingPuyo, ErasingPuyo, FIELD_COLS, FIELD_ROWS } from '../../logic/types';
import { getSatellitePosition, hardDropPuyo } from '../../logic/puyo';
import { Puyo } from './Puyo';
import { DisappearEffect } from './DisappearEffect';

interface FieldProps {
  field: FieldType;
  fallingPuyo: FallingPuyo | null;
  cellSize: number;
  erasingPuyos?: ErasingPuyo[];
  onEffectComplete?: () => void;
}

const BORDER_WIDTH = 3;

export const Field: React.FC<FieldProps> = ({ field, fallingPuyo, cellSize, erasingPuyos = [], onEffectComplete }) => {
  const fieldWidth = FIELD_COLS * cellSize + BORDER_WIDTH * 2;
  const fieldHeight = FIELD_ROWS * cellSize + BORDER_WIDTH * 2;

  // 操作中のぷよの位置
  const fallingPositions: { x: number; y: number; color: string }[] = [];
  // ゴースト（落下予定位置）の位置
  const ghostPositions: { x: number; y: number; color: string }[] = [];

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

    // ゴースト位置を計算（ハードドロップ後の位置）
    const droppedPuyo = hardDropPuyo(field, fallingPuyo);
    const ghostPivotPos = droppedPuyo.pivot.pos;
    const ghostSatellitePos = getSatellitePosition(droppedPuyo);

    // 現在位置と異なる場合のみゴーストを表示
    if (ghostPivotPos.y !== fallingPuyo.pivot.pos.y) {
      ghostPositions.push({
        x: ghostPivotPos.x,
        y: ghostPivotPos.y,
        color: droppedPuyo.pivot.color,
      });
      ghostPositions.push({
        x: ghostSatellitePos.x,
        y: ghostSatellitePos.y,
        color: droppedPuyo.satellite.color,
      });
    }
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

      {/* ゴースト（落下予定位置） */}
      {ghostPositions.map((pos, index) => (
        <View
          key={`ghost-${index}`}
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
          <Puyo color={pos.color as any} size={cellSize - 4} isGhost />
        </View>
      ))}

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

      {/* 消えるエフェクト */}
      {erasingPuyos.map((puyo, index) => (
        <DisappearEffect
          key={`effect-${puyo.pos.x}-${puyo.pos.y}-${index}`}
          color={puyo.color}
          x={puyo.pos.x}
          y={puyo.pos.y}
          cellSize={cellSize}
          onComplete={index === 0 ? onEffectComplete : undefined}
        />
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
