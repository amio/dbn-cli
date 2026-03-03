import { THEME, ANSI } from './theme.ts';
import { formatNumber, truncate, pad, formatValue, getVisibleWidth } from '../utils/format.ts';
import type { Screen } from './screen.ts';
import type { ViewState, TablesViewState, TableDetailViewState, SchemaViewState, RowDetailViewState, HealthViewState } from '../types.ts';

/**
 * Modern Renderer (Manual ANSI Implementation)
 * Emulates OpenTUI/OpenCode design with color blocks and no lines.
 */
export class Renderer {
  private screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  private drawTransition(width: number, topBg: string, bottomBg: string): string {
    return `${ANSI.fg(topBg)}${ANSI.bg(bottomBg)}${ANSI.blockUpper.repeat(width)}${ANSI.reset}`;
  }

  private renderPanelLine(content: string, width: number, bg: string): string {
    const padding = ' ';
    const innerWidth = width - 2;
    const contentLen = getVisibleWidth(content);
    const fill = ' '.repeat(Math.max(0, innerWidth - contentLen));
    return `${ANSI.bg(bg)}${padding}${content}${fill}${padding}${ANSI.reset}`;
  }

  /**
   * Render the current state to screen
   */
  render(state: ViewState, dbPath: string): void {
    const { width, height } = this.screen;
    const lines: string[] = [];

    // Header transition color can match table header if in table-detail
    const contentTopBg = state.type === 'table-detail' ? THEME.surface : THEME.background;

    // 1. Title Bar (Header Block)
    lines.push(this.buildTitleBar(state, dbPath, width));
    lines.push(this.drawTransition(width, THEME.headerBg, contentTopBg));

    // 2. Main Content area
    const contentHeight = height - 4; // 1 header, 1 footer, 2 transitions
    const contentLines = this.buildContent(state, contentHeight, width);
    lines.push(...contentLines);

    // 3. Help/Status Bar (Footer Block)
    lines.push(this.drawTransition(width, THEME.background, THEME.footerBg));
    lines.push(this.buildHelpBar(state, width));

    // Clear and render
    this.screen.clear();
    this.screen.write(lines.join('\n'));
  }

  private buildTitleBar(state: ViewState, dbPath: string, width: number): string {
    const fileName = dbPath.split('/').pop() || dbPath;
    let breadcrumb = ` ${fileName}`;
    
    if (state.type === 'table-detail' || state.type === 'schema-view' || state.type === 'row-detail') {
      breadcrumb += ` > ${state.tableName}`;
    }
    if (state.type === 'schema-view') breadcrumb += ` > schema`;
    if (state.type === 'row-detail') breadcrumb += ` > row ${state.rowIndex + 1}`;
    if (state.type === 'health') breadcrumb += ` > health`;

    const leftPart = `${ANSI.bold}${ANSI.fg(THEME.primary)}${breadcrumb}${ANSI.reset}`;

    let rightPart = '';
    if (state.type === 'tables') {
      rightPart = `${state.cursor + 1}/${state.tables.length} tables `;
    } else if (state.type === 'table-detail') {
      const current = state.dataOffset + state.dataCursor + 1;
      rightPart = `row ${formatNumber(current)}/${formatNumber(state.totalRows)} `;
    } else if (state.type === 'schema-view') {
      rightPart = `${state.cursor + 1}/${state.schema.length} columns `;
    } else if (state.type === 'row-detail') {
      rightPart = `${state.schema.length} fields `;
    }

    const rightPartStyled = `${ANSI.fg(THEME.textDim)}${rightPart}${ANSI.reset}`;

    const leftLen = getVisibleWidth(leftPart);
    const rightLen = getVisibleWidth(rightPartStyled);
    const padding = Math.max(0, width - leftLen - rightLen);

    return `${ANSI.bg(THEME.headerBg)}${leftPart}${' '.repeat(padding)}${rightPartStyled}${ANSI.reset}`;
  }

  private buildContent(state: ViewState, height: number, width: number): string[] {
    let content: string[] = [];

    if (state.type === 'tables') {
      content = this.renderTables(state, height, width);
    } else if (state.type === 'table-detail') {
      content = this.renderTableDetail(state, height, width);
    } else if (state.type === 'schema-view') {
      content = this.renderSchema(state, height, width);
    } else if (state.type === 'row-detail') {
      content = this.renderRowDetail(state, height, width);
    } else if (state.type === 'health') {
      content = this.renderHealth(state, height, width);
    }

    // Fill remaining lines with background
    while (content.length < height) {
      content.push(this.renderPanelLine('', width, THEME.background));
    }
    return content;
  }

