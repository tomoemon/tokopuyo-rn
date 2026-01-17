import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PuyoColor } from '../../logic/types';

interface PuyoProps {
  color: PuyoColor;
  size: number;
  isGhost?: boolean; // 落下予測表示用
}

// 色の定義
const COLOR_MAP: Record<PuyoColor, string> = {
  red: '#FF4444',
  blue: '#4444FF',
  green: '#44FF44',
  yellow: '#FFFF44',
};

const BORDER_COLOR_MAP: Record<PuyoColor, string> = {
  red: '#CC0000',
  blue: '#0000CC',
  green: '#00CC00',
  yellow: '#CCCC00',
};

export const Puyo: React.FC<PuyoProps> = ({ color, size, isGhost = false }) => {
  const backgroundColor = COLOR_MAP[color];
  const borderColor = BORDER_COLOR_MAP[color];

  return (
    <View
      style={[
        styles.puyo,
        {
          width: size,
          height: size,
          backgroundColor,
          borderColor,
          opacity: isGhost ? 0.3 : 1,
        },
      ]}
    >
      {/* 目の表現 */}
      <View style={styles.eyeContainer}>
        <View style={[styles.eye, { width: size * 0.15, height: size * 0.2 }]}>
          <View style={[styles.pupil, { width: size * 0.08, height: size * 0.1 }]} />
        </View>
        <View style={[styles.eye, { width: size * 0.15, height: size * 0.2 }]}>
          <View style={[styles.pupil, { width: size * 0.08, height: size * 0.1 }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  puyo: {
    borderRadius: 100,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  eye: {
    backgroundColor: 'white',
    borderRadius: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 2,
  },
  pupil: {
    backgroundColor: 'black',
    borderRadius: 100,
  },
});
