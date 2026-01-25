import type { TableInfo, ColumnSchema, QueryOptions, HealthInfo } from '../types.ts';

/**
 * Base class for database adapters
 * Defines the interface that all database adapters must implement
 */
export abstract class DatabaseAdapter {
  /**
   * Connect to the database
   * @param path - Path to the database file or connection string
   */
  abstract connect(path: string): void;

  /**
   * Get all tables in the database
   * @returns Array of table information
   */
  abstract getTables(): TableInfo[];

  /**
   * Get schema information for a specific table
   * @param tableName - Name of the table
   * @returns Array of column schema information
   */
  abstract getTableSchema(tableName: string): ColumnSchema[];

  /**
   * Get data from a specific table with pagination
   * @param tableName - Name of the table
   * @param options - Query options
   * @returns Array of row objects
   */
  abstract getTableData(tableName: string, options?: QueryOptions): Record<string, any>[];

  /**
   * Get the total row count for a specific table
   * @param tableName - Name of the table
   * @returns Total number of rows
   */
  abstract getRowCount(tableName: string): number;

  /**
   * Get core database health info
   * @returns Health information
   */
  abstract getHealthInfo(): HealthInfo;

  /**
   * Close the database connection
   */
  abstract close(): void;
}
