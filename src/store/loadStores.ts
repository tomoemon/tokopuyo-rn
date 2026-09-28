import { loadAppState, loadSummaries } from '../db';
import { useConfigStore, DEFAULT_CONFIG, ConfigState } from './configStore';
import { useGameHistoryStore } from './gameHistoryStore';

// 起動時に、保存されている設定と History / Favorite の要約を読み込んでストアに入れる
// （ゲームは常に初期状態から始める。途中で終了したゲームの続きは History から Resume する）
export async function loadStores(): Promise<void> {
  const [config, entries, favorites] = await Promise.all([
    loadAppState<Partial<ConfigState>>('config'),
    loadSummaries('history'),
    loadSummaries('favorite'),
  ]);
  useConfigStore.setState({ ...DEFAULT_CONFIG, ...config });
  useGameHistoryStore.setState({ entries, favorites });
}
