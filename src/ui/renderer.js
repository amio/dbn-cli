import { COLORS, BORDERS, UI } from './theme.js';
import { formatNumber, truncate, pad, formatValue, getVisibleWidth } from '../utils/format.js';

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
    
    // Calculate spacing using visible width (accounts for CJK double-width)
    const titleWidth = getVisibleWidth(title);
    const rightInfoWidth = getVisibleWidth(rightInfo);
    const availableSpace = width - titleWidth - rightInfoWidth;
    
    if (availableSpace > 0) {
      return title + ' '.repeat(availableSpace) + rightInfo;
    } else {
      // Not enough space, truncate title
      const maxTitleWidth = width - rightInfoWidth - 3; // Reserve space for "..."
      if (maxTitleWidth > 10) {
        const truncatedTitle = truncate(title.replace(/\x1b\[[0-9;]*m/g, ''), maxTitleWidth);
        const truncatedWidth = getVisibleWidth(truncatedTitle);
        const padding = width - truncatedWidth - rightInfoWidth;
        return `${COLORS.bold}${truncatedTitle}${COLORS.reset}` + ' '.repeat(Math.max(0, padding)) + rightInfo;
      } else {
        // Very narrow screen, just show title
        return truncate(title.replace(/\x1b\[[0-9;]*m/g, ''), width);
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
      
      // Build line without color codes first
      const cursorChar = isSelected ? ` ${UI.cursor}` : '  ';
      const maxNameWidth = width - 20; // Reserve space for row count
      const name = truncate(table.name, maxNameWidth - 5);
      const namePadded = pad(name, maxNameWidth - 3);
      const count = formatNumber(table.row_count) + ' rows';
      const countPadded = pad(count, 15, 'right');
      
      let content = `${cursorChar} ${namePadded} ${countPadded}`;
      
      // Ensure exact width before adding color codes
      if (content.length > width) {
        content = content.substring(0, width);
      } else if (content.length < width) {
        content += ' '.repeat(width - content.length);
      }
      
      // Apply color codes to properly sized line
      let line;
      if (isSelected) {
        line = COLORS.inverse + content + COLORS.reset;
      } else {
        line = content;
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
      
      // Calculate optimal column widths based on content
      const minColWidth = 8;
      const maxColWidth = 50; // Maximum width for any single column
      const maxVisibleCols = 8;
      const visibleColumns = columns.slice(0, maxVisibleCols);
      const availableWidth = width - 4; // Reserve space for padding and cursor
      const spacingWidth = visibleColumns.length - 1; // Space between columns
      const usableWidth = availableWidth - spacingWidth;
      
      // Calculate ideal width for each column based on content
      const idealWidths = visibleColumns.map(col => {
        // Check column name length
        let maxWidth = col.length;
        
        // Check data values length (sample first few rows for performance)
        const sampleSize = Math.min(data.length, 20);
        for (let i = 0; i < sampleSize; i++) {
          const value = formatValue(data[i][col]);
          maxWidth = Math.max(maxWidth, value.length);
        }
        
        // Apply constraints: add 2 for padding, cap at maxColWidth
        return Math.max(minColWidth, Math.min(maxWidth + 2, maxColWidth));
      });
      
      // Calculate total ideal width
      let totalIdealWidth = idealWidths.reduce((sum, w) => sum + w, 0);
      
      // Allocate widths
      const colWidths = [];
      
      if (totalIdealWidth <= usableWidth) {
        // We have extra space - distribute it intelligently
        const extraSpace = usableWidth - totalIdealWidth;
        
        // Find columns that could use more space (those at maxColWidth)
        const expandableIndices = idealWidths
          .map((w, i) => ({ width: w, index: i }))
          .filter(item => item.width === maxColWidth)
          .map(item => item.index);
        
        // Distribute extra space only to expandable columns
        if (expandableIndices.length > 0) {
          const extraPerCol = Math.floor(extraSpace / expandableIndices.length);
          for (let i = 0; i < visibleColumns.length; i++) {
            if (expandableIndices.includes(i)) {
              colWidths[i] = idealWidths[i] + extraPerCol;
            } else {
              colWidths[i] = idealWidths[i];
            }
          }
          // Add remainder to last expandable column
          const remainder = extraSpace - (extraPerCol * expandableIndices.length);
          colWidths[expandableIndices[expandableIndices.length - 1]] += remainder;
        } else {
          // No expandable columns, distribute evenly to all
          const extraPerCol = Math.floor(extraSpace / visibleColumns.length);
          for (let i = 0; i < visibleColumns.length; i++) {
            colWidths[i] = idealWidths[i] + extraPerCol;
          }
          const remainder = extraSpace - (extraPerCol * visibleColumns.length);
          colWidths[colWidths.length - 1] += remainder;
        }
      } else {
        // Need to scale down - use proportional scaling
        const scale = usableWidth / totalIdealWidth;
        for (let i = 0; i < visibleColumns.length; i++) {
          colWidths[i] = Math.max(minColWidth, Math.floor(idealWidths[i] * scale));
        }
        
        // Adjust to fill exact width
        const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
        const diff = usableWidth - totalWidth;
        if (diff !== 0) {
          colWidths[colWidths.length - 1] += diff;
        }
      }
      
      // Render table header
      const headerCells = visibleColumns.map((col, idx) => {
        const truncatedCol = truncate(col, colWidths[idx] - 1);
        return pad(truncatedCol, colWidths[idx] - 1);
      });
      
      let headerLine = `  ${COLORS.dim} ${headerCells.join(' ')}${COLORS.reset}`;
      const headerWidth = getVisibleWidth(headerLine);
      
      if (headerWidth < width) {
        headerLine += ' '.repeat(width - headerWidth);
      } else if (headerWidth > width) {
        // Truncate if somehow too wide
        const plainHeader = `   ${headerCells.map(c => c.replace(/\x1b\[[0-9;]*m/g, '')).join(' ')}`;
        headerLine = truncate(plainHeader, width);
      }
      
      lines.push(headerLine);
      
      // Update visible rows for navigator (subtract 1 for header)
      state.visibleRows = height - 1;
      
      // Render data rows
      const maxRows = Math.min(data.length, height - 1);
      
      for (let i = 0; i < maxRows; i++) {
        const row = data[i];
        const isSelected = i === dataCursor;
        
        const cells = visibleColumns.map((col, idx) => {
          const value = formatValue(row[col]);
          return truncate(value, colWidths[idx] - 1);
        });
        
        // Build content without color codes first
        const prefix = isSelected ? ` ${UI.cursor}` : '  ';
        const contentWithoutPrefix = cells.map((cell, idx) => pad(cell, colWidths[idx] - 1)).join(' ');
        
        // Ensure exact width before adding color codes (using visible width for CJK)
        let content = prefix + ' ' + contentWithoutPrefix;
        const contentWidth = getVisibleWidth(content);
        
        if (contentWidth > width) {
          content = truncate(content, width);
        } else if (contentWidth < width) {
          content = content + ' '.repeat(width - contentWidth);
        }
        
        // Apply color codes to properly sized line
        let line;
        if (isSelected) {
          line = COLORS.inverse + content + COLORS.reset;
        } else {
          line = content;
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

    if (schema.length === 0) {
      lines.push(pad('No schema information', width, 'center'));
      while (lines.length < height) {
        lines.push(' '.repeat(width));
      }
      return lines;
    }

    // Calculate visible window
    const contentHeight = height; // Use full height
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
      
      // Build content without selection color first
      const cursorChar = isSelected ? ` ${UI.cursor}` : '  ';
      const content = `${cursorChar} ${name} ${COLORS.cyan}${type}${COLORS.reset} ${COLORS.dim}${attrStr}${COLORS.reset}`;
      
      // Calculate visible width (accounting for CJK and ANSI codes)
      const contentWidth = getVisibleWidth(content);
      
      // Build line with exact width
      let line;
      if (contentWidth < width) {
        line = content + ' '.repeat(width - contentWidth);
      } else if (contentWidth > width) {
        // Need to truncate - build without colors first
        const basicContent = `${cursorChar} ${name} ${type} ${attrStr}`;
        const truncatedBasic = truncate(basicContent, width);
        line = truncatedBasic;
      } else {
        line = content;
      }
      
      // Apply inverse color for selected row (wraps entire line)
      if (isSelected) {
        line = COLORS.inverse + line + COLORS.reset;
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
    const rightMargin = 2; // Right side margin
    const valueWidth = width - maxColNameLength - 5 - rightMargin;
    
    // Display each field (one line per field)
    let lineCount = 0;
    for (const col of schema) {
      if (lineCount >= height) break;
      
      const colName = `${COLORS.cyan}${pad(col.name, maxColNameLength)}${COLORS.reset}`;
      const value = formatValue(row[col.name]);
      
      // Truncate value to fit in single line
      const truncatedValue = truncate(value, valueWidth);
      
      let line = `  ${colName} ${COLORS.dim}:${COLORS.reset} ${truncatedValue}`;
      const lineWidth = getVisibleWidth(line);
      if (lineWidth < width - rightMargin) {
        line += ' '.repeat(width - rightMargin - lineWidth);
      }
      lines.push(line);
      lineCount++;
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
      help = ' [j/k] scroll  [Enter/l] view row  [s] toggle schema  [h/Esc] back  [q] quit';
    } else if (state.type === 'schema-view') {
      help = ' [j/k] scroll  [g/G] top/bottom  [s/h/Esc] back  [q] quit';
    } else if (state.type === 'row-detail') {
      help = ' [h/Esc] back  [q] quit';
    }
    
    return pad(help, width);
  }
}
