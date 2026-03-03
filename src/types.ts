/**
 * Type definitions for DBPeek
 */

/**
 * Table metadata
 */
export interface TableInfo {
  name: string;
  row_count: number;
}

/**
 * Column schema information
 */
export interface ColumnSchema {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

/**
 * Query options for fetching table data
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
}

/**
 * Core database health overview info
 */
export interface HealthInfo {
  sqlite_version: string;
  journal_mode: string;
  synchronous: string;
  locking_mode: string;
  page_size: number;
  page_count: number;
  freelist_count: number;
  cache_size: number;
  wal_autocheckpoint: number;
  auto_vacuum: string;
  user_version: number;
  application_id: number;
  encoding: string;
  foreign_keys: string;
  temp_store: string;
  mmap_size: number;
  busy_timeout: number;
}

/**
 * Delete confirmation state for write actions
 */
export interface DeleteConfirmationState {
  tableName: string;
  rowIndex: number;
  keyValues: Record<string, any>;
  step: 1 | 2;
}

/**
 * Base view state properties
 */
interface BaseViewState {
  type: string;
}

/**
 * Tables list view state
 */
export interface TablesViewState extends BaseViewState {
  type: 'tables';
  tables: TableInfo[];
  cursor: number;
  scrollOffset: number;
}

/**
 * Table detail view state
 */
export interface TableDetailViewState extends BaseViewState {
  type: 'table-detail';
  tableName: string;
  schema: ColumnSchema[];
  data: Record<string, any>[];
  totalRows: number;
  dataOffset: number;
  dataCursor: number;
  bufferOffset: number;
  visibleRows: number;
  showSchema?: boolean;
  deleteConfirm?: DeleteConfirmationState;
  notice?: string;
  columnWeights?: number[];
  cachedColWidths?: number[];
  cachedScreenWidth?: number;
}

/**
 * Schema view state (full screen schema display)
 */
export interface SchemaViewState extends BaseViewState {
  type: 'schema-view';
  tableName: string;
  schema: ColumnSchema[];
  cursor: number;
  scrollOffset: number;
}

/**
 * Row detail view state
 */
export interface RowDetailViewState extends BaseViewState {
  type: 'row-detail';
  tableName: string;
  row: Record<string, any>;
  rowIndex: number;
  schema: ColumnSchema[];
  deleteConfirm?: DeleteConfirmationState;
  notice?: string;
}

/**
 * Health overview view state
 */
export interface HealthViewState extends BaseViewState {
  type: 'health';
  info: HealthInfo;
}

/**
 * Union type for all possible view states
 */
export type ViewState = TablesViewState | TableDetailViewState | SchemaViewState | RowDetailViewState | HealthViewState;

/**
 * Screen dimensions
 */
export interface ScreenDimensions {
  width: number;
  height: number;
}

/**
 * Keypress event from readline
 */
export interface KeyPress {
  name: string;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
  sequence: string;
}
