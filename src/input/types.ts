import React from 'react';

/**
 * 入力アダプターのインターフェース
 * 異なる入力方式（スワイプ、ボタン等）を抽象化
 */
export interface InputAdapter {
  /**
   * 子要素をラップして入力を検知するコンポーネント
   */
  InputProvider: React.FC<{ children: React.ReactNode }>;
}
