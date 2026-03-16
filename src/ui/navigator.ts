import type { DatabaseAdapter } from '../adapter/base.ts';
import type { ViewState, TablesViewState, TableDetailViewState, SchemaViewState, RowDetailViewState, HealthViewState, ColumnSchema } from '../types.ts';
import { getVisibleWidth, formatValue } from '../utils/format.ts';
import { copyToClipboard } from '../utils/clipboard.ts';

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
   * Copy current row to clipboard as JSON
   * @param onUpdate - Callback called after notice is cleared to trigger a re-render
   */
  async copyToClipboard(onUpdate?: () => void): Promise<void> {
    const state = this.currentState;
    if (state && state.type === 'row-detail') {
      const json = JSON.stringify(state.row, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
      const success = await copyToClipboard(json);
      if (success) {
        state.notice = 'Copied to clipboard';
      } else {
        state.notice = 'Failed to copy to clipboard';
      }

      // Clear notice after 3 seconds
      setTimeout(() => {
        if (state.notice === 'Copied to clipboard' || state.notice === 'Failed to copy to clipboard') {
          state.notice = undefined;
          if (onUpdate) onUpdate();
        }
      }, 3000);
    }
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
    } else if (state.type === 'row-detail') {
      if (state.scrollOffset > 0) {
        state.scrollOffset--;
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
    } else if (state.type === 'row-detail') {
      const maxScroll = Math.max(0, state.totalLines - state.visibleHeight);
      if (state.scrollOffset < maxScroll) {
        state.scrollOffset++;
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
    } else if (state.type === 'row-detail') {
      state.scrollOffset = 0;
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
    } else if (state.type === 'row-detail') {
      state.scrollOffset = Math.max(0, state.totalLines - state.visibleHeight);
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
      const columnWeights = this.calculateColumnWeights(selectedTable.name, schema, totalRows);

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
        showSchema: false, // Schema display toggle
        columnWeights: columnWeights
      };

      this.states.push(newState);
      this.currentState = newState;
    } else if (state.type === 'table-detail') {
      // Enter row detail view
      const selectedRow = this.getSelectedRow(state);
      if (selectedRow) {
        const newState: RowDetailViewState = {
          type: 'row-detail',
          tableName: state.tableName,
          row: selectedRow,
          rowIndex: state.dataOffset + state.dataCursor,
          totalRows: state.totalRows,
          schema: state.schema,
          scrollOffset: 0,
          totalLines: 0,
          visibleHeight: 0
        };

        this.states.push(newState);
        this.currentState = newState;
      }
    }
  }

  /**
   * Switch to next record in row-detail view
   */
  nextRecord(): void {
    const state = this.currentState;
    if (state && state.type === 'row-detail') {
      if (state.rowIndex < state.totalRows - 1) {
        state.rowIndex++;
        // Fetch new row data
        const data = this.adapter.getTableData(state.tableName, { limit: 1, offset: state.rowIndex });
        if (data.length > 0) {
          state.row = data[0];
          state.scrollOffset = 0;
          this.syncParentState(state.rowIndex);
        }
      }
    }
  }

  /**
   * Switch to previous record in row-detail view
   */
  prevRecord(): void {
    const state = this.currentState;
    if (state && state.type === 'row-detail') {
      if (state.rowIndex > 0) {
        state.rowIndex--;
        // Fetch new row data
        const data = this.adapter.getTableData(state.tableName, { limit: 1, offset: state.rowIndex });
        if (data.length > 0) {
          state.row = data[0];
          state.scrollOffset = 0;
          this.syncParentState(state.rowIndex);
        }
      }
    }
  }

  /**
   * Helper to sync parent state with current row index
   */
  private syncParentState(rowIndex: number): void {
    const parent = this.states[this.states.length - 2];
    if (parent && parent.type === 'table-detail') {
      const visibleRows = parent.visibleRows || 20;

      // Try to keep the row within the visible window if possible
      const currentPos = parent.dataOffset + parent.dataCursor;
      if (rowIndex === currentPos) return;

      let newOffset = parent.dataOffset;
      let newCursor = rowIndex - newOffset;

      if (newCursor < 0) {
        newOffset = rowIndex;
        newCursor = 0;
      } else if (newCursor >= visibleRows) {
        newOffset = rowIndex - (visibleRows - 1);
        newCursor = visibleRows - 1;
      }

      parent.dataOffset = newOffset;
      parent.dataCursor = newCursor;

      // Ensure data is reloaded in parent buffer if needed
      this.reloadState(parent);
    }
  }

  /*
   * Helper to get the currently selected row from table data buffer
   */
  private getSelectedRow(state: TableDetailViewState): Record<string, any> | undefined {
    if (state.data.length === 0) return undefined;
    const bufferIndex = state.dataOffset - state.bufferOffset + state.dataCursor;
    return state.data[bufferIndex];
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
      const selectedRow = this.getSelectedRow(state);
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

      const visibleRows = state.visibleRows || 20;
      const maxOffset = Math.max(0, state.totalRows - visibleRows);
      state.dataOffset = Math.min(state.dataOffset, maxOffset);

      this.reload(true);
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

        // Sync parent cursor to the deleted row's position
        this.syncParentState(confirm.rowIndex);

        const maxOffset = Math.max(0, parent.totalRows - parent.visibleRows);
        parent.dataOffset = Math.min(parent.dataOffset, maxOffset);

        parent.deleteConfirm = undefined;
        this.states.pop();
        this.currentState = parent;
        this.reload(true);

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
    if (this.currentState) {
      this.reloadState(this.currentState, force);
    }
  }

  /**
   * Reload specific view state data
   */
  private reloadState(state: ViewState, force: boolean = false): void {
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

  /**
   * Calculate weights for each column based on type, name and sample data
   */
  private calculateColumnWeights(tableName: string, schema: ColumnSchema[], totalRows: number): number[] {
    // Fetch latest 10 rows for sampling
    const sampleSize = 10;
    const sampleData = this.adapter.getTableData(tableName, {
      limit: sampleSize,
      offset: Math.max(0, totalRows - sampleSize)
    });

    return schema.map(col => {
      // 1. Base weight by type
      let typeWeight = 15;
      const type = col.type.toUpperCase();
      if (type.includes('CHAR') || type.includes('TEXT') || type.includes('CLOB') || type.includes('BLOB')) {
        typeWeight = 20;
      } else if (type.includes('INT')) {
        typeWeight = 10;
      } else if (type.includes('TIME') || type.includes('DATE')) {
        typeWeight = 18;
      }

      // 2. Average width from sample data (with cap per row)
      let avgDataWidth = 0;
      if (sampleData.length > 0) {
        const totalWidth = sampleData.reduce((sum, row) => {
          // Cap individual row width to 50 to avoid Base64/long text outliers
          // from skewing the weight calculation for everyone else
          const valWidth = getVisibleWidth(formatValue(row[col.name]));
          return sum + Math.min(valWidth, 50);
        }, 0);
        avgDataWidth = totalWidth / sampleData.length;
      }

      // 3. Name width (capped at 20)
      const nameWidth = Math.min(getVisibleWidth(col.name), 20);

      // Final weight is max of all factors
      return Math.max(nameWidth, typeWeight, Math.ceil(avgDataWidth));
    });
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
