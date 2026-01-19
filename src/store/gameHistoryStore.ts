import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Field, GameSnapshot } from '../logic/types';
import { cloneField } from '../logic/field';

// 最大保持件数
const MAX_HISTORY_ENTRIES = 100;

// ゲーム履歴エントリの型
export type GameHistoryEntry = {
  id: string;
  field: Field;
  score: number;
  maxChainCount: number;
  dropCount: number; // ツモ数（ぷよを落下させた回数）
  lastPlayedAt: string; // ISO 8601 形式
  operationHistory: GameSnapshot[]; // フィールドの操作履歴
  nextSnapshotId: number; // 次のスナップショットID
  note: string; // メモ
  tags: string[]; // タグ（グルーピング用）
};

interface GameHistoryStore {
  // ゲーム履歴一覧（History タブ）
  entries: GameHistoryEntry[];
  // お気に入り一覧（Favorite タブ）- 独立して管理
  favorites: GameHistoryEntry[];
  // 現在のゲームID
  currentGameId: string | null;

  // アクション
  startNewGame: () => string;
  updateCurrentGame: (
    field: Field,
    score: number,
    maxChainCount: number,
    operationHistory: GameSnapshot[],
    nextSnapshotId: number
  ) => void;
  deleteEntry: (id: string) => void;
  clearAllHistory: () => void;
  getEntry: (id: string) => GameHistoryEntry | undefined;
  setCurrentGameId: (id: string | null) => void;
  updateNote: (id: string, note: string, isFavoriteList: boolean) => void;
  updateTags: (id: string, tags: string[], isFavoriteList: boolean) => void;
  updateFavoriteDetails: (id: string, note: string, tags: string[]) => void;

  // お気に入り関連
  addToFavorites: (id: string) => void;
  removeFromFavorites: (id: string) => void;
  deleteFavorite: (id: string) => void;
  isInFavorites: (id: string) => boolean;
  getFavoriteEntry: (id: string) => GameHistoryEntry | undefined;
}

// ユニークIDを生成
function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// エントリをディープコピー
function cloneEntry(entry: GameHistoryEntry): GameHistoryEntry {
  return {
    ...entry,
    field: cloneField(entry.field),
    operationHistory: entry.operationHistory.map(s => ({
      ...s,
      field: cloneField(s.field),
    })),
    tags: [...(entry.tags || [])],
  };
}

export const useGameHistoryStore = create<GameHistoryStore>()(
  persist(
    (set, get) => ({
      entries: [],
      favorites: [],
      currentGameId: null,

      startNewGame: () => {
        const newId = generateGameId();
        set({ currentGameId: newId });
        return newId;
      },

      updateCurrentGame: (
        field: Field,
        score: number,
        maxChainCount: number,
        operationHistory: GameSnapshot[],
        nextSnapshotId: number
      ) => {
        const state = get();
        const currentGameId = state.currentGameId;
        if (!currentGameId) return;

        const now = new Date().toISOString();
        const existingIndex = state.entries.findIndex(e => e.id === currentGameId);
        const dropCount = Math.max(0, operationHistory.length - 1);

        // dropCount が 0 の場合は履歴に記録しない
        if (dropCount === 0) {
          // 既存のエントリがあれば削除
          if (existingIndex >= 0) {
            set({ entries: state.entries.filter(e => e.id !== currentGameId) });
          }
          return;
        }

        if (existingIndex >= 0) {
          // 既存のエントリを更新
          const newEntries = [...state.entries];
          newEntries[existingIndex] = {
            ...newEntries[existingIndex],
            field: cloneField(field),
            score,
            maxChainCount: Math.max(newEntries[existingIndex].maxChainCount, maxChainCount),
            dropCount,
            lastPlayedAt: now,
            operationHistory: operationHistory.map(s => ({ ...s, field: cloneField(s.field) })),
            nextSnapshotId,
          };
          set({ entries: newEntries });
        } else {
          // 新しいエントリを追加
          const newEntry: GameHistoryEntry = {
            id: currentGameId,
            field: cloneField(field),
            score,
            maxChainCount,
            dropCount,
            lastPlayedAt: now,
            operationHistory: operationHistory.map(s => ({ ...s, field: cloneField(s.field) })),
            nextSnapshotId,
            note: '',
            tags: [],
          };
          let newEntries = [...state.entries, newEntry];

          // 100件を超えたら古いものを削除
          if (newEntries.length > MAX_HISTORY_ENTRIES) {
            newEntries.sort((a, b) =>
              new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
            );
            newEntries = newEntries.slice(0, MAX_HISTORY_ENTRIES);
          }

          set({ entries: newEntries });
        }
      },

      deleteEntry: (id: string) => {
        const state = get();
        set({ entries: state.entries.filter(e => e.id !== id) });
      },

      clearAllHistory: () => {
        set({ entries: [], currentGameId: null });
      },

      getEntry: (id: string) => {
        const state = get();
        return state.entries.find(e => e.id === id);
      },

      setCurrentGameId: (id: string | null) => {
        set({ currentGameId: id });
      },

      updateNote: (id: string, note: string, isFavoriteList: boolean) => {
        const state = get();
        if (isFavoriteList) {
          const newFavorites = state.favorites.map(e =>
            e.id === id ? { ...e, note } : e
          );
          set({ favorites: newFavorites });
        } else {
          const newEntries = state.entries.map(e =>
            e.id === id ? { ...e, note } : e
          );
          set({ entries: newEntries });
        }
      },

      updateTags: (id: string, tags: string[], isFavoriteList: boolean) => {
        const state = get();
        if (isFavoriteList) {
          const newFavorites = state.favorites.map(e =>
            e.id === id ? { ...e, tags } : e
          );
          set({ favorites: newFavorites });
        } else {
          const newEntries = state.entries.map(e =>
            e.id === id ? { ...e, tags } : e
          );
          set({ entries: newEntries });
        }
      },

      updateFavoriteDetails: (id: string, note: string, tags: string[]) => {
        const state = get();
        const newFavorites = state.favorites.map(e =>
          e.id === id ? { ...e, note, tags } : e
        );
        set({ favorites: newFavorites });
      },

      addToFavorites: (id: string) => {
        const state = get();
        // 既にお気に入りにある場合は何もしない
        if (state.favorites.some(e => e.id === id)) {
          return;
        }
        const entry = state.entries.find(e => e.id === id);
        if (entry) {
          // エントリをコピーしてお気に入りに追加
          const favoriteCopy = cloneEntry(entry);
          set({ favorites: [...state.favorites, favoriteCopy] });
        }
      },

      removeFromFavorites: (id: string) => {
        const state = get();
        set({ favorites: state.favorites.filter(e => e.id !== id) });
      },

      deleteFavorite: (id: string) => {
        const state = get();
        set({ favorites: state.favorites.filter(e => e.id !== id) });
      },

      isInFavorites: (id: string) => {
        const state = get();
        return state.favorites.some(e => e.id === id);
      },

      getFavoriteEntry: (id: string) => {
        const state = get();
        return state.favorites.find(e => e.id === id);
      },
    }),
    {
      name: 'tokopuyo-game-history',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
