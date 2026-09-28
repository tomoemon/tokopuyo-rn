import { DatabaseSync } from 'node:sqlite';
import { Database, SqlParam } from '../database';

export interface TestDatabase extends Database {
  // テストから DB の中身を直接確かめる
  all<T>(source: string, params?: SqlParam[]): T[];
  // 次に source が pattern に一致する runAsync を1回だけ失敗させる
  failNextRun(pattern: RegExp): void;
}

// Node の組み込みの SQLite を、expo-sqlite と同じ形の非同期メソッドで包む（テスト用）
export function openTestDatabase(): TestDatabase {
  const db = new DatabaseSync(':memory:');
  let failPattern: RegExp | null = null;

  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, params) {
      if (failPattern && failPattern.test(source)) {
        failPattern = null;
        throw new Error('Injected failure');
      }
      db.prepare(source).run(...params);
    },
    async getFirstAsync<T>(source: string, params: SqlParam[]) {
      return (db.prepare(source).get(...params) ?? null) as T | null;
    },
    async getAllAsync<T>(source: string, params: SqlParam[]) {
      return db.prepare(source).all(...params) as T[];
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    all<T>(source: string, params: SqlParam[] = []) {
      return db.prepare(source).all(...params) as T[];
    },
    failNextRun(pattern) {
      failPattern = pattern;
    },
  };
}
