import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Handedness = 'right' | 'left';

interface ConfigState {
  handedness: Handedness;
}

interface ConfigActions {
  setHandedness: (handedness: Handedness) => void;
}

type ConfigStore = ConfigState & ConfigActions;

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      // 初期状態（デフォルトは右利き）
      handedness: 'right',

      // アクション
      setHandedness: (handedness: Handedness) => set({ handedness }),
    }),
    {
      name: 'tokopuyo-config',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
