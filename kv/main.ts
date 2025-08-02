import { type InValue, sqlite } from "https://esm.town/v/stevekrouse/sqlite";

const TABLE_NAME = "kv_store_v1";

export interface KvEntry<T = unknown> {
  key: string;
  value: T;
  updatedAt: number;
}

export interface KvStore {
  set<T = unknown>(key: string, value: T): Promise<void>;
  get<T = unknown>(key: string): Promise<T | undefined>;
  delete(key: string): Promise<void>;
  list<T = unknown>(prefix?: string): Promise<KvEntry<T>[]>;
}

class SqliteKVStore implements KvStore {
  private initialized = false;

  private async ensureTable(): Promise<void> {
    if (this.initialized) return;

    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    this.initialized = true;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    await this.ensureTable();

    const jsonValue = JSON.stringify(value);
    const timestamp = Date.now();

    await sqlite.execute({
      sql: `
        INSERT INTO ${TABLE_NAME} (key, value, updated_at) 
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET 
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
      args: [key, jsonValue, timestamp],
    });
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    await this.ensureTable();

    const result = await sqlite.execute({
      sql: `SELECT value FROM ${TABLE_NAME} WHERE key = ?`,
      args: [key],
    });

    if (result.rows.length === 0) {
      return undefined;
    }

    try {
      return JSON.parse(result.rows[0].value as string) as T;
    } catch (error) {
      throw new Error(
        `Failed to parse stored value for key "${key}": ${error.message}`,
      );
    }
  }

  async delete(key: string): Promise<void> {
    await this.ensureTable();

    await sqlite.execute({
      sql: `DELETE FROM ${TABLE_NAME} WHERE key = ?`,
      args: [key],
    });
  }

  async list<T = unknown>(prefix?: string): Promise<KvEntry<T>[]> {
    await this.ensureTable();

    let sql: string;
    let args: InValue[];

    if (prefix) {
      sql =
        `SELECT key, value, updated_at FROM ${TABLE_NAME} WHERE key LIKE ? ORDER BY key`;
      args = [`${prefix}%`];
    } else {
      sql = `SELECT key, value, updated_at FROM ${TABLE_NAME} ORDER BY key`;
      args = [];
    }

    const result = await sqlite.execute({ sql, args });

    return result.rows.map((row) => {
      try {
        return {
          key: row.key as string,
          value: JSON.parse(row.value as string) as T,
          updatedAt: row.updated_at as number,
        };
      } catch (error) {
        throw new Error(
          `Failed to parse stored value for key "${row.key}": ${error.message}`,
        );
      }
    });
  }
}

export const kv: KvStore = new SqliteKVStore();