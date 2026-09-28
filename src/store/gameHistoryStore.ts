import { create } from 'zustand';
import { Field, GameSnapshot } from '../logic/types';
import { cloneField } from '../logic/field';
import {
  GameList,
  GameSummary,
  saveGame,
  deleteGames,
  copyToFavorites,
  updateFavoriteDetails,
  loadSnapshots,
} from '../db';

export type { GameList, GameSummary };

// 最大保持件数
const MAX_HISTORY_ENTRIES = 100;

interface GameHistoryStore {
  // ゲーム履歴一覧（History タブ）
  entries: GameSummary[];
  // お気に入り一覧（Favorite タブ）- 独立して管理
  favorites: GameSummary[];
  // 現在のゲームID（保存しない）
  currentGameId: string | null;

  // アクション
  startNewGame: () => string;
  updateCurrentGame: (field: Field, score: number, snapshots: GameSnapshot[]) => void;
  deleteEntry: (id: string) => void;
  // History / Favorite のどちらかから、ゲームのスナップショットを読み込む
  loadSnapshots: (list: GameList, id: string) => Promise<GameSnapshot[]>;
  setCurrentGameId: (id: string | null) => void;
  updateFavoriteDetails: (id: string, note: string, tags: string[]) => void;

  // お気に入り関連
  addToFavorites: (id: string) => void;
  deleteFavorite: (id: string) => void;
}

// ユニークIDを生成
function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// 最終プレイ日時の新しい順に並べる比較関数（lastPlayedAt は ISO 8601 なので文字列比較で時刻順になる）
export function compareByLastPlayedDesc(a: GameSummary, b: GameSummary): number {
  return a.lastPlayedAt < b.lastPlayedAt ? 1 : a.lastPlayedAt > b.lastPlayedAt ? -1 : 0;
}

export const useGameHistoryStore = create<GameHistoryStore>()((set, get) => ({
  entries: [],
  favorites: [],
  currentGameId: null,

  startNewGame: () => {
    const newId = generateGameId();
    set({ currentGameId: newId });
    return newId;
  },

  updateCurrentGame: (field: Field, score: number, snapshots: GameSnapshot[]) => {
    const state = get();
    const currentGameId = state.currentGameId;
    if (!currentGameId) return;

    const existing = state.entries.find(e => e.id === currentGameId);
    const dropCount = Math.max(0, snapshots.length - 1);

    // dropCount が 0 の場合は履歴に記録しない（初手まで戻した場合は既存のエントリを削除）
    if (dropCount === 0) {
      if (existing) {
        set({ entries: state.entries.filter(e => e.id !== currentGameId) });
        deleteGames('history', [currentGameId]);
      }
      return;
    }

    const summary: GameSummary = {
      id: currentGameId,
      field: cloneField(field),
      score,
      // 過去の手に戻したときや Fork / Shuffle でも正しくなるよう、今の手の履歴から求める
      maxChainCount: Math.max(0, ...snapshots.map(s => s.chainCount)),
      dropCount,
      lastPlayedAt: new Date().toISOString(),
      note: existing?.note ?? '',
      tags: existing?.tags ?? [],
    };

    let newEntries = existing
      ? state.entries.map(e => (e.id === currentGameId ? summary : e))
      : [...state.entries, summary];

    // 100件を超えたら古いものを削除（消す id はメモリ上で決めて、DB でも同じものを消す）
    // 端末の時計が戻っていてもプレイ中のゲームは消さないように、先頭に置いてから切り詰める
    let removedIds: string[] = [];
    if (newEntries.length > MAX_HISTORY_ENTRIES) {
      const others = newEntries.filter(e => e.id !== currentGameId).sort(compareByLastPlayedDesc);
      removedIds = others.slice(MAX_HISTORY_ENTRIES - 1).map(e => e.id);
      newEntries = [summary, ...others.slice(0, MAX_HISTORY_ENTRIES - 1)];
    }

    set({ entries: newEntries });
    saveGame(summary, snapshots);
    if (removedIds.length > 0) {
      deleteGames('history', removedIds);
    }
  },

  deleteEntry: (id: string) => {
    set({ entries: get().entries.filter(e => e.id !== id) });
    deleteGames('history', [id]);
  },

  loadSnapshots: (list: GameList, id: string) => loadSnapshots(list, id),

  setCurrentGameId: (id: string | null) => {
    set({ currentGameId: id });
  },

  updateFavoriteDetails: (id: string, note: string, tags: string[]) => {
    set({ favorites: get().favorites.map(e => (e.id === id ? { ...e, note, tags } : e)) });
    updateFavoriteDetails(id, note, tags);
  },

  addToFavorites: (id: string) => {
    const state = get();
    // 既にお気に入りにある場合は何もしない
    if (state.favorites.some(e => e.id === id)) return;
    const entry = state.entries.find(e => e.id === id);
    if (!entry) return;
    // 独立したコピーとして追加する（DB ではスナップショットもコピーする）
    set({ favorites: [...state.favorites, { ...entry, field: cloneField(entry.field), tags: [...entry.tags] }] });
    copyToFavorites(id);
  },

  deleteFavorite: (id: string) => {
    set({ favorites: get().favorites.filter(e => e.id !== id) });
    deleteGames('favorite', [id]);
  },
}));
