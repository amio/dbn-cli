import type { DatabaseAdapter } from '../adapter/base.ts';
import type { ViewState, TablesViewState, TableDetailViewState, SchemaViewState, RowDetailViewState, HealthViewState } from '../types.ts';

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
   * Move down by one full page
   */
  pageDown(): void {
    const state = this.currentState;
    if (!state || state.type !== 'table-detail') return;

    const pageSize = state.visibleRows;
    const maxOffset = Math.max(0, state.totalRows - pageSize);

    if (state.dataOffset < maxOffset) {
      state.dataOffset = Math.min(maxOffset, state.dataOffset + pageSize);
      this.reload();
    } else {
      // Already at the last page, move cursor to the very last row
      state.dataCursor = Math.min(state.totalRows - state.dataOffset - 1, pageSize - 1);
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
      const data = this.adapter.getTableData(selectedTable.name, { limit: 500, offset: 0 });
      
      const newState: TableDetailViewState = {
        type: 'table-detail',
        tableName: selectedTable.name,
        schema: schema,
        data: data,
        totalRows: totalRows,
        dataOffset: 0,
        dataCursor: 0,
        bufferOffset: 0,
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
   * View core health overview
   */
  viewHealth(): void {
    const state = this.currentState;
    if (!state || state.type !== 'tables') return;

    const info = this.adapter.getHealthInfo();
    const newState: HealthViewState = {
      type: 'health',
      info
    };

    this.states.push(newState);
    this.currentState = newState;
  }

  /**
   * Request delete for the currently selected row
   */
  requestDelete(): void {
    const state = this.currentState;
    if (!state) return;

    if (state.type === 'table-detail') {
      state.deleteConfirm = undefined;
      if (state.data.length === 0) {
        state.notice = 'No row selected';
        return;
      }

      const selectedRow = state.data[state.dataCursor];
      if (!selectedRow) {
        state.notice = 'No row selected';
        return;
      }

      const result = this.getPrimaryKeyValues(state.schema, selectedRow);
      if ('error' in result) {
        state.notice = result.error;
        return;
      }

      state.deleteConfirm = {
        tableName: state.tableName,
        rowIndex: state.dataOffset + state.dataCursor,
        keyValues: result.keyValues,
        step: 1
      };
      state.notice = `Delete row ${state.dataOffset + state.dataCursor + 1}? Press y`;
    } else if (state.type === 'row-detail') {
      state.deleteConfirm = undefined;
      const result = this.getPrimaryKeyValues(state.schema, state.row);
      if ('error' in result) {
        state.notice = result.error;
        return;
      }

      state.deleteConfirm = {
        tableName: state.tableName,
        rowIndex: state.rowIndex,
        keyValues: result.keyValues,
        step: 1
      };
      state.notice = `Delete row ${state.rowIndex + 1}? Press y`;
    }
  }

  /**
   * Confirm delete (multi-step)
   */
  confirmDelete(): void {
    const state = this.currentState;
    if (!state) return;

    if (state.type === 'table-detail' && state.deleteConfirm) {
      const confirm = state.deleteConfirm;

      if (confirm.step === 1) {
        state.deleteConfirm = { ...confirm, step: 2 };
        state.notice = `Delete row ${confirm.rowIndex + 1}? Press y again`;
        return;
      }

      try {
        this.adapter.deleteRow(confirm.tableName, confirm.keyValues);
      } catch (error) {
        state.notice = `Delete failed: ${(error as Error).message}`;
        state.deleteConfirm = undefined;
        return;
      }

      state.deleteConfirm = undefined;
      state.notice = `Row ${confirm.rowIndex + 1} deleted`;
      state.totalRows = this.adapter.getRowCount(state.tableName);

      const maxOffset = Math.max(0, state.totalRows - state.visibleRows);
      state.dataOffset = Math.min(state.dataOffset, maxOffset);

      this.reload();
      if (state.dataCursor >= state.data.length) {
        state.dataCursor = Math.max(0, state.data.length - 1);
      }
    } else if (state.type === 'row-detail' && state.deleteConfirm) {
      const confirm = state.deleteConfirm;

      if (confirm.step === 1) {
        state.deleteConfirm = { ...confirm, step: 2 };
        state.notice = `Delete row ${confirm.rowIndex + 1}? Press y again`;
        return;
      }

      try {
        this.adapter.deleteRow(confirm.tableName, confirm.keyValues);
      } catch (error) {
        state.notice = `Delete failed: ${(error as Error).message}`;
        state.deleteConfirm = undefined;
        return;
      }

      const parent = this.states[this.states.length - 2];
      if (parent && parent.type === 'table-detail') {
        parent.notice = `Row ${confirm.rowIndex + 1} deleted`;
        parent.totalRows = this.adapter.getRowCount(parent.tableName);

        const maxOffset = Math.max(0, parent.totalRows - parent.visibleRows);
        parent.dataOffset = Math.min(parent.dataOffset, maxOffset);

        parent.deleteConfirm = undefined;
        this.states.pop();
        this.currentState = parent;
        this.reload();

        if (parent.dataCursor >= parent.data.length) {
          parent.dataCursor = Math.max(0, parent.data.length - 1);
        }
      } else {
        state.notice = `Row ${confirm.rowIndex + 1} deleted`;
        state.deleteConfirm = undefined;
      }
    }
  }

  /**
   * Cancel delete confirmation
   */
  cancelDelete(): void {
    const state = this.currentState;
    if (!state) return;

    if (state.type === 'table-detail' && state.deleteConfirm) {
      state.deleteConfirm = undefined;
      state.notice = 'Delete cancelled';
    } else if (state.type === 'row-detail' && state.deleteConfirm) {
      state.deleteConfirm = undefined;
      state.notice = 'Delete cancelled';
    }
  }

  /**
   * Check if the current view is awaiting delete confirmation
   */
  hasPendingDelete(): boolean {
    const state = this.currentState;
    if (!state) return false;

    if (state.type === 'table-detail' || state.type === 'row-detail') {
      return Boolean(state.deleteConfirm);
    }

    return false;
  }

  /**
   * Reload current view data
   */
  reload(force: boolean = false): void {
    const state = this.currentState;
    
    if (state && state.type === 'table-detail') {
      const bufferSize = 500;
      const currentPos = state.dataOffset + state.dataCursor;

      // Check if we need to reload data
      const needsReload = force ||
        state.data.length === 0 ||
        currentPos < state.bufferOffset ||
        currentPos >= state.bufferOffset + state.data.length;

      if (needsReload) {
        // Calculate new buffer offset to keep current view in middle if possible
        const halfBuffer = Math.floor(bufferSize / 2);
        const newBufferOffset = Math.max(0, Math.min(
          currentPos - halfBuffer,
          state.totalRows - bufferSize
        ));

        state.data = this.adapter.getTableData(state.tableName, {
          limit: bufferSize,
          offset: newBufferOffset
        });
        state.bufferOffset = newBufferOffset;
      }
    }
  }

  private getPrimaryKeyValues(
    schema: TableDetailViewState['schema'],
    row: Record<string, any>
  ): { keyValues: Record<string, any> } | { error: string } {
    const pkColumns = schema
      .filter(col => col.pk)
      .sort((a, b) => a.pk - b.pk);
    if (pkColumns.length === 0) {
      return { error: 'Cannot delete: table has no primary key' };
    }

    const keyValues: Record<string, any> = {};
    for (const col of pkColumns) {
      if (!(col.name in row)) {
        return { error: `Cannot delete: missing primary key value for ${col.name}` };
      }
      keyValues[col.name] = row[col.name];
    }

    return { keyValues };
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
