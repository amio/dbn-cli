import type { DatabaseAdapter } from '../adapter/base.ts';
import type { ViewState, TablesViewState, TableDetailViewState, SchemaViewState, RowDetailViewState } from '../types.ts';

/**
 * Navigation state manager
 * Handles view hierarchy and cursor position
 */
export class Navigator {
  private adapter: DatabaseAdapter;
  private states: ViewState[] = [];
  private currentState: ViewState | null = null;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  /**
   * Initialize navigator with tables list view
   */
  init(): void {
    const tables = this.adapter.getTables();
    this.currentState = {
      type: 'tables',
      tables: tables,
      cursor: 0,
      scrollOffset: 0
    } as TablesViewState;
    this.states = [this.currentState];
  }

  /**
   * Get current view state
   * @returns Current view state
   */
  getState(): ViewState {
    if (!this.currentState) {
      throw new Error('Navigator not initialized');
    }
    return this.currentState;
  }

  /**
   * Move cursor up
   */
  moveUp(): void {
    const state = this.currentState;
    if (!state) return;
    
    if (state.type === 'tables') {
      if (state.cursor > 0) {
        state.cursor--;
      }
    } else if (state.type === 'table-detail') {
      if (state.dataCursor > 0) {
        state.dataCursor--;
      } else if (state.dataOffset > 0) {
        state.dataOffset--;
        // Reload data if needed
        this.reload();
      }
    } else if (state.type === 'schema-view') {
      if (state.cursor > 0) {
        state.cursor--;
      }
    }
  }

  /**
   * Move cursor down
   */
  moveDown(): void {
    const state = this.currentState;
    if (!state) return;
    
    if (state.type === 'tables') {
      if (state.cursor < state.tables.length - 1) {
        state.cursor++;
      }
    } else if (state.type === 'table-detail') {
      const maxCursor = Math.min(state.data.length - 1, state.visibleRows - 1);
      if (state.dataCursor < maxCursor) {
        state.dataCursor++;
      } else if (state.dataOffset + state.dataCursor < state.totalRows - 1) {
        state.dataOffset++;
        // Reload data if needed
        this.reload();
      }
    } else if (state.type === 'schema-view') {
      if (state.cursor < state.schema.length - 1) {
        state.cursor++;
      }
    }
  }

  /**
   * Jump to top
   */
  jumpToTop(): void {
    const state = this.currentState;
    if (!state) return;
    
    if (state.type === 'tables') {
      state.cursor = 0;
    } else if (state.type === 'table-detail') {
      state.dataOffset = 0;
      state.dataCursor = 0;
      this.reload();
    } else if (state.type === 'schema-view') {
      state.cursor = 0;
    }
  }

  /**
   * Jump to bottom
   */
  jumpToBottom(): void {
    const state = this.currentState;
    if (!state) return;
    
    if (state.type === 'tables') {
      state.cursor = state.tables.length - 1;
    } else if (state.type === 'table-detail') {
      const lastPageOffset = Math.max(0, state.totalRows - state.visibleRows);
      state.dataOffset = lastPageOffset;
      state.dataCursor = Math.min(state.visibleRows - 1, state.totalRows - 1 - lastPageOffset);
      this.reload();
    } else if (state.type === 'schema-view') {
      state.cursor = state.schema.length - 1;
    }
  }

  /**
   * Toggle schema display in table detail view
   */
  toggleSchema(): void {
    const state = this.currentState;
    if (state && state.type === 'table-detail') {
      // Toggle showSchema flag
      state.showSchema = !state.showSchema;
    }
  }

  /**
   * View schema in full screen mode
   */
  viewSchema(): void {
    const state = this.currentState;
    if (state && state.type === 'table-detail') {
      // Create full screen schema view
      const newState: SchemaViewState = {
        type: 'schema-view',
        tableName: state.tableName,
        schema: state.schema,
        cursor: 0,
        scrollOffset: 0
      };
      
      this.states.push(newState);
      this.currentState = newState;
    }
  }

  /**
   * Enter the selected item (go deeper in hierarchy)
   */
  enter(): void {
    const state = this.currentState;
    if (!state) return;
    
    if (state.type === 'tables') {
      const selectedTable = state.tables[state.cursor];
      if (!selectedTable) return;
      
      // Load table details
      const schema = this.adapter.getTableSchema(selectedTable.name);
      const totalRows = selectedTable.row_count;
      const data = this.adapter.getTableData(selectedTable.name, { limit: 100, offset: 0 });
      
      const newState: TableDetailViewState = {
        type: 'table-detail',
        tableName: selectedTable.name,
        schema: schema,
        data: data,
        totalRows: totalRows,
        dataOffset: 0,
        dataCursor: 0,
        visibleRows: 20, // Will be updated by renderer
        showSchema: false // Schema display toggle
      };
      
      this.states.push(newState);
      this.currentState = newState;
    } else if (state.type === 'table-detail') {
      // Enter row detail view
      if (state.data.length > 0) {
        const selectedRow = state.data[state.dataCursor];
        if (!selectedRow) return;
        
        const newState: RowDetailViewState = {
          type: 'row-detail',
          tableName: state.tableName,
          row: selectedRow,
          rowIndex: state.dataOffset + state.dataCursor,
          schema: state.schema
        };
        
        this.states.push(newState);
        this.currentState = newState;
      }
    }
  }

  /**
   * Go back to previous view
   */
  back(): void {
    if (this.states.length > 1) {
      this.states.pop();
      this.currentState = this.states[this.states.length - 1];
    }
  }

  /**
   * Reload current view data
   */
  reload(): void {
    const state = this.currentState;
    
    if (state && state.type === 'table-detail') {
      // Reload table data with current offset
      const loadOffset = Math.max(0, state.dataOffset);
      state.data = this.adapter.getTableData(state.tableName, { 
        limit: 100, 
        offset: loadOffset 
      });
    }
  }

  /**
   * Get breadcrumb path
   * @returns Breadcrumb path string
   */
  getPath(): string {
    const parts: string[] = [];
    for (const state of this.states) {
      if (state.type === 'tables') {
        // Root level, no need to add
      } else if (state.type === 'table-detail') {
        parts.push(state.tableName);
      }
    }
    return parts.length > 0 ? parts.join(' > ') : '';
  }
}
