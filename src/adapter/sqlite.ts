import { Database } from 'bun:sqlite';
import { DatabaseAdapter } from './base.ts';
import type { TableInfo, ColumnSchema, QueryOptions, HealthInfo } from '../types.ts';

/**
 * SQLite adapter using Bun's built-in bun:sqlite
 */
export class SQLiteAdapter extends DatabaseAdapter {
  private db: Database | null = null;
  private path: string | null = null;

  /**
   * Connect to SQLite database file
   * @param path - Path to the .db or .sqlite file
   */
  connect(path: string): void {
    try {
      this.db = new Database(path);
      this.path = path;
      // Enable WAL mode for better performance
      this.db.exec('PRAGMA journal_mode = WAL');
    } catch (error) {
      throw new Error(`Failed to open database: ${(error as Error).message}`);
    }
  }

  /**
   * Get all tables in the database
   * @returns Array of table information
   */
  getTables(): TableInfo[] {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const query = `
      SELECT name
      FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;
    
    const tables = this.db.query(query).all() as { name: string }[];
    
    // Get row count for each table
    return tables.map(table => {
      const result = this.db.query(`SELECT COUNT(*) as count FROM "${table.name}"`).get() as { count: number };
      return {
        name: table.name,
        row_count: result.count
      };
    });
  }

  /**
   * Get schema information for a specific table
   * @param tableName - Name of the table
   * @returns Array of column schema information
   */
  getTableSchema(tableName: string): ColumnSchema[] {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return this.db.query(`PRAGMA table_info("${tableName}")`).all() as unknown as ColumnSchema[];
  }

  /**
   * Get data from a specific table with pagination
   * @param tableName - Name of the table
   * @param options - Query options
   * @returns Array of row objects
   */
  getTableData(tableName: string, { limit = 50, offset = 0 }: QueryOptions = {}): Record<string, any>[] {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return this.db.query(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`).all(limit, offset) as Record<string, any>[];
  }

  /**
   * Get the total row count for a specific table
   * @param tableName - Name of the table
   * @returns Total number of rows
   */
  getRowCount(tableName: string): number {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const result = this.db.query(`SELECT COUNT(*) as count FROM "${tableName}"`).get() as { count: number };
    return result.count;
  }

  /**
   * Delete a single row from a table by its primary key values
   * @param tableName - Name of the table
   * @param keyValues - Primary key column/value mapping
   */
  deleteRow(tableName: string, keyValues: Record<string, any>): void {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const keys = Object.keys(keyValues);
    if (keys.length === 0) {
      throw new Error(`No primary key values provided for delete on ${tableName}`);
    }

    const conditions: string[] = [];
    const values: any[] = [];

    for (const key of keys) {
      const value = keyValues[key];
      if (value === null || value === undefined) {
        conditions.push(`"${key}" IS NULL`);
      } else {
        conditions.push(`"${key}" = ?`);
        values.push(value);
      }
    }

    const whereClause = conditions.join(' AND ');
    this.db.query(`DELETE FROM "${tableName}" WHERE ${whereClause}`).run(...values);
  }

  /**
   * Get core database health info
   */
  getHealthInfo(): HealthInfo {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const singleValue = <T = string>(sql: string): T => {
      const row = this.db.query(sql).get() as Record<string, any> | undefined;
      if (!row) return '' as T;
      const value = Object.values(row)[0];
      return value as T;
    };

    return {
      sqlite_version: singleValue<string>('SELECT sqlite_version()'),
      journal_mode: singleValue<string>('PRAGMA journal_mode'),
      synchronous: String(singleValue<number>('PRAGMA synchronous')),
      locking_mode: singleValue<string>('PRAGMA locking_mode'),
      page_size: singleValue<number>('PRAGMA page_size'),
      page_count: singleValue<number>('PRAGMA page_count'),
      freelist_count: singleValue<number>('PRAGMA freelist_count'),
      cache_size: singleValue<number>('PRAGMA cache_size'),
      wal_autocheckpoint: singleValue<number>('PRAGMA wal_autocheckpoint'),
      auto_vacuum: String(singleValue<number>('PRAGMA auto_vacuum')),
      user_version: singleValue<number>('PRAGMA user_version'),
      application_id: singleValue<number>('PRAGMA application_id'),
      encoding: singleValue<string>('PRAGMA encoding'),
      foreign_keys: String(singleValue<number>('PRAGMA foreign_keys')),
      temp_store: String(singleValue<number>('PRAGMA temp_store')),
      mmap_size: singleValue<number>('PRAGMA mmap_size'),
      busy_timeout: singleValue<number>('PRAGMA busy_timeout')
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
