/**
 * Navigation state manager
 * Handles view hierarchy and cursor position
 */
export class Navigator {
  constructor(adapter) {
    this.adapter = adapter;
    this.states = []; // Stack of view states
    this.currentState = null;
  }

  /**
   * Initialize navigator with tables list view
   */
  init() {
    const tables = this.adapter.getTables();
    this.currentState = {
      type: 'tables',
      tables: tables,
      cursor: 0,
      scrollOffset: 0
    };
    this.states = [this.currentState];
  }

  /**
   * Get current view state
   * @returns {Object}
   */
  getState() {
    return this.currentState;
  }

  /**
   * Move cursor up
   */
  moveUp() {
    const state = this.currentState;
    
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
  moveDown() {
    const state = this.currentState;
    
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
  jumpToTop() {
    const state = this.currentState;
    
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
  jumpToBottom() {
    const state = this.currentState;
    
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
   * View schema in full screen mode
   */
  viewSchema() {
    const state = this.currentState;
    if (state.type === 'table-detail') {
      // Create full screen schema view
      const newState = {
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
  enter() {
    const state = this.currentState;
    
    if (state.type === 'tables') {
      const selectedTable = state.tables[state.cursor];
      if (!selectedTable) return;
      
      // Load table details
      const schema = this.adapter.getTableSchema(selectedTable.name);
      const totalRows = selectedTable.row_count;
      const data = this.adapter.getTableData(selectedTable.name, { limit: 100, offset: 0 });
      
      const newState = {
        type: 'table-detail',
        tableName: selectedTable.name,
        schema: schema,
        data: data,
        totalRows: totalRows,
        dataOffset: 0,
        dataCursor: 0,
        visibleRows: 20 // Will be updated by renderer
      };
      
      this.states.push(newState);
      this.currentState = newState;
    } else if (state.type === 'table-detail') {
      // Enter row detail view
      if (state.data.length > 0) {
        const selectedRow = state.data[state.dataCursor];
        if (!selectedRow) return;
        
        const newState = {
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
  back() {
    if (this.states.length > 1) {
      this.states.pop();
      this.currentState = this.states[this.states.length - 1];
    }
  }

  /**
   * Reload current view data
   */
  reload() {
    const state = this.currentState;
    
    if (state.type === 'table-detail') {
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
   * @returns {string}
   */
  getPath() {
    const parts = [];
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
