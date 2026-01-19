import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Field as FieldType, FallingPuyo, ErasingPuyo, FIELD_COLS, VISIBLE_ROWS, HIDDEN_ROWS, TOTAL_ROWS } from '../../logic/types';
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
const HIDDEN_BORDER_WIDTH = 2;

export const Field: React.FC<FieldProps> = ({ field, fallingPuyo, cellSize, erasingPuyos = [], onEffectComplete }) => {
  const fieldWidth = FIELD_COLS * cellSize + BORDER_WIDTH * 2;
  // フィールドの高さは隠しマスも含む
  const fieldHeight = TOTAL_ROWS * cellSize + BORDER_WIDTH * 2;

  // ゴースト（落下予定位置）の位置
  const ghostPositions: { x: number; y: number; color: string }[] = [];

  if (fallingPuyo) {
    // ゴースト位置を計算（ハードドロップ後の位置）
    const droppedPuyo = hardDropPuyo(field, fallingPuyo);
    const ghostPivotPos = droppedPuyo.pivot.pos;
    const ghostSatellitePos = getSatellitePosition(droppedPuyo);

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
      {/* 隠しマスのグリッド背景（上部 HIDDEN_ROWS 行） */}
      <View style={[styles.hiddenArea, { height: HIDDEN_ROWS * cellSize }]}>
        {Array.from({ length: HIDDEN_ROWS }).map((_, y) => (
          <View key={`hidden-${y}`} style={styles.row}>
            {Array.from({ length: FIELD_COLS }).map((_, x) => (
              <View
                key={x}
                style={[
                  styles.hiddenCell,
                  {
                    width: cellSize,
                    height: cellSize,
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      {/* 隠しマスと可視マスの境界線 */}
      <View
        style={[
          styles.hiddenBorder,
          {
            top: HIDDEN_ROWS * cellSize - HIDDEN_BORDER_WIDTH / 2,
            height: HIDDEN_BORDER_WIDTH,
          },
        ]}
      />

      {/* 可視マスのグリッド背景（下部 VISIBLE_ROWS 行） */}
      <View style={[styles.visibleArea, { top: HIDDEN_ROWS * cellSize }]}>
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
      </View>

      {/* フィールド上のぷよ（隠し行も含めて表示） */}
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
      {ghostPositions.map((pos, index) => {
        return (
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
        );
      })}


      {/* 消えるエフェクト（隠し行は表示しない） */}
      {erasingPuyos.map((puyo, index) => {
        if (puyo.pos.y < HIDDEN_ROWS) return null;
        return (
          <DisappearEffect
            key={`effect-${puyo.pos.x}-${puyo.pos.y}-${index}`}
            color={puyo.color}
            x={puyo.pos.x}
            y={puyo.pos.y}
            cellSize={cellSize}
            onComplete={index === 0 ? onEffectComplete : undefined}
          />
        );
      })}

      {/* ゲームオーバーゾーンのバツ印（可視マスの最上行に表示） */}
      {[2, 3].map((x) => (
        <View
          key={`gameover-mark-${x}`}
          style={[
            styles.gameOverMarkOverlay,
            {
              left: x * cellSize,
              top: HIDDEN_ROWS * cellSize,
              width: cellSize,
              height: cellSize,
            },
          ]}
        >
          <View style={[styles.xLine, styles.xLine1, { width: cellSize * 0.6 }]} />
          <View style={[styles.xLine, styles.xLine2, { width: cellSize * 0.6 }]} />
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
    overflow: 'hidden',
  },
  hiddenArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0d0d1a',
  },
  visibleArea: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  hiddenBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#6a6a8a',
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    borderColor: '#2a2a4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiddenCell: {
    borderWidth: 0.5,
    borderColor: '#1a1a3a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  puyoContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverMarkOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  xLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(255, 100, 100, 0.4)',
    borderRadius: 1,
  },
  xLine1: {
    transform: [{ rotate: '45deg' }],
  },
  xLine2: {
    transform: [{ rotate: '-45deg' }],
  },
});
