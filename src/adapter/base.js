/**
 * Base class for database adapters
 * Defines the interface that all database adapters must implement
 */
export class DatabaseAdapter {
  /**
   * Connect to the database
   * @param {string} path - Path to the database file or connection string
   */
  connect(path) {
    throw new Error('connect() must be implemented');
  }

  /**
   * Get all tables in the database
   * @returns {Array<{name: string, row_count: number}>}
   */
  getTables() {
    throw new Error('getTables() must be implemented');
  }

  /**
   * Get schema information for a specific table
   * @param {string} tableName - Name of the table
   * @returns {Array<{name: string, type: string, notnull: number, dflt_value: any, pk: number}>}
   */
  getTableSchema(tableName) {
    throw new Error('getTableSchema() must be implemented');
  }

  /**
   * Get data from a specific table with pagination
   * @param {string} tableName - Name of the table
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of rows to return
   * @param {number} options.offset - Number of rows to skip
   * @returns {Array<Object>}
   */
  getTableData(tableName, options = {}) {
    throw new Error('getTableData() must be implemented');
  }

  /**
   * Get the total row count for a specific table
   * @param {string} tableName - Name of the table
   * @returns {number}
   */
  getRowCount(tableName) {
    throw new Error('getRowCount() must be implemented');
  }

  /**
   * Close the database connection
   */
  close() {
    throw new Error('close() must be implemented');
  }
}
