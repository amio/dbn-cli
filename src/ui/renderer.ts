import { Box, Text, t, bold, fg, bg, italic, type Renderer as OpenTUIRenderer } from '@opentui/core';
import { THEME } from './theme.ts';
import { formatNumber, formatValue, getVisibleWidth } from '../utils/format.ts';
import type { Screen } from './screen.ts';
import type { ViewState, TablesViewState, TableDetailViewState, SchemaViewState, RowDetailViewState, HealthViewState } from '../types.ts';

/**
 * Modern Renderer using OpenTUI
 */
export class Renderer {
  private screen: Screen;

  constructor(screen: Screen) {
    this.screen = screen;
  }

  /**
   * Render the current state using OpenTUI's declarative system
   * @param state - Current navigation state
   * @param dbPath - Database file path
   */
  render(state: ViewState, dbPath: string): void {
    if (!this.screen.renderer) return;

    const renderer = this.screen.renderer;

    // We replace all nodes with new ones for simplicity since we're porting
    // Alternatively, we update specific nodes, but for now we rebuild the root.
    renderer.root.clear();

    const fileName = dbPath.split('/').pop() || dbPath;
    let breadcrumb = fileName;
    
    if (state.type === 'table-detail' || state.type === 'schema-view' || state.type === 'row-detail') {
      breadcrumb += ` > ${state.tableName}`;
    }
    if (state.type === 'schema-view') {
      breadcrumb += ` > schema`;
    }
    if (state.type === 'row-detail') {
      breadcrumb += ` > row ${state.rowIndex + 1}`;
    }
    if (state.type === 'health') {
      breadcrumb += ` > health`;
    }

    // Root container
    const rootBox = Box({
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: THEME.background,
    });

    // Title Bar
    const titleBar = Box({
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      height: 1,
      backgroundColor: THEME.headerBg,
      paddingX: 1,
    });

    titleBar.add(Text({
      content: t` ${bold(breadcrumb)} `,
      fg: THEME.primary,
    }));

    titleBar.add(Text({
      content: this.getRightInfoText(state),
      fg: THEME.textDim,
    }));

    rootBox.add(titleBar);

    // Content area
    const contentBox = Box({
      flexGrow: 1,
      width: '100%',
      paddingX: 0,
      paddingY: 0,
    });

    this.buildContent(contentBox, state);
    rootBox.add(contentBox);

    // Status/Help Bar
    const helpBar = Box({
      width: '100%',
      height: 1,
      backgroundColor: THEME.footerBg,
      paddingX: 1,
    });

    helpBar.add(Text({
      content: this.getHelpText(state),
      fg: THEME.textDim,
    }));

    rootBox.add(helpBar);

    renderer.root.add(rootBox);
  }

  private getRightInfoText(state: ViewState): string {
    if (state.type === 'tables') {
      return `${state.cursor + 1}/${state.tables.length} tables`;
    } else if (state.type === 'table-detail') {
      const current = state.dataOffset + state.dataCursor + 1;
      return `row ${formatNumber(current)}/${formatNumber(state.totalRows)}`;
    } else if (state.type === 'schema-view') {
      return `${state.cursor + 1}/${state.schema.length} columns`;
    } else if (state.type === 'row-detail') {
      return `${state.schema.length} fields`;
    }
    return '';
  }

  private getHelpText(state: ViewState): string {
    if (state.type === 'table-detail' || state.type === 'row-detail') {
      if (state.notice && state.deleteConfirm) {
        const step = state.deleteConfirm.step;
        const action = step === 2 ? 'delete' : 'confirm';
        return `Step ${step}/2: ${state.notice}  [y] ${action}  [h/Esc] cancel`;
      }
      if (state.notice) return state.notice;
    }

    switch (state.type) {
      case 'tables':
        return ' [j/k] select  [Enter/l] open  [i] info  [g/G] top/bottom  [q] quit';
      case 'table-detail':
        return ' [j/k] scroll  [Enter/l] row  [Backsp] del  [s] schema  [h/Esc] back  [q] quit';
      case 'schema-view':
        return ' [j/k] scroll  [g/G] top/bottom  [s/h/Esc] back  [q] quit';
      case 'row-detail':
        return ' [Backsp] del  [h/Esc] back  [q] quit';
      case 'health':
        return ' [i] back  [h/Esc] back  [q] quit';
    }
    return '';
  }

