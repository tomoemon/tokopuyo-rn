import { create } from 'zustand';

export interface GestureState {
  activeColumn: number | null;
  blockedColumn: number | null;
  swipeDirection: 'up' | 'down' | 'left' | 'right' | null;
  cancelFlash: boolean;
}

interface GestureStore extends GestureState {
  setActiveColumn: (column: number | null) => void;
  setBlockedColumn: (column: number | null) => void;
  setSwipeDirection: (direction: 'up' | 'down' | 'left' | 'right' | null) => void;
  setCancelFlash: (flash: boolean) => void;
  reset: () => void;
}

const initialState: GestureState = {
  activeColumn: null,
  blockedColumn: null,
  swipeDirection: null,
  cancelFlash: false,
};

export const useGestureStore = create<GestureStore>((set) => ({
  ...initialState,
  setActiveColumn: (column) => set({ activeColumn: column }),
  setBlockedColumn: (column) => set({ blockedColumn: column }),
  setSwipeDirection: (direction) => set({ swipeDirection: direction }),
  setCancelFlash: (flash) => set({ cancelFlash: flash }),
  reset: () => set(initialState),
}));
