import { SQLResultSet, SQLTransaction } from 'expo-sqlite';
import { getDatabase } from './database';

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
    getDatabase().transaction((tx) => {
      execute(tx, sql, params).then(resolve).catch(reject);
    }, reject);
  });

export const withTransaction = async <T>(
  handler: (tx: SQLTransaction) => Promise<T> | T
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    getDatabase().transaction((tx) => {
      Promise.resolve(handler(tx)).then(resolve).catch(reject);
    }, reject);
  });