  private buildContent(parent: any, state: ViewState): void {
    if (state.type === 'tables') {
      this.renderTables(parent, state);
    } else if (state.type === 'table-detail') {
      this.renderTableDetail(parent, state);
    } else if (state.type === 'schema-view') {
      this.renderSchema(parent, state);
    } else if (state.type === 'row-detail') {
      this.renderRowDetail(parent, state);
    } else if (state.type === 'health') {
      this.renderHealth(parent, state);
    }
  }

  private renderTables(parent: any, state: TablesViewState): void {
    const { tables, cursor } = state;
    if (tables.length === 0) {
      parent.add(Text({ content: 'No tables found', fg: THEME.textDim, width: '100%', textAlign: 'center' }));
      return;
    }

    const visibleCount = this.screen.height - 3;
    const half = Math.floor(visibleCount / 2);
    let start = Math.max(0, cursor - half);
    let end = Math.min(tables.length, start + visibleCount);
    if (end - start < visibleCount) start = Math.max(0, end - visibleCount);

    for (let i = start; i < end; i++) {
      const table = tables[i];
      const isSelected = i === cursor;
      
      const row = Box({
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        backgroundColor: isSelected ? THEME.selectionBg : 'transparent',
        paddingX: 1,
      });

      row.add(Text({
        content: isSelected ? t` ${bold(table.name)}` : ` ${table.name}`,
        fg: isSelected ? THEME.primary : THEME.text,
      }));

      row.add(Text({
        content: t`${formatNumber(table.row_count)} rows `,
        fg: isSelected ? THEME.primary : THEME.textDim,
      }));

      parent.add(row);
    }
  }

  private renderTableDetail(parent: any, state: TableDetailViewState): void {
    const { data, dataOffset, dataCursor, bufferOffset } = state;
    if (data.length === 0) {
      parent.add(Text({ content: 'No data', fg: THEME.textDim, width: '100%', textAlign: 'center', marginTop: 2 }));
      return;
    }

    const relativeOffset = dataOffset - bufferOffset;
    const heightLimit = this.screen.height - 3; // header, footer, table header
    const displayData = data.slice(relativeOffset, relativeOffset + heightLimit);

    state.visibleRows = heightLimit;

    if (displayData.length === 0) {
      parent.add(Text({ content: 'No data in range', fg: THEME.textDim, width: '100%', textAlign: 'center', marginTop: 2 }));
      return;
    }

    const columns = Object.keys(displayData[0]);
    const maxVisibleCols = 8;
    const visibleColumns = columns.slice(0, maxVisibleCols);

    // Calculate optimal column widths
    const minColWidth = 8;
    const maxColWidth = 40;
    const usableWidth = this.screen.width - 2;
    const spacingWidth = visibleColumns.length - 1;
    const availableForContent = usableWidth - spacingWidth;

    const idealWidths = visibleColumns.map(col => {
      let maxWidth = col.length;
      const sampleSize = Math.min(data.length, 20);
      for (let i = 0; i < sampleSize; i++) {
        const value = formatValue(data[i][col], 50);
        maxWidth = Math.max(maxWidth, value.length);
      }
      return Math.max(minColWidth, Math.min(maxWidth + 2, maxColWidth));
    });

    let totalIdealWidth = idealWidths.reduce((sum, w) => sum + w, 0);
    let colWidths: number[] = [];

    if (totalIdealWidth <= availableForContent) {
      const extraSpace = availableForContent - totalIdealWidth;
      const extraPerCol = Math.floor(extraSpace / visibleColumns.length);
      colWidths = idealWidths.map(w => w + extraPerCol);
      colWidths[colWidths.length - 1] += extraSpace - (extraPerCol * visibleColumns.length);
    } else {
      const scale = availableForContent / totalIdealWidth;
      colWidths = idealWidths.map(w => Math.max(minColWidth, Math.floor(w * scale)));
      const currentTotal = colWidths.reduce((sum, w) => sum + w, 0);
      colWidths[colWidths.length - 1] += availableForContent - currentTotal;
    }

    // Header row
    const headerRow = Box({
      flexDirection: 'row',
      width: '100%',
      backgroundColor: THEME.surface,
      paddingX: 1,
    });

    visibleColumns.forEach((col, idx) => {
      headerRow.add(Text({
        content: t`${bold(col)}`,
        width: colWidths[idx],
        fg: THEME.textDim,
      }));
    });

    parent.add(headerRow);

    // Data rows
    displayData.forEach((rowData, idx) => {
      const isSelected = idx === dataCursor;
      const rowBox = Box({
        flexDirection: 'row',
        width: '100%',
        backgroundColor: isSelected ? THEME.selectionBg : 'transparent',
        paddingX: 1,
      });

      visibleColumns.forEach((col, colIdx) => {
        const val = formatValue(rowData[col], colWidths[colIdx]);
        rowBox.add(Text({
          content: val,
          width: colWidths[colIdx],
          fg: isSelected ? THEME.primary : THEME.text,
        }));
      });

      parent.add(rowBox);
    });
  }

