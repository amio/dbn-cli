import { DatabaseSync } from 'node:sqlite';
import { DatabaseAdapter } from './base.js';

/**
 * SQLite adapter using Node.js 22+ built-in node:sqlite
 */
export class SQLiteAdapter extends DatabaseAdapter {
  constructor() {
    super();
    this.db = null;
    this.path = null;
  }

  /**
   * Connect to SQLite database file
   * @param {string} path - Path to the .db or .sqlite file
   */
  connect(path) {
    try {
      this.db = new DatabaseSync(path);
      this.path = path;
      // Enable WAL mode for better performance
      this.db.exec('PRAGMA journal_mode = WAL');
    } catch (error) {
      throw new Error(`Failed to open database: ${error.message}`);
    }
  }

  /**
   * Get all tables in the database
   * @returns {Array<{name: string, row_count: number}>}
   */
  getTables() {
    const query = `
      SELECT name
      FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;
    
    const stmt = this.db.prepare(query);
    const tables = stmt.all();
    
    // Get row count for each table
    return tables.map(table => {
      const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`);
      const result = countStmt.get();
      return {
        name: table.name,
        row_count: result.count
      };
    });
  }

  /**
   * Get schema information for a specific table
   * @param {string} tableName - Name of the table
   * @returns {Array<{cid: number, name: string, type: string, notnull: number, dflt_value: any, pk: number}>}
   */
  getTableSchema(tableName) {
    const stmt = this.db.prepare(`PRAGMA table_info("${tableName}")`);
    return stmt.all();
  }

  /**
   * Get data from a specific table with pagination
   * @param {string} tableName - Name of the table
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of rows to return (default: 50)
   * @param {number} options.offset - Number of rows to skip (default: 0)
   * @returns {Array<Object>}
   */
  getTableData(tableName, { limit = 50, offset = 0 } = {}) {
    const stmt = this.db.prepare(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`);
    return stmt.all(limit, offset);
  }

  /**
   * Get the total row count for a specific table
   * @param {string} tableName - Name of the table
   * @returns {number}
   */
  getRowCount(tableName) {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const result = stmt.get();
    return result.count;
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
