import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { PuyoColor } from '../../logic/types';

interface DisappearEffectProps {
  color: PuyoColor;
  x: number;
  y: number;
  cellSize: number;
  onComplete?: () => void;
}

// 色の定義（Puyo.tsxと同じ）
const COLOR_MAP: Record<PuyoColor, string> = {
  red: '#FF4444',
  blue: '#4444FF',
  green: '#44FF44',
  yellow: '#FFFF44',
};

// パーティクルの数
const PARTICLE_COUNT = 8;

// アニメーション時間（ミリ秒）
const ANIMATION_DURATION = 400;

interface ParticleProps {
  color: string;
  angle: number;
  cellSize: number;
}

const Particle: React.FC<ParticleProps> = ({ color, angle, cellSize }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  }, []);

  // パーティクルの移動距離
  const distance = cellSize * 0.8;

  // 角度に基づいた移動方向
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(angle) * distance],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(angle) * distance],
  });

  // フェードアウト
  const opacity = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [1, 1, 0],
  });

  // スケール（少し縮む）
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });

  const particleSize = cellSize * 0.2;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particleSize,
          height: particleSize,
          backgroundColor: color,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
        },
      ]}
    />
  );
};

export const DisappearEffect: React.FC<DisappearEffectProps> = ({
  color,
  x,
  y,
  cellSize,
  onComplete,
}) => {
  const particleColor = COLOR_MAP[color];

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, ANIMATION_DURATION);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // パーティクルを均等な角度で配置
  const particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    return (
      <Particle
        key={i}
        color={particleColor}
        angle={angle}
        cellSize={cellSize}
      />
    );
  });

  return (
    <View
      style={[
        styles.container,
        {
          left: x * cellSize + cellSize / 2,
          top: y * cellSize + cellSize / 2,
        },
      ]}
    >
      {particles}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    borderRadius: 100,
  },
});
