import { Field, GameSnapshot } from '../logic/types';
import { enqueue } from './queue';

// 'history' は History タブ、'favorite' は Favorite タブ（History からコピーした独立したエントリ。id は同じ）
export type GameList = 'history' | 'favorite';

// 一覧に出すゲームの要約（スナップショットは含めない）
export type GameSummary = {
  id: string;
  field: Field; // サムネイル用の最終盤面
  score: number;
  maxChainCount: number;
  dropCount: number; // ツモ数（ぷよを落下させた回数）
  lastPlayedAt: string; // ISO 8601 形式
  note: string; // メモ
  tags: string[]; // タグ（グルーピング用）
};

type GameRow = {
  id: string;
  score: number;
  max_chain: number;
  drop_count: number;
  final_field: string;
  note: string;
  tags: string;
  last_played_at: string;
};

// 最後に書き込みに成功したプレイ中のゲームのスナップショット（saveGame の差分の基準）
// 待ち行列の外から変えると、まだ残っている処理と食い違うので、待ち行列の中の処理からだけ読み書きする
let lastSaved: { gameId: string; snapshots: GameSnapshot[] } | null = null;

// 2つの配列の先頭から、同じ要素（参照が同じもの）が続く数
export function countCommonPrefix<T>(a: readonly T[], b: readonly T[]): number {
  const length = Math.min(a.length, b.length);
  let i = 0;
  while (i < length && a[i] === b[i]) i++;
  return i;
}

function toSummary(row: GameRow): GameSummary {
  return {
    id: row.id,
    field: JSON.parse(row.final_field),
    score: row.score,
    maxChainCount: row.max_chain,
    dropCount: row.drop_count,
    lastPlayedAt: row.last_played_at,
    note: row.note,
    tags: JSON.parse(row.tags),
  };
}

export function loadSummaries(list: GameList): Promise<GameSummary[]> {
  return enqueue(async (db) => {
    const rows = await db.getAllAsync<GameRow>(
      'SELECT id, score, max_chain, drop_count, final_field, note, tags, last_played_at FROM games WHERE list = ?',
      [list]
    );
    return rows.map(toSummary);
  });
}

export function loadSnapshots(list: GameList, gameId: string): Promise<GameSnapshot[]> {
  return enqueue(async (db) => {
    const rows = await db.getAllAsync<{ data: string }>(
      'SELECT data FROM snapshots WHERE list = ? AND game_id = ? ORDER BY seq',
      [list, gameId]
    );
    return rows.map((row) => JSON.parse(row.data));
  });
}

// プレイ中のゲームを History に保存する。スナップショットは前回の書き込みからの差分だけを書く
// （スナップショットは作成後に変更しないので、参照の比較で同じ部分がわかる）
// 差分は、前の書き込みが終わってから計算する。積んだ時点で計算すると、続けて積んだ手が同じ基準と比べてしまうため
export function saveGame(summary: GameSummary, snapshots: GameSnapshot[]): void {
  void enqueue(async (db) => {
    // 別のゲームを覚えているとき（新しいゲーム、Fork / Shuffle の直後）は全部書き直す
    // Resume で読み込んだスナップショットも新しいオブジェクトなので、直後の保存は全部書き直しになる
    // （Favorite から Resume したときに、中身の違う History の行と混ざらない。History から削除済みでも全部書かれる）
    const base = lastSaved?.gameId === summary.id ? lastSaved.snapshots : [];
    const common = countCommonPrefix(base, snapshots);
    await db.withTransactionAsync(async () => {
      // 外部キーはすぐに検査されるので、games の行を snapshots より先に書く
      // INSERT OR REPLACE は行を消してから入れ直すので、CASCADE でスナップショットまで消えてしまう。メモとタグは変えない
      await db.runAsync(
        `INSERT INTO games (list, id, score, max_chain, drop_count, final_field, last_played_at)
         VALUES ('history', ?, ?, ?, ?, ?, ?)
         ON CONFLICT (list, id) DO UPDATE SET
           score = excluded.score,
           max_chain = excluded.max_chain,
           drop_count = excluded.drop_count,
           final_field = excluded.final_field,
           last_played_at = excluded.last_played_at`,
        [summary.id, summary.score, summary.maxChainCount, summary.dropCount, JSON.stringify(summary.field), summary.lastPlayedAt]
      );
      await db.runAsync(
        "DELETE FROM snapshots WHERE list = 'history' AND game_id = ? AND seq >= ?",
        [summary.id, common]
      );
      if (common < snapshots.length) {
        await db.runAsync(
          "INSERT INTO snapshots (list, game_id, seq, data) SELECT 'history', ?, ? + key, value FROM json_each(?)",
          [summary.id, common, JSON.stringify(snapshots.slice(common))]
        );
      }
    });
    lastSaved = { gameId: summary.id, snapshots };
  });
}

// ゲームを削除する（スナップショットは CASCADE で一緒に消える）
export function deleteGames(list: GameList, gameIds: string[]): void {
  void enqueue(async (db) => {
    await db.runAsync(
      'DELETE FROM games WHERE list = ? AND id IN (SELECT value FROM json_each(?))',
      [list, JSON.stringify(gameIds)]
    );
  });
}

// History のゲームを、同じ id のまま Favorite にコピーする
export function copyToFavorites(gameId: string): void {
  void enqueue((db) =>
    db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO games (list, id, score, max_chain, drop_count, final_field, note, tags, last_played_at)
         SELECT 'favorite', id, score, max_chain, drop_count, final_field, note, tags, last_played_at
         FROM games WHERE list = 'history' AND id = ?`,
        [gameId]
      );
      await db.runAsync(
        `INSERT INTO snapshots (list, game_id, seq, data)
         SELECT 'favorite', game_id, seq, data FROM snapshots WHERE list = 'history' AND game_id = ?`,
        [gameId]
      );
    })
  );
}

export function updateFavoriteDetails(gameId: string, note: string, tags: string[]): void {
  void enqueue((db) =>
    db.runAsync(
      "UPDATE games SET note = ?, tags = ? WHERE list = 'favorite' AND id = ?",
      [note, JSON.stringify(tags), gameId]
    )
  );
}

// テスト用：覚えているスナップショットを忘れる（DB を作り直すときに使う）
export function resetGameRepository(): void {
  lastSaved = null;
}
