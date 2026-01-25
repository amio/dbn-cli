import { DatabaseSync } from 'node:sqlite';
import { DatabaseAdapter } from './base.ts';
import type { TableInfo, ColumnSchema, QueryOptions } from '../types.ts';

/**
 * SQLite adapter using Node.js 22+ built-in node:sqlite
 */
export class SQLiteAdapter extends DatabaseAdapter {
  private db: DatabaseSync | null = null;
  private path: string | null = null;

  /**
   * Connect to SQLite database file
   * @param path - Path to the .db or .sqlite file
   */
  connect(path: string): void {
    try {
      this.db = new DatabaseSync(path);
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
    
    const stmt = this.db.prepare(query);
    const tables = stmt.all() as { name: string }[];
    
    // Get row count for each table
    return tables.map(table => {
      const countStmt = this.db!.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`);
      const result = countStmt.get() as { count: number };
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

    const stmt = this.db.prepare(`PRAGMA table_info("${tableName}")`);
    return stmt.all() as unknown as ColumnSchema[];
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

    const stmt = this.db.prepare(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`);
    return stmt.all(limit, offset) as Record<string, any>[];
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

    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const result = stmt.get() as { count: number };
    return result.count;
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
