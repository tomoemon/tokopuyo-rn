import { Database } from './database';

// DB に触るのはこの待ち行列だけにする。前の処理が終わってから次を実行するので、
// 書き込みの順番が守られ、トランザクション（同じ接続での BEGIN / COMMIT）が重ならない
let database: Database | null = null;
let queue: Promise<unknown> = Promise.resolve();

// 起動時に、セットアップ済みの DB を渡す
export function initDatabase(db: Database): void {
  database = db;
  queue = Promise.resolve();
}

// 処理を待ち行列に積む。書き込みは結果を待たずに積むだけでよい（失敗はログに出す）
export function enqueue<T>(task: (db: Database) => Promise<T>): Promise<T> {
  const result = queue.then(() => {
    if (!database) throw new Error('Database is not initialized');
    return task(database);
  });
  // 失敗しても後続の処理を止めない（queue = queue.then(task) だと、1回失敗したあとの処理がすべて実行されなくなる）
  queue = result.catch((error) => console.error('[db]', error));
  return result;
}

// 待ち行列に積んだ処理がすべて終わるまで待つ
export function flushQueue(): Promise<void> {
  return queue.then(() => undefined);
}