  private renderTables(state: TablesViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const { tables, cursor } = state;

    const half = Math.floor(height / 2);
    let start = Math.max(0, cursor - half);
    let end = Math.min(tables.length, start + height);
    if (end - start < height) start = Math.max(0, end - height);

    for (let i = start; i < end; i++) {
      const isSelected = i === cursor;
      const table = tables[i];
      
      const name = isSelected ? `${ANSI.bold}${table.name}` : `${table.name}`;
      const count = `${formatNumber(table.row_count)} rows`;

      const bg = isSelected ? THEME.selectionBg : THEME.background;
      const fg = isSelected ? THEME.primary : THEME.text;

      const leftPart = `${ANSI.fg(fg)}${name}${ANSI.reset}${ANSI.bg(bg)}`;
      const rightPart = `${ANSI.fg(isSelected ? fg : THEME.textDim)}${count}${ANSI.reset}${ANSI.bg(bg)}`;

      const rowContent = `${leftPart}${' '.repeat(Math.max(0, width - 2 - getVisibleWidth(leftPart) - getVisibleWidth(rightPart)))}${rightPart}`;
      lines.push(this.renderPanelLine(rowContent, width, bg));
    }
    return lines;
  }

  private renderTableDetail(state: TableDetailViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const { data, dataOffset, dataCursor, bufferOffset } = state;

    if (data.length === 0) return [pad('No data', width, 'center')];

    const columns = Object.keys(data[0]).slice(0, 8);

    // Calculate or use cached column widths
    if (!state.cachedColWidths || state.cachedScreenWidth !== width) {
      const numCols = columns.length;
      const innerWidth = width - 2;
      const minColWidth = 8;

      let colWidths: number[] = [];
      if (state.columnWeights && state.columnWeights.length >= numCols) {
        let weights = state.columnWeights.slice(0, numCols);

        // Cap weights to prevent extreme ratios (max 4x average)
        // This ensures one long field doesn't completely squash others
        const avgWeight = weights.reduce((a, b) => a + b, 0) / numCols;
        const maxWeight = avgWeight * 4;
        weights = weights.map(w => Math.min(w, maxWeight));

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const availableWidth = innerWidth - (numCols * minColWidth);

        if (availableWidth > 0) {
          colWidths = weights.map(w => minColWidth + Math.floor((w / totalWeight) * availableWidth));

          // If totalWeight is 0 (shouldn't happen with min weights), fallback
          if (totalWeight === 0) {
            const equalWidth = Math.floor(innerWidth / numCols);
            colWidths = new Array(numCols).fill(equalWidth);
          }

          // Distribute rounding remainder to last column
          const usedWidth = colWidths.reduce((a, b) => a + b, 0);
          if (usedWidth < innerWidth) {
            colWidths[colWidths.length - 1] += (innerWidth - usedWidth);
          }
        } else {
          // Fallback to equal distribution if screen is too narrow
          const equalWidth = Math.floor(innerWidth / numCols);
          colWidths = new Array(numCols).fill(equalWidth);
        }
      } else {
        const equalWidth = Math.floor(innerWidth / numCols);
        colWidths = new Array(numCols).fill(equalWidth);
      }

      state.cachedColWidths = colWidths;
      state.cachedScreenWidth = width;
    }

    const colWidths = state.cachedColWidths!;

    // Table Header Block
    let headerContent = `${ANSI.fg(THEME.textDim)}${ANSI.bold}`;
    columns.forEach((col, i) => {
      const w = colWidths[i];
      headerContent += pad(col, w - 1).slice(0, w - 1) + ' ';
    });
    lines.push(this.renderPanelLine(headerContent, width, THEME.surface));
    lines.push(this.drawTransition(width, THEME.surface, THEME.background));

    // Data Rows
    const relativeOffset = dataOffset - bufferOffset;
    const displayData = data.slice(relativeOffset, relativeOffset + height - 2);
    state.visibleRows = height - 2;

    displayData.forEach((row, idx) => {
      const isSelected = idx === dataCursor;
      const rowBg = isSelected ? THEME.selectionBg : THEME.background;
      const rowFg = isSelected ? THEME.primary : THEME.text;

      let rowContent = `${ANSI.fg(rowFg)}`;
      columns.forEach((col, i) => {
        const w = colWidths[i];
        const val = formatValue(row[col], w - 1);
        rowContent += pad(val, w - 1).slice(0, w - 1) + ' ';
      });
      lines.push(this.renderPanelLine(rowContent, width, rowBg));
    });

    return lines;
  }

