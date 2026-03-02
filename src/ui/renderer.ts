import { COLORS, BORDERS, UI } from './theme.ts';
import { formatNumber, truncate, pad, formatValue, getVisibleWidth } from '../utils/format.ts';
import type { Screen } from './screen.ts';
import type { ViewState, TablesViewState, TableDetailViewState, SchemaViewState, RowDetailViewState, HealthViewState } from '../types.ts';

/**
 * Renderer for ncdu-style TUI
 */
export class Renderer {
  private screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  /**
   * Render the current state to screen
   * @param state - Current navigation state
   * @param dbPath - Database file path
   */
  render(state: ViewState, dbPath: string): void {
    const { width, height } = this.screen;
    const lines: string[] = [];

    // Build all lines
    lines.push(this.buildTitleBar(state, dbPath, width));
    lines.push(this.buildSeparator(width));
    
    const contentLines = this.buildContent(state, height - 3, width);
    lines.push(...contentLines);
    
    lines.push(this.buildHelpBar(state, width));

    // Clear and render
    this.screen.clear();
    this.screen.write(lines.join('\n'));
  }

  /**
   * Build title bar (top line)
   */
  private buildTitleBar(state: ViewState, dbPath: string, width: number): string {
    const fileName = dbPath.split('/').pop() || dbPath;
    let title = ` ${fileName}`;
    
    if (state.type === 'table-detail') {
      title += ` ${COLORS.dim}>${COLORS.reset} ${state.tableName}`;
    } else if (state.type === 'schema-view') {
      title += ` ${COLORS.dim}>${COLORS.reset} ${state.tableName} ${COLORS.dim}> schema${COLORS.reset}`;
    } else if (state.type === 'row-detail') {
      title += ` ${COLORS.dim}>${COLORS.reset} ${state.tableName} ${COLORS.dim}> row ${state.rowIndex + 1}${COLORS.reset}`;
    } else if (state.type === 'health') {
      title += ` ${COLORS.dim}>${COLORS.reset} health`;
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
    } else if (state.type === 'health') {
      rightInfo = `${COLORS.dim}overview${COLORS.reset}`;
    }
    
    // Calculate spacing using visible width (accounts for CJK double-width)
    const titleWidth = getVisibleWidth(title);
    const rightInfoWidth = getVisibleWidth(rightInfo);
    const availableSpace = width - titleWidth - rightInfoWidth;
    
    // Adjust width to prevent wrapping issues with ambiguous width characters
    const safeWidth = width - 1;

    if (availableSpace > 0) {
      // Ensure we don't exceed safeWidth
      let result = title + ' '.repeat(availableSpace) + rightInfo;
      const resultWidth = getVisibleWidth(result);
      if (resultWidth > safeWidth) {
        return truncate(result, safeWidth);
      }
      return result;
    } else {
      // Not enough space, truncate title
      const maxTitleWidth = safeWidth - rightInfoWidth - 3; // Reserve space for "..."
      if (maxTitleWidth > 10) {
        const truncatedTitle = truncate(title.replace(/\x1b\[[0-9;]*m/g, ''), maxTitleWidth);
        const truncatedWidth = getVisibleWidth(truncatedTitle);
        const padding = safeWidth - truncatedWidth - rightInfoWidth;
        return `${COLORS.bold}${truncatedTitle}${COLORS.reset}` + ' '.repeat(Math.max(0, padding)) + rightInfo;
      } else {
        // Very narrow screen, just show title
        return truncate(title.replace(/\x1b\[[0-9;]*m/g, ''), safeWidth);
      }
    }
  }

  /**
   * Build separator line
   */
  private buildSeparator(width: number): string {
    return `${COLORS.dim}${BORDERS.horizontal.repeat(width)}${COLORS.reset}`;
  }

  /**
   * Build main content area
   */
  private buildContent(state: ViewState, height: number, width: number): string[] {
    if (state.type === 'tables') {
      return this.buildTablesList(state, height, width);
    } else if (state.type === 'table-detail') {
      return this.buildTableDetail(state, height, width);
    } else if (state.type === 'schema-view') {
      return this.buildSchemaView(state, height, width);
    } else if (state.type === 'row-detail') {
      return this.buildRowDetail(state, height, width);
    } else if (state.type === 'health') {
      return this.buildHealthView(state, height, width);
    }
    return [];
  }

  /**
   * Build tables list view
   */
  private buildTablesList(state: TablesViewState, height: number, width: number): string[] {
    const lines: string[] = [];
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
      const safeWidth = width - 1; // Subtract 1 to prevent wrapping issues
      const contentWidth = getVisibleWidth(content);
      if (contentWidth > safeWidth) {
        content = truncate(content, safeWidth);
      } else if (contentWidth < safeWidth) {
        content += ' '.repeat(safeWidth - contentWidth);
      }
      
      // Apply color codes to properly sized line
      let line: string;
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
  private buildTableDetail(state: TableDetailViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const { data, totalRows, dataOffset, dataCursor, bufferOffset } = state;

    if (data.length === 0) {
      lines.push(pad('No data', width, 'center'));
    } else {
      // Correct for buffered data: the data array contains bufferOffset..bufferOffset + data.length
      // We want to display starting from dataOffset
      const relativeOffset = dataOffset - bufferOffset;
      const displayData = data.slice(relativeOffset, relativeOffset + height);

      if (displayData.length === 0) {
        lines.push(pad('No data in this range', width, 'center'));
        return lines;
      }

      // Get column names
      const columns = Object.keys(displayData[0]);
      const maxVisibleCols = 8;
      const visibleColumns = columns.slice(0, maxVisibleCols);

      // Try to use cached column widths
      let colWidths: number[];
      if (state.cachedColWidths && state.cachedScreenWidth === width) {
        colWidths = state.cachedColWidths;
      } else {
        // Calculate optimal column widths based on content
        const minColWidth = 8;
        const maxColWidth = 50; // Maximum width for any single column
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
            // Use 50 as a hint for formatValue during width calculation
            const value = formatValue(data[i][col], 50);
            maxWidth = Math.max(maxWidth, value.length);
          }

          // Apply constraints: add 2 for padding, cap at maxColWidth
          return Math.max(minColWidth, Math.min(maxWidth + 2, maxColWidth));
        });
        
        // Calculate total ideal width
        let totalIdealWidth = idealWidths.reduce((sum, w) => sum + w, 0);
        
        // Allocate widths
        colWidths = [];
        
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

        // Cache the results
        state.cachedColWidths = colWidths;
        state.cachedScreenWidth = width;
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
      const maxRows = Math.min(displayData.length, height - 1);
      
      for (let i = 0; i < maxRows; i++) {
        const row = displayData[i];
        const isSelected = i === dataCursor;
        
        const cells = visibleColumns.map((col, idx) => {
          const value = formatValue(row[col], colWidths[idx]);
          return truncate(value, colWidths[idx] - 1);
        });
        
        // Build content without color codes first
        const prefix = isSelected ? ` ${UI.cursor}` : '  ';
        const contentWithoutPrefix = cells.map((cell, idx) => pad(cell, colWidths[idx] - 1)).join(' ');
        
        // Ensure exact width before adding color codes (using visible width for CJK)
        const safeWidth = width - 1; // Subtract 1 to prevent wrapping issues
        let content = prefix + ' ' + contentWithoutPrefix;
        const contentWidth = getVisibleWidth(content);
        
        if (contentWidth > safeWidth) {
          content = truncate(content, safeWidth);
        } else if (contentWidth < safeWidth) {
          content += ' '.repeat(safeWidth - contentWidth);
        }
        
        // Apply color codes to properly sized line
        let line: string;
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
  private buildSchemaView(state: SchemaViewState, height: number, width: number): string[] {
    const lines: string[] = [];
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
      const attrs: string[] = [];
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
      const safeWidth = width - 1; // Subtract 1 to prevent wrapping issues
      let line: string;
      if (contentWidth < safeWidth) {
        line = content + ' '.repeat(safeWidth - contentWidth);
      } else if (contentWidth > safeWidth) {
        // Need to truncate - build without colors first
        const basicContent = `${cursorChar} ${name} ${type} ${attrStr}`;
        const truncatedBasic = truncate(basicContent, safeWidth);
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
  private buildRowDetail(state: RowDetailViewState, height: number, width: number): string[] {
    const lines: string[] = [];
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
      const value = formatValue(row[col.name], valueWidth);
      
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
   * Build health overview view
   */
  private buildHealthView(state: HealthViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const { info } = state;

    const title = `${COLORS.bold}Core health overview${COLORS.reset}`;
    lines.push(pad(title, width));

    const formatBool = (value: string): string => (value === '1' ? 'on' : value === '0' ? 'off' : value);
    const formatAutoVacuum = (value: string): string => {
      if (value === '0') return 'none';
      if (value === '1') return 'full';
      if (value === '2') return 'incremental';
      return value;
    };

    const entries: Array<[string, string]> = [
      ['SQLite version', info.sqlite_version],
      ['Journal mode', info.journal_mode],
      ['Synchronous', info.synchronous],
      ['Locking mode', info.locking_mode],
      ['Page size', formatNumber(info.page_size)],
      ['Page count', formatNumber(info.page_count)],
      ['Freelist pages', formatNumber(info.freelist_count)],
      ['Cache size', formatNumber(info.cache_size)],
      ['WAL autocheckpoint', formatNumber(info.wal_autocheckpoint)],
      ['Auto vacuum', formatAutoVacuum(info.auto_vacuum)],
      ['User version', String(info.user_version)],
      ['Application id', String(info.application_id)],
      ['Encoding', info.encoding],
      ['Foreign keys', formatBool(info.foreign_keys)],
      ['Temp store', info.temp_store],
      ['Mmap size', formatNumber(info.mmap_size)],
      ['Busy timeout', `${formatNumber(info.busy_timeout)} ms`]
    ];

    const labelWidth = Math.min(24, Math.max(...entries.map(([label]) => label.length)) + 1);
    const contentWidth = width - labelWidth - 4;

    for (const [label, value] of entries) {
      if (lines.length >= height) break;
      const labelText = pad(label, labelWidth, 'right');
      const valueText = truncate(value, contentWidth);
      const line = ` ${COLORS.cyan}${labelText}${COLORS.reset} ${COLORS.dim}:${COLORS.reset} ${valueText}`;
      const lineWidth = getVisibleWidth(line);
      if (lineWidth < width) {
        lines.push(line + ' '.repeat(width - lineWidth));
      } else {
        const basicLine = ` ${labelText} : ${valueText}`;
        lines.push(truncate(basicLine, width - 1));
      }
    }

    while (lines.length < height) {
      lines.push(' '.repeat(width));
    }

    return lines;
  }

  /**
   * Build help bar (bottom line)
   */
  private buildHelpBar(state: ViewState, width: number): string {
    let help = '';
    const notice =
      (state.type === 'table-detail' || state.type === 'row-detail') ? state.notice : undefined;
    const deleteStep =
      (state.type === 'table-detail' || state.type === 'row-detail') ? state.deleteConfirm?.step : undefined;
    const isDeleteConfirm =
      (state.type === 'table-detail' || state.type === 'row-detail') ? Boolean(state.deleteConfirm) : false;
    
    if (notice && isDeleteConfirm) {
      const stepLabel = deleteStep ? `Step ${deleteStep}/2` : '';
      const actionLabel = deleteStep === 2 ? 'delete' : 'confirm';
      help = ` ${COLORS.red}${COLORS.bold}${stepLabel ? `${stepLabel} ` : ''}${notice}${COLORS.reset}  ${COLORS.yellow}[y] ${actionLabel}${COLORS.reset}  [h/Esc] cancel`;
      const paddedHelp = pad(help, width);
      return paddedHelp;
    } else if (notice) {
      help = ` ${COLORS.yellow}${notice}${COLORS.reset}`;
      const paddedHelp = pad(help, width);
      return paddedHelp;
    } else if (state.type === 'tables') {
      help = ' [j/k] select  [Enter/l] open  [i] info  [g/G] top/bottom  [q] quit';
    } else if (state.type === 'table-detail') {
      help = ' [j/k] scroll  [Enter/l] view row  [Backspace] delete  [s] toggle schema  [h/Esc] back  [q] quit';
    } else if (state.type === 'schema-view') {
      help = ' [j/k] scroll  [g/G] top/bottom  [s/h/Esc] back  [q] quit';
    } else if (state.type === 'row-detail') {
      help = ' [Backspace] delete  [h/Esc] back  [q] quit';
    } else if (state.type === 'health') {
      help = ' [i] back  [h/Esc] back  [q] quit';
    }
    
    const paddedHelp = pad(help, width);
    return `${COLORS.dim}${paddedHelp}${COLORS.reset}`;
  }
}
