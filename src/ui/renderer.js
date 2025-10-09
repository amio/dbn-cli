import { COLORS, BORDERS, UI } from './theme.js';
import { formatNumber, truncate, pad, formatValue } from '../utils/format.js';

/**
 * Renderer for ncdu-style TUI
 */
export class Renderer {
  constructor(screen) {
    this.screen = screen;
  }

  /**
   * Render the current state to screen
   * @param {Object} state - Current navigation state
   * @param {string} dbPath - Database file path
   */
  render(state, dbPath) {
    const { width, height } = this.screen;
    const lines = [];

    // Build all lines
    lines.push(this.buildTitleBar(state, dbPath, width));
    lines.push(this.buildSeparator(width));
    
    const contentLines = this.buildContent(state, height - 4, width);
    lines.push(...contentLines);
    
    lines.push(this.buildSeparator(width));
    lines.push(this.buildHelpBar(state, width));

    // Clear and render
    this.screen.clear();
    this.screen.write(lines.join('\n'));
  }

  /**
   * Build title bar (top line)
   */
  buildTitleBar(state, dbPath, width) {
    const fileName = dbPath.split('/').pop();
    let title = ` ${fileName}`;
    
    if (state.type === 'table-detail') {
      title += ` ${COLORS.dim}>${COLORS.reset} ${state.tableName}`;
    } else if (state.type === 'schema-view') {
      title += ` ${COLORS.dim}>${COLORS.reset} ${state.tableName} ${COLORS.dim}> schema${COLORS.reset}`;
    } else if (state.type === 'row-detail') {
      title += ` ${COLORS.dim}>${COLORS.reset} ${state.tableName} ${COLORS.dim}> row ${state.rowIndex + 1}${COLORS.reset}`;
    }
    
    title = `${COLORS.bold}${title}${COLORS.reset}`;
    
    // Build right info
    let rightInfo = '';
    if (state.type === 'tables') {
      const totalTables = state.tables.length;
      const currentPos = state.cursor + 1;
      rightInfo = `${COLORS.dim}${currentPos}/${totalTables} tables${COLORS.reset}`;
    } else if (state.type === 'table-detail') {
      const totalRows = formatNumber(state.totalRows);
      const currentRow = state.dataOffset + state.dataCursor + 1;
      rightInfo = `${COLORS.dim}row ${formatNumber(currentRow)}/${totalRows}${COLORS.reset}`;
    } else if (state.type === 'schema-view') {
      const totalCols = state.schema.length;
      const currentPos = state.cursor + 1;
      rightInfo = `${COLORS.dim}${currentPos}/${totalCols} columns${COLORS.reset}`;
    } else if (state.type === 'row-detail') {
      const colCount = state.schema.length;
      rightInfo = `${COLORS.dim}${colCount} fields${COLORS.reset}`;
    }
    
    // Calculate spacing
    const titleClean = title.replace(/\x1b\[[0-9;]*m/g, '');
    const rightInfoClean = rightInfo.replace(/\x1b\[[0-9;]*m/g, '');
    const availableSpace = width - titleClean.length - rightInfoClean.length;
    
    if (availableSpace > 0) {
      return title + ' '.repeat(availableSpace) + rightInfo;
    } else {
      // Not enough space, truncate title
      const maxTitleWidth = width - rightInfoClean.length - 3; // Reserve space for "..."
      if (maxTitleWidth > 10) {
        const truncatedTitle = title.substring(0, maxTitleWidth) + '...';
        const padding = width - maxTitleWidth - 3 - rightInfoClean.length;
        return truncatedTitle + ' '.repeat(Math.max(0, padding)) + rightInfo;
      } else {
        // Very narrow screen, just show title
        return title.substring(0, width);
      }
    }
  }

  /**
   * Build separator line
   */
  buildSeparator(width) {
    return BORDERS.horizontal.repeat(width);
  }

  /**
   * Build main content area
   */
  buildContent(state, height, width) {
    if (state.type === 'tables') {
      return this.buildTablesList(state, height, width);
    } else if (state.type === 'table-detail') {
      return this.buildTableDetail(state, height, width);
    } else if (state.type === 'schema-view') {
      return this.buildSchemaView(state, height, width);
    } else if (state.type === 'row-detail') {
      return this.buildRowDetail(state, height, width);
    }
    return [];
  }

  /**
   * Build tables list view
   */
  buildTablesList(state, height, width) {
    const lines = [];
    const { tables, cursor } = state;

    if (tables.length === 0) {
      lines.push('');
      lines.push(pad('No tables found', width, 'center'));
      while (lines.length < height) {
        lines.push('');
      }
      return lines;
    }

    // Calculate visible window
    const halfHeight = Math.floor(height / 2);
    let startIdx = Math.max(0, cursor - halfHeight);
    let endIdx = Math.min(tables.length, startIdx + height);
    
    // Adjust if at the end
    if (endIdx - startIdx < height) {
      startIdx = Math.max(0, endIdx - height);
    }

    for (let i = startIdx; i < endIdx; i++) {
      const table = tables[i];
      const isSelected = i === cursor;
      
      // Build line: "> table_name                    1,234 rows"
      const prefix = isSelected ? `${COLORS.inverse} ${UI.cursor}` : '  ';
      const maxNameWidth = width - 20; // Reserve space for row count
      const name = truncate(table.name, maxNameWidth - 5);
      const namePadded = pad(name, maxNameWidth - 3);
      const count = formatNumber(table.row_count) + ' rows';
      const countPadded = pad(count, 15, 'right');
      
      let line = `${prefix} ${namePadded} ${countPadded}`;
      
      if (isSelected) {
        line += COLORS.reset;
      }
      
      // Ensure line doesn't exceed width
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      if (cleanLine.length > width) {
        line = line.substring(0, width);
      } else if (cleanLine.length < width) {
        line += ' '.repeat(width - cleanLine.length);
      }
      
      lines.push(line);
    }

    // Fill remaining lines
    while (lines.length < height) {
      lines.push(' '.repeat(width));
    }

    return lines;
  }

  /**
   * Build table detail view
   */
  buildTableDetail(state, height, width) {
    const lines = [];
    const { data, totalRows, dataOffset, dataCursor } = state;

    if (data.length === 0) {
      lines.push(pad('No data', width, 'center'));
    } else {
      // Get column names
      const columns = Object.keys(data[0]);
      const colWidth = Math.floor((width - 4) / Math.min(columns.length, 6));
      
      // Show up to 6 columns
      const visibleColumns = columns.slice(0, 6);
      
      // Render table header
      const headerCells = visibleColumns.map(col => {
        const truncatedCol = truncate(col, colWidth - 1);
        return pad(truncatedCol, colWidth - 1);
      });
      
      let headerLine = `  ${COLORS.bold}${COLORS.underline} ${headerCells.join(' ')}${COLORS.reset}`;
      const headerClean = headerLine.replace(/\x1b\[[0-9;]*m/g, '');
      
      if (headerClean.length < width) {
        headerLine += ' '.repeat(width - headerClean.length);
      } else {
        headerLine = headerLine.substring(0, width);
      }
      
      lines.push(headerLine);
      
      // Update visible rows for navigator (subtract 1 for header)
      state.visibleRows = height - 1;
      
      // Render data rows
      const maxRows = Math.min(data.length, height - 1);
      
      for (let i = 0; i < maxRows; i++) {
        const row = data[i];
        const isSelected = i === dataCursor;
        
        const cells = visibleColumns.map(col => {
          const value = formatValue(row[col]);
          return truncate(value, colWidth - 1);
        });
        
        const prefix = isSelected ? `${COLORS.inverse} ${UI.cursor}` : '  ';
        let line = prefix + ' ' + cells.map(cell => pad(cell, colWidth - 1)).join(' ');
        
        if (isSelected) {
          line += COLORS.reset;
        }
        
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        
        if (cleanLine.length < width) {
          line += ' '.repeat(width - cleanLine.length);
        } else {
          line = line.substring(0, width);
        }
        
        lines.push(line);
      }
    }

    // Fill remaining lines
    while (lines.length < height) {
      lines.push(' '.repeat(width));
    }

    return lines;
  }

  /**
   * Build schema view (full screen)
   */
  buildSchemaView(state, height, width) {
    const lines = [];
    const { schema, cursor, scrollOffset } = state;

    // Header
    const header = ` ${COLORS.bold}Table Schema${COLORS.reset} ${COLORS.dim}(${schema.length} columns)${COLORS.reset}`;
    const headerClean = header.replace(/\x1b\[[0-9;]*m/g, '');
    lines.push(header + ' '.repeat(Math.max(0, width - headerClean.length)));
    lines.push(' '.repeat(width));

    if (schema.length === 0) {
      lines.push(pad('No schema information', width, 'center'));
      while (lines.length < height) {
        lines.push(' '.repeat(width));
      }
      return lines;
    }

    // Calculate visible window
    const contentHeight = height - 2; // Subtract header lines
    const halfHeight = Math.floor(contentHeight / 2);
    let startIdx = Math.max(0, cursor - halfHeight);
    let endIdx = Math.min(schema.length, startIdx + contentHeight);
    
    // Adjust if at the end
    if (endIdx - startIdx < contentHeight) {
      startIdx = Math.max(0, endIdx - contentHeight);
    }

    // Calculate column widths
    const nameWidth = Math.min(30, Math.max(...schema.map(col => col.name.length)) + 2);
    const typeWidth = Math.min(20, Math.max(...schema.map(col => col.type.length)) + 2);
    const attrWidth = width - nameWidth - typeWidth - 10;

    // Render schema rows
    for (let i = startIdx; i < endIdx; i++) {
      const col = schema[i];
      const isSelected = i === cursor;
      
      const name = pad(truncate(col.name, nameWidth - 1), nameWidth);
      const type = pad(truncate(col.type, typeWidth - 1), typeWidth);
      
      // Build attributes string
      const attrs = [];
      if (col.pk) attrs.push('PK');
      if (col.notnull) attrs.push('NOT NULL');
      if (col.dflt_value !== null) attrs.push(`DEFAULT ${col.dflt_value}`);
      const attrStr = attrs.length > 0 ? truncate(attrs.join(', '), attrWidth) : '';
      
      const prefix = isSelected ? `${COLORS.inverse} ${UI.cursor}` : '  ';
      let line = `${prefix} ${name} ${COLORS.cyan}${type}${COLORS.reset} ${COLORS.dim}${attrStr}${COLORS.reset}`;
      
      if (isSelected) {
        line += COLORS.reset;
      }
      
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
      
      if (cleanLine.length < width) {
        line += ' '.repeat(width - cleanLine.length);
      } else {
        line = line.substring(0, width);
      }
      
      lines.push(line);
    }

    // Fill remaining lines
    while (lines.length < height) {
      lines.push(' '.repeat(width));
    }

    return lines;
  }

  /**
   * Build row detail view
   */
  buildRowDetail(state, height, width) {
    const lines = [];
    const { row, schema, tableName, rowIndex } = state;
    
    // Get max column name length for alignment
    const maxColNameLength = Math.max(...schema.map(col => col.name.length), 10);
    const valueWidth = width - maxColNameLength - 5;
    
    // Display each field
    let lineCount = 0;
    for (const col of schema) {
      if (lineCount >= height) break;
      
      const colName = `${COLORS.cyan}${pad(col.name, maxColNameLength)}${COLORS.reset}`;
      const colNameClean = col.name;
      const value = formatValue(row[col.name]);
      
      // Handle multi-line values
      if (value.length > valueWidth) {
        // Split into multiple lines
        const chunks = [];
        for (let i = 0; i < value.length; i += valueWidth) {
          chunks.push(value.substring(i, i + valueWidth));
        }
        
        // First line with column name
        let line = `  ${colName} ${COLORS.dim}:${COLORS.reset} ${chunks[0]}`;
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        if (cleanLine.length < width) {
          line += ' '.repeat(width - cleanLine.length);
        }
        lines.push(line);
        lineCount++;
        
        // Additional lines (indented)
        for (let i = 1; i < chunks.length && lineCount < height; i++) {
          let continueLine = ' '.repeat(maxColNameLength + 5) + chunks[i];
          if (continueLine.length < width) {
            continueLine += ' '.repeat(width - continueLine.length);
          }
          lines.push(continueLine);
          lineCount++;
        }
      } else {
        let line = `  ${colName} ${COLORS.dim}:${COLORS.reset} ${value}`;
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        if (cleanLine.length < width) {
          line += ' '.repeat(width - cleanLine.length);
        }
        lines.push(line);
        lineCount++;
      }
    }
    
    // Fill remaining lines
    while (lines.length < height) {
      lines.push(' '.repeat(width));
    }
    
    return lines;
  }

  /**
   * Build help bar (bottom line)
   */
  buildHelpBar(state, width) {
    let help = '';
    
    if (state.type === 'tables') {
      help = ' [j/k] select  [Enter/l] open  [g/G] top/bottom  [q] quit';
    } else if (state.type === 'table-detail') {
      help = ' [j/k] scroll  [Enter/l] view row  [s] view schema  [h/Esc] back  [q] quit';
    } else if (state.type === 'schema-view') {
      help = ' [j/k] scroll  [g/G] top/bottom  [h/Esc] back  [q] quit';
    } else if (state.type === 'row-detail') {
      help = ' [h/Esc] back  [q] quit';
    }
    
    return pad(help, width);
  }
}
