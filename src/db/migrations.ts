import { Database } from './database';

// マイグレーションの配列。配列の順番がバージョン番号になる（1番目の要素 = version 1）
// リリース前は v1 を直接書き換え、開発中の DB は捨てる。リリース後は末尾に追加するだけにする
export const migrations: ((db: Database) => Promise<void>)[] = [
  // v1
  (db) => db.execAsync(`
    CREATE TABLE games (
      list TEXT NOT NULL,
      id TEXT NOT NULL,
      score INTEGER NOT NULL,
      max_chain INTEGER NOT NULL,
      drop_count INTEGER NOT NULL,
      final_field TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      last_played_at TEXT NOT NULL,
      PRIMARY KEY (list, id)
    );
    CREATE TABLE snapshots (
      list TEXT NOT NULL,
      game_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (list, game_id, seq),
      FOREIGN KEY (list, game_id) REFERENCES games(list, id) ON DELETE CASCADE
    );
    CREATE TABLE app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `),
];

// 接続の設定をして、未適用のマイグレーションを1段ずつトランザクションで適用する
// 途中で失敗してもその段だけが元に戻り、次の起動時にそこからやり直せる
export async function setupDatabase(db: Database): Promise<void> {
  // SQLite の既定は OFF。トランザクションの中では変更できないので先に実行する
  await db.execAsync('PRAGMA foreign_keys = ON');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const current = row?.user_version ?? 0;
  for (let version = current; version < migrations.length; version++) {
    await db.withTransactionAsync(async () => {
      await migrations[version](db);
      // PRAGMA はパラメータを使えないので値を埋め込む
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
