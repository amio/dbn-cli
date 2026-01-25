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
  visibleRows: number;
  showSchema?: boolean;
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
}

/**
 * Union type for all possible view states
 */
export type ViewState = TablesViewState | TableDetailViewState | SchemaViewState | RowDetailViewState;

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
