import { openDatabaseAsync } from 'expo-sqlite';
import { Database } from './database';
import { setupDatabase } from './migrations';

// アプリの DB を開いてマイグレーションする（app/_layout からだけ使う。テストは node:sqlite で開く）
export async function openAppDatabase(): Promise<Database> {
  const db = await openDatabaseAsync('renren.db');
  await setupDatabase(db);
  return db;
}
