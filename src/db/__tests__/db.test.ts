import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openTestDatabase, TestDatabase } from './testDatabase';
import { setupDatabase, migrations } from '../migrations';
import { initDatabase, enqueue, flushQueue } from '../queue';
import { countCommonPrefix } from '../gameRepository';

describe('countCommonPrefix', () => {
  const a = { id: 0 };
  const b = { id: 1 };
  const c = { id: 2 };

  it('先頭から参照が同じ要素の数を返す', () => {
    expect(countCommonPrefix([a, b, c], [a, b])).toBe(2);
    expect(countCommonPrefix([a, b], [a, b, c])).toBe(2);
    expect(countCommonPrefix([a, b], [a, c])).toBe(1);
    expect(countCommonPrefix([], [a])).toBe(0);
  });

  it('中身が同じでも別のオブジェクトなら同じとみなさない', () => {
    expect(countCommonPrefix([a], [{ id: 0 }])).toBe(0);
  });
});

describe('setupDatabase', () => {
  it('空の DB に全マイグレーションを適用し、2回目は何もしない', async () => {
    const db = openTestDatabase();
    await setupDatabase(db);
    const tables = () => db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").map(t => t.name);
    expect(tables()).toEqual(['app_state', 'games', 'snapshots']);
    expect(db.all('PRAGMA user_version')).toEqual([{ user_version: migrations.length }]);

    await setupDatabase(db);
    expect(tables()).toEqual(['app_state', 'games', 'snapshots']);
  });

  it('外部キーを有効にする', async () => {
    const db = openTestDatabase();
    await setupDatabase(db);
    expect(db.all('PRAGMA foreign_keys')).toEqual([{ foreign_keys: 1 }]);
  });
});

describe('queue', () => {
  let db: TestDatabase;

  beforeEach(() => {
    db = openTestDatabase();
    initDatabase(db);
  });

  it('積んだ順に1つずつ実行する', async () => {
    const order: string[] = [];
    const slow = enqueue(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      order.push('slow');
    });
    const fast = enqueue(async () => {
      order.push('fast');
    });
    await Promise.all([slow, fast]);
    expect(order).toEqual(['slow', 'fast']);
  });

  it('失敗しても後続の処理を止めない', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failed = enqueue(async () => {
      throw new Error('failed');
    });
    const next = enqueue(async () => 'ok');
    await expect(failed).rejects.toThrow('failed');
    await expect(next).resolves.toBe('ok');
    await flushQueue();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});
