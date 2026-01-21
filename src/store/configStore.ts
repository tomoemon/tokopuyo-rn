import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Handedness = 'right' | 'left';

export type ChainAnimationSpeed = 'short' | 'middle' | 'long';

// 連鎖アニメーション速度に対応する遅延時間（ミリ秒）
export const CHAIN_ANIMATION_DELAYS: Record<ChainAnimationSpeed, number> = {
  short: 0,
  middle: 300,
  long: 600,
};

interface ConfigState {
  handedness: Handedness;
  chainAnimationSpeed: ChainAnimationSpeed;
}

interface ConfigActions {
  setHandedness: (handedness: Handedness) => void;
  setChainAnimationSpeed: (speed: ChainAnimationSpeed) => void;
}

type ConfigStore = ConfigState & ConfigActions;

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      // 初期状態（デフォルトは右利き）
      handedness: 'right',
      // 初期状態（デフォルトは中速）
      chainAnimationSpeed: 'middle',

      // アクション
      setHandedness: (handedness: Handedness) => set({ handedness }),
      setChainAnimationSpeed: (chainAnimationSpeed: ChainAnimationSpeed) => set({ chainAnimationSpeed }),
    }),
    {
      name: 'renren-config',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
