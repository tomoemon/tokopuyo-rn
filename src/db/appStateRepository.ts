import { enqueue } from './queue';

// 設定など、ゲーム履歴以外のアプリの状態を JSON で保存する
export type AppStateKey = 'config';

export function loadAppState<T>(key: AppStateKey): Promise<T | null> {
  return enqueue(async (db) => {
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', [key]);
    return row ? (JSON.parse(row.value) as T) : null;
  });
}

export function saveAppState(key: AppStateKey, value: unknown): void {
  void enqueue((db) =>
    db.runAsync(
      'INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
      [key, JSON.stringify(value)]
    )
  );
}
