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
};

interface GameHistoryStore {
  // ゲーム履歴一覧
  entries: GameHistoryEntry[];
  // 現在のゲームID
  currentGameId: string | null;

  // アクション
  startNewGame: () => string; // 新しいゲームを開始し、IDを返す
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
        // ツモ数は操作履歴の長さ - 1（初期状態のスナップショットを除く）
        const dropCount = Math.max(0, operationHistory.length - 1);

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
          };
          let newEntries = [...state.entries, newEntry];

          // 100件を超えたら古いものを削除
          if (newEntries.length > MAX_HISTORY_ENTRIES) {
            // 日時でソートして古いものを削除
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
    }),
    {
      name: 'tokopuyo-game-history',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
