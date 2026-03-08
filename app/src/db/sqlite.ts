import { getDatabase } from './database';

// Legacy expo-sqlite types (runtime API still available)
type SQLResultSet = {
  insertId: number | undefined;
  rowsAffected: number;
  rows: { length: number; item: (index: number) => any; _array: any[] };
};
type SQLTransaction = {
  executeSql: (
    sql: string,
    params?: unknown[],
    success?: (tx: SQLTransaction, result: SQLResultSet) => boolean | void,
    error?: (tx: SQLTransaction, error: Error) => boolean | void,
  ) => void;
};

export const execute = (
  tx: SQLTransaction,
  sql: string,
  params: unknown[] = []
): Promise<SQLResultSet> =>
  new Promise((resolve, reject) => {
    tx.executeSql(
      sql,
      params,
      (_, result) => {
        resolve(result);
        return false;
      },
      (_, error) => {
        reject(error);
        return false;
      }
    );
  });

export const runSql = (sql: string, params: unknown[] = []): Promise<SQLResultSet> =>
  new Promise((resolve, reject) => {
    (getDatabase() as any).transaction((tx: SQLTransaction) => {
      execute(tx, sql, params).then(resolve).catch(reject);
    }, reject);
  });

export const withTransaction = async <T>(
  handler: (tx: SQLTransaction) => Promise<T> | T
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    (getDatabase() as any).transaction((tx: SQLTransaction) => {
      Promise.resolve(handler(tx)).then(resolve).catch(reject);
    }, reject);
  });
