import { THEME, ANSI } from './theme.ts';
import { formatNumber, truncate, pad, formatValue, getVisibleWidth, wrapText } from '../utils/format.ts';
import { Box, Transition, Grid, type ColumnConfig } from './grit/index.ts';
import type { Screen } from './screen.ts';
import type { ViewState, TablesViewState, TableDetailViewState, SchemaViewState, RowDetailViewState, HealthViewState } from '../types.ts';

/**
 * Modern Renderer (Manual ANSI Implementation)
 * Emulates OpenTUI/OpenCode design with color blocks and no lines.
 */
export class Renderer {
  private screen: Screen;
  private lastLines: string[] = [];
  private lastWidth: number = 0;
  private lastHeight: number = 0;

  constructor(screen: Screen) {
    this.screen = screen;
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
    lines.push(Transition.draw(width, THEME.headerBg, contentTopBg));

    // 2. Main Content area
    const contentHeight = height - 4; // 1 header, 1 footer, 2 transitions
    const contentLines = this.buildContent(state, contentHeight, width);
    lines.push(...contentLines);

    // 3. Help/Status Bar (Footer Block)
    lines.push(Transition.draw(width, THEME.background, THEME.footerBg));
    lines.push(this.buildHelpBar(state, width));

    // Incremental render
    if (width !== this.lastWidth || height !== this.lastHeight || this.lastLines.length === 0) {
      this.screen.clear();
      this.screen.write(lines.join('\n'));
    } else {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] !== this.lastLines[i]) {
          this.screen.writeAt(i + 1, 1, lines[i]);
        }
      }
    }

    this.lastLines = [...lines];
    this.lastWidth = width;
    this.lastHeight = height;
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
      rightPart = `${state.cursor + 1}/${state.tables.length} tables`;
    } else if (state.type === 'table-detail') {
      const current = state.dataOffset + state.dataCursor + 1;
      rightPart = `row ${formatNumber(current)}/${formatNumber(state.totalRows)}`;
    } else if (state.type === 'schema-view') {
      rightPart = `${state.cursor + 1}/${state.schema.length} columns`;
    } else if (state.type === 'row-detail') {
      rightPart = `${state.schema.length} fields`;
    }

    const rightPartStyled = `${ANSI.fg(THEME.textDim)}${rightPart}${ANSI.reset}`;

    const padding = ' '.repeat(Math.max(0, width - 2 - getVisibleWidth(leftPart) - getVisibleWidth(rightPartStyled)));
    const rowContent = `${leftPart}${padding}${rightPartStyled}`;

    const box = new Box({ width, padding: 1, background: THEME.headerBg });
    return box.render(rowContent);
  }

  private buildContent(state: ViewState, height: number, width: number): string[] {
    let content: string[] = [];
    const bgBox = new Box({ width, background: THEME.background, padding: 1 });

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
      content.push(bgBox.render(''));
    }
    return content;
  }

  private renderTables(state: TablesViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const { tables, cursor } = state;
    const box = new Box({ width, padding: 1 });

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

      const leftPart = `${ANSI.fg(fg)}${name}${ANSI.reset}`;
      const rightPart = `${ANSI.fg(isSelected ? fg : THEME.textDim)}${count}${ANSI.reset}`;

      const padding = ' '.repeat(Math.max(0, width - 2 - getVisibleWidth(leftPart) - getVisibleWidth(rightPart)));
      const rowContent = `${leftPart}${padding}${rightPart}`;
      lines.push(box.render(rowContent, { background: bg }));
    }
    return lines;
  }

  private renderTableDetail(state: TableDetailViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const { data, dataOffset, dataCursor, bufferOffset } = state;
    const box = new Box({ width, padding: 1 });

    if (data.length === 0) return [box.render('No data', { align: 'center' })];

    const columns = Object.keys(data[0]).slice(0, 8);

    // Calculate or use cached column widths
    if (!state.cachedColWidths || state.cachedScreenWidth !== width) {
      const numCols = columns.length;
      const minColWidth = 8;

      const configs: ColumnConfig[] = columns.map((_, i) => ({
        weight: (state.columnWeights && state.columnWeights[i]) || 1,
        minWidth: minColWidth
      }));

      state.cachedColWidths = Grid.calculateWidths(width - 2, configs);
      state.cachedScreenWidth = width;
    }

    const colWidths = state.cachedColWidths!;

    // Table Header Block
    let headerContent = `${ANSI.fg(THEME.textDim)}${ANSI.bold}`;
    columns.forEach((col, i) => {
      const w = colWidths[i];
      headerContent += pad(col, w - 1).slice(0, w - 1) + ' ';
    });
    lines.push(box.render(headerContent, { background: THEME.surface }));
    lines.push(Transition.draw(width, THEME.surface, THEME.background));

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
      lines.push(box.render(rowContent, { background: rowBg }));
    });

    return lines;
  }

  private renderSchema(state: SchemaViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const { schema, cursor } = state;
    const box = new Box({ width, padding: 1 });

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
      lines.push(box.render(rowContent, { background: rowBg }));
    }
    return lines;
  }

  private renderRowDetail(state: RowDetailViewState, height: number, width: number): string[] {
    const allLines: string[] = [];
    const { row, schema } = state;
    const innerWidth = width - 2;
    const box = new Box({ width, padding: 1, background: THEME.background });

    // Calculate max label width for alignment
    let maxLabelWidth = 0;
    schema.forEach(col => {
      maxLabelWidth = Math.max(maxLabelWidth, getVisibleWidth(col.name));
    });
    const labelPad = maxLabelWidth + 2; // +2 for ": "

    schema.forEach((col) => {
      const label = `${ANSI.bold}${ANSI.fg(THEME.secondary)}${pad(col.name, maxLabelWidth)}${ANSI.reset}: `;
      const val = formatValue(row[col.name], undefined, true);

      if (labelPad > innerWidth * 0.4) {
        // Label too long, fallback to simpler layout
        const simpleLabel = `${ANSI.bold}${ANSI.fg(THEME.secondary)}${col.name}${ANSI.reset}: `;
        allLines.push(box.render(simpleLabel));
        const wrappedLines = wrapText(val, innerWidth);
        wrappedLines.forEach(line => {
          allLines.push(box.render(`${ANSI.fg(THEME.text)}${line}`));
        });
      } else {
        const firstLineMax = innerWidth - labelPad;
        const wrappedLines = wrapText(val, firstLineMax);

        if (wrappedLines.length === 0 || (wrappedLines.length === 1 && wrappedLines[0] === '')) {
           allLines.push(box.render(`${label}`));
        } else {
           allLines.push(box.render(`${label}${ANSI.fg(THEME.text)}${wrappedLines[0]}`));

           if (wrappedLines.length > 1) {
             wrappedLines.slice(1).forEach(line => {
                allLines.push(box.render(`${' '.repeat(labelPad)}${ANSI.fg(THEME.text)}${line}`));
             });
           }
        }
      }
    });

    state.totalLines = allLines.length;
    state.visibleHeight = height;

    // Apply scroll offset
    return allLines.slice(state.scrollOffset, state.scrollOffset + height);
  }

  private renderHealth(state: HealthViewState, height: number, width: number): string[] {
    const lines: string[] = [];
    const entries = Object.entries(state.info);
    const box = new Box({ width, padding: 1, background: THEME.background });

    entries.forEach(([key, val], idx) => {
        if (idx >= height) return;
        const label = pad(key.replace(/_/g, ' '), 25);
        const rowContent = `${ANSI.fg(THEME.secondary)}${label}${ANSI.reset} : ${val}`;
        lines.push(box.render(rowContent));
    });
    return lines;
  }

  private buildHelpBar(state: ViewState, width: number): string {
    const box = new Box({ width, padding: 1, background: THEME.footerBg });

    if ((state as any).notice) {
      return box.render(`${ANSI.fg(THEME.textDim)}${(state as any).notice}`);
    }

    let helpItems: { key: string; label: string }[] = [];
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
      case 'row-detail':
        helpItems = [
          { key: 'j/k', label: 'switch' },
          { key: '↑/↓', label: 'scroll' },
          { key: 'h', label: 'back' },
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

    return box.render(styledHelp, { align: 'right' });
  }
}