  private renderSchema(parent: any, state: SchemaViewState): void {
    const { schema, cursor } = state;
    const visibleCount = this.screen.height - 3;
    let start = Math.max(0, cursor - Math.floor(visibleCount / 2));
    let end = Math.min(schema.length, start + visibleCount);
    if (end - start < visibleCount) start = Math.max(0, end - visibleCount);

    for (let i = start; i < end; i++) {
      const col = schema[i];
      const isSelected = i === cursor;

      const row = Box({
        flexDirection: 'row',
        width: '100%',
        backgroundColor: isSelected ? THEME.selectionBg : 'transparent',
        paddingX: 1,
      });

      row.add(Text({ content: col.name, width: 25, fg: isSelected ? THEME.primary : THEME.text }));
      row.add(Text({ content: col.type, width: 15, fg: THEME.secondary }));
      
      const attrs = [];
      if (col.pk) attrs.push('PK');
      if (col.notnull) attrs.push('NOT NULL');
      if (col.dflt_value !== null) attrs.push(`DEFAULT ${col.dflt_value}`);
      
      row.add(Text({ content: attrs.join(', '), fg: THEME.textDim, flexGrow: 1 }));

      parent.add(row);
    }
  }

  private renderRowDetail(parent: any, state: RowDetailViewState): void {
    const { row, schema } = state;
    const scrollBox = Box({ flexDirection: 'column', width: '100%', padding: 1 });

    schema.forEach(col => {
      const fieldRow = Box({ flexDirection: 'row', marginBottom: 0 });
      fieldRow.add(Text({ content: col.name, width: 20, fg: THEME.secondary }));
      fieldRow.add(Text({ content: ': ', fg: THEME.textDim }));
      fieldRow.add(Text({ content: String(row[col.name]), fg: THEME.text, flexGrow: 1 }));
      scrollBox.add(fieldRow);
    });

    parent.add(scrollBox);
  }

  private renderHealth(parent: any, state: HealthViewState): void {
    const { info } = state;
    const entries: Array<[string, any]> = Object.entries(info);
    const box = Box({ flexDirection: 'column', padding: 1 });

    entries.forEach(([key, val]) => {
      const row = Box({ flexDirection: 'row' });
      row.add(Text({ content: key.replace(/_/g, ' '), width: 25, fg: THEME.secondary }));
      row.add(Text({ content: ': ', fg: THEME.textDim }));
      row.add(Text({ content: String(val), fg: THEME.text }));
      box.add(row);
    });

    parent.add(box);
  }
}