  private renderSchema(state: SchemaViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const { schema, cursor } = state;

    const half = Math.floor(height / 2);
    let start = Math.max(0, cursor - half);
    let end = Math.min(schema.length, start + height);
    if (end - start < height) start = Math.max(0, end - height);

    for (let i = start; i < end; i++) {
      const col = schema[i];
      const isSelected = i === cursor;
      const rowBg = isSelected ? THEME.selectionBg : THEME.background;
      
      const name = pad(col.name, 25);
      const type = pad(col.type, 15);
      const attrs = [];
      if (col.pk) attrs.push('PK');
      if (col.notnull) attrs.push('NOT NULL');
      
      let rowContent = `${ANSI.fg(isSelected ? THEME.primary : THEME.text)}${name}`;
      rowContent += `${ANSI.fg(THEME.secondary)}${type}`;
      rowContent += `${ANSI.fg(THEME.textDim)}${attrs.join(', ')}`;
      lines.push(this.renderPanelLine(rowContent, width, rowBg));
    }
    return lines;
  }

  private renderRowDetail(state: RowDetailViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const { row, schema } = state;

    schema.forEach((col, idx) => {
      if (idx >= height) return;
      const key = `${ANSI.fg(THEME.secondary)}${pad(col.name, 20)}${ANSI.reset}${ANSI.bg(THEME.background)}`;
      const val = `${ANSI.fg(THEME.text)}${formatValue(row[col.name], width - 25)}${ANSI.reset}${ANSI.bg(THEME.background)}`;
      lines.push(this.renderPanelLine(` ${key} : ${val}`, width, THEME.background));
    });
    return lines;
  }

  private renderHealth(state: HealthViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const entries = Object.entries(state.info);
    entries.forEach(([key, val], idx) => {
        if (idx >= height) return;
        const label = pad(key.replace(/_/g, ' '), 25);
        const rowContent = `${ANSI.fg(THEME.secondary)}${label}${ANSI.reset}${ANSI.bg(THEME.background)} : ${val}`;
        lines.push(this.renderPanelLine(rowContent, width, THEME.background));
    });
    return lines;
  }

  private buildHelpBar(state: ViewState, width: number): string {
    let helpItems: { key: string; label: string }[] = [];
    if ((state as any).notice) {
      return `${ANSI.bg(THEME.footerBg)} ${ANSI.fg(THEME.textDim)}${(state as any).notice}${' '.repeat(Math.max(0, width - getVisibleWidth((state as any).notice) - 2))} ${ANSI.reset}`;
    }

    switch (state.type) {
      case 'tables':
        helpItems = [
          { key: 'j/k', label: 'select' },
          { key: 'Enter/l', label: 'open' },
          { key: 'i', label: 'info' },
          { key: 'q', label: 'quit' }
        ];
        break;
      case 'table-detail':
        helpItems = [
          { key: 'j/k', label: 'scroll' },
          { key: 'Enter/l', label: 'row' },
          { key: 's', label: 'schema' },
          { key: 'h', label: 'back' },
          { key: 'q', label: 'quit' }
        ];
        break;
      case 'schema-view':
        helpItems = [
          { key: 'j/k', label: 'scroll' },
          { key: 's/h', label: 'back' },
          { key: 'q', label: 'quit' }
        ];
        break;
      default:
        helpItems = [
          { key: 'h', label: 'back' },
          { key: 'q', label: 'quit' }
        ];
        break;
    }

    const styledHelp = helpItems
      .map(item => `${ANSI.fg(THEME.text)}${item.key} ${ANSI.fg(THEME.textDim)}${item.label}`)
      .join('  ');
    const len = getVisibleWidth(styledHelp);
    const padding = ' '.repeat(Math.max(0, width - len - 2));
    return `${ANSI.bg(THEME.footerBg)}${padding}${styledHelp}  ${ANSI.reset}`;
  }
}
