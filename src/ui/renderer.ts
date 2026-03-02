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

  /**
   * Render the current state to screen
   */
  render(state: ViewState, dbPath: string): void {
    const { width, height } = this.screen;
    const lines: string[] = [];

    // 1. Title Bar (Header Block)
    lines.push(this.buildTitleBar(state, dbPath, width));

    // 2. Main Content area
    const contentHeight = height - 2; // 1 for header, 1 for footer
    const contentLines = this.buildContent(state, contentHeight, width);
    lines.push(...contentLines);

    // 3. Help/Status Bar (Footer Block)
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
      content.push(`${ANSI.bg(THEME.background)}${' '.repeat(width)}${ANSI.reset}`);
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
      
      const name = isSelected ? ` ${ANSI.bold}${table.name}` : ` ${table.name}`;
      const count = `${formatNumber(table.row_count)} rows `;

      const bg = isSelected ? THEME.selectionBg : THEME.background;
      const fg = isSelected ? THEME.primary : THEME.text;

      const leftPart = `${ANSI.fg(fg)}${name}${ANSI.reset}`;
      const rightPart = `${ANSI.fg(isSelected ? fg : THEME.textDim)}${count}${ANSI.reset}`;

      const padding = width - getVisibleWidth(leftPart) - getVisibleWidth(rightPart);
      lines.push(`${ANSI.bg(bg)}${leftPart}${' '.repeat(Math.max(0, padding))}${rightPart}${ANSI.reset}`);
    }
    return lines;
  }

  private renderTableDetail(state: TableDetailViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const { data, dataOffset, dataCursor, bufferOffset } = state;

    if (data.length === 0) return [pad('No data', width, 'center')];

    // Table Header Block
    const columns = Object.keys(data[0]).slice(0, 8);
    const colWidth = Math.floor((width - 2) / columns.length);

    let headerLine = `${ANSI.bg(THEME.surface)}${ANSI.fg(THEME.textDim)}${ANSI.bold} `;
    columns.forEach(col => {
      headerLine += pad(col, colWidth - 1).slice(0, colWidth - 1) + ' ';
    });
    headerLine += ' '.repeat(width - getVisibleWidth(headerLine)) + ANSI.reset;
    lines.push(headerLine);

    // Data Rows
    const relativeOffset = dataOffset - bufferOffset;
    const displayData = data.slice(relativeOffset, relativeOffset + height - 1);
    state.visibleRows = height - 1;

    displayData.forEach((row, idx) => {
      const isSelected = idx === dataCursor;
      const rowBg = isSelected ? THEME.selectionBg : THEME.background;
      const rowFg = isSelected ? THEME.primary : THEME.text;

      let line = `${ANSI.bg(rowBg)}${ANSI.fg(rowFg)} `;
      columns.forEach(col => {
        const val = formatValue(row[col], colWidth - 1);
        line += pad(val, colWidth - 1).slice(0, colWidth - 1) + ' ';
      });
      line += ' '.repeat(width - getVisibleWidth(line)) + ANSI.reset;
      lines.push(line);
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
      
      let line = `${ANSI.bg(rowBg)} ${ANSI.fg(isSelected ? THEME.primary : THEME.text)}${name}`;
      line += `${ANSI.fg(THEME.secondary)}${type}`;
      line += `${ANSI.fg(THEME.textDim)}${attrs.join(', ')}`;
      line += ' '.repeat(Math.max(0, width - getVisibleWidth(line))) + ANSI.reset;
      lines.push(line);
    }
    return lines;
  }

  private renderRowDetail(state: RowDetailViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const { row, schema } = state;

    schema.forEach((col, idx) => {
      if (idx >= height) return;
      const key = `${ANSI.fg(THEME.secondary)}${pad(col.name, 20)}${ANSI.reset}`;
      const val = `${ANSI.fg(THEME.text)}${formatValue(row[col.name], width - 25)}${ANSI.reset}`;
      lines.push(`${ANSI.bg(THEME.background)}  ${key} : ${val}${' '.repeat(width)}${ANSI.reset}`.slice(0, width + 50)); // Crude limit
    });
    // Fix line width for each
    return lines.map(l => {
        const visible = getVisibleWidth(l);
        if (visible < width) return l + ' '.repeat(width - visible);
        return l;
    });
  }

  private renderHealth(state: HealthViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const entries = Object.entries(state.info);
    entries.forEach(([key, val], idx) => {
        if (idx >= height) return;
        const label = pad(key.replace(/_/g, ' '), 25);
        lines.push(`${ANSI.bg(THEME.background)} ${ANSI.fg(THEME.secondary)}${label}${ANSI.reset} : ${val}${' '.repeat(width)}${ANSI.reset}`.slice(0, width + 50));
    });
    return lines.map(l => {
        const visible = getVisibleWidth(l);
        if (visible < width) return l + ' '.repeat(width - visible);
        return l;
    });
  }

  private buildHelpBar(state: ViewState, width: number): string {
    let helpText = '';
    if ((state as any).notice) {
        helpText = ` ${(state as any).notice} `;
    } else {
        switch (state.type) {
            case 'tables': helpText = ' [j/k] select  [Enter/l] open  [i] info  [q] quit'; break;
            case 'table-detail': helpText = ' [j/k] scroll  [Enter/l] row  [s] schema  [h] back  [q] quit'; break;
            case 'schema-view': helpText = ' [j/k] scroll  [s/h] back  [q] quit'; break;
            default: helpText = ' [h] back  [q] quit'; break;
        }
    }

    const styledHelp = `${ANSI.fg(THEME.textDim)}${helpText}${ANSI.reset}`;
    const len = getVisibleWidth(styledHelp);
    return `${ANSI.bg(THEME.footerBg)}${styledHelp}${' '.repeat(Math.max(0, width - len))}${ANSI.reset}`;
  }
}
