import { create } from 'zustand';
import { saveAppState } from '../db';

export type Handedness = 'right' | 'left';

export type ChainAnimationSpeed = 'short' | 'middle' | 'long';

// 連鎖アニメーション速度に対応する遅延時間（ミリ秒）
export const CHAIN_ANIMATION_DELAYS: Record<ChainAnimationSpeed, number> = {
  short: 0,
  middle: 300,
  long: 600,
};

export interface ConfigState {
  handedness: Handedness;
  chainAnimationSpeed: ChainAnimationSpeed;
}

interface ConfigActions {
  setHandedness: (handedness: Handedness) => void;
  setChainAnimationSpeed: (speed: ChainAnimationSpeed) => void;
}

type ConfigStore = ConfigState & ConfigActions;

export const DEFAULT_CONFIG: ConfigState = {
  // デフォルトは右利き
  handedness: 'right',
  // デフォルトは中速
  chainAnimationSpeed: 'middle',
};

export const useConfigStore = create<ConfigStore>()((set, get) => {
  // 設定を変更して保存する
  const update = (changes: Partial<ConfigState>) => {
    set(changes);
    const { handedness, chainAnimationSpeed } = get();
    saveAppState('config', { handedness, chainAnimationSpeed });
  };

  return {
    ...DEFAULT_CONFIG,
    setHandedness: (handedness: Handedness) => update({ handedness }),
    setChainAnimationSpeed: (chainAnimationSpeed: ChainAnimationSpeed) => update({ chainAnimationSpeed }),
  };
});
