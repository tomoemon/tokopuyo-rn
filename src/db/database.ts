// リポジトリが使う DB の操作。expo-sqlite の SQLiteDatabase はこの形を満たす
// （テストでは Node の node:sqlite を同じ形で包んだものを渡す）
export type SqlParam = string | number | null;

export interface Database {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlParam[]): Promise<unknown>;
  getFirstAsync<T>(source: string, params: SqlParam[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: SqlParam[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
