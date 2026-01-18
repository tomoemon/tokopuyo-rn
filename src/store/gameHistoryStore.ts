import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Field, PuyoColor } from '../logic/types';
import { cloneField } from '../logic/field';

// ゲーム履歴エントリの型
export type GameHistoryEntry = {
  id: string;
  field: Field;
  score: number;
  maxChainCount: number;
  lastPlayedAt: string; // ISO 8601 形式
};

interface GameHistoryStore {
  // ゲーム履歴一覧
  entries: GameHistoryEntry[];
  // 現在のゲームID
  currentGameId: string | null;

  // アクション
  startNewGame: () => string; // 新しいゲームを開始し、IDを返す
  updateCurrentGame: (field: Field, score: number, maxChainCount: number) => void;
  deleteEntry: (id: string) => void;
  clearAllHistory: () => void;
}

// ユニークIDを生成
function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const useGameHistoryStore = create<GameHistoryStore>()(
  persist(
    (set, get) => ({
      entries: [],
      currentGameId: null,

      startNewGame: () => {
        const newId = generateGameId();
        set({ currentGameId: newId });
        return newId;
      },

      updateCurrentGame: (field: Field, score: number, maxChainCount: number) => {
        const state = get();
        const currentGameId = state.currentGameId;
        if (!currentGameId) return;

        const now = new Date().toISOString();
        const existingIndex = state.entries.findIndex(e => e.id === currentGameId);

        if (existingIndex >= 0) {
          // 既存のエントリを更新
          const newEntries = [...state.entries];
          newEntries[existingIndex] = {
            ...newEntries[existingIndex],
            field: cloneField(field),
            score,
            maxChainCount: Math.max(newEntries[existingIndex].maxChainCount, maxChainCount),
            lastPlayedAt: now,
          };
          set({ entries: newEntries });
        } else {
          // 新しいエントリを追加
          const newEntry: GameHistoryEntry = {
            id: currentGameId,
            field: cloneField(field),
            score,
            maxChainCount,
            lastPlayedAt: now,
          };
          set({ entries: [...state.entries, newEntry] });
        }
      },

      deleteEntry: (id: string) => {
        const state = get();
        set({ entries: state.entries.filter(e => e.id !== id) });
      },

      clearAllHistory: () => {
        set({ entries: [], currentGameId: null });
      },
    }),
    {
      name: 'tokopuyo-game-history',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
