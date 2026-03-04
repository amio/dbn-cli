import { ANSI, wrapAnsiBg } from './utils.ts';
import { getVisibleWidth } from '../../utils/format.ts';
import type { Color, Alignment, LayoutOptions, ColumnConfig } from './types.ts';

export * from './types.ts';
export * from './utils.ts';

export class Box {
  private options: LayoutOptions;

  constructor(options: LayoutOptions) {
    this.options = {
      padding: 0,
      ...options
    };
  }

  render(content: string, options: { align?: Alignment; background?: Color } = {}): string {
    const { width, background: defaultBg, padding = 0 } = this.options;
    const bg = options.background || defaultBg || '';

    const innerWidth = width - (padding * 2);
    const contentWidth = getVisibleWidth(content);

    let line = '';
    if (bg) line += ANSI.bg(bg);

    // Left padding
    line += ' '.repeat(padding);

    const fill = Math.max(0, innerWidth - contentWidth);
    const safeContent = wrapAnsiBg(content, bg);

    if (options.align === 'right') {
      line += ' '.repeat(fill) + safeContent;
    } else if (options.align === 'center') {
      const leftFill = Math.floor(fill / 2);
      const rightFill = fill - leftFill;
      line += ' '.repeat(leftFill) + safeContent + ' '.repeat(rightFill);
    } else {
      line += safeContent + ' '.repeat(fill);
    }

    // Right padding
    line += ' '.repeat(padding);

    if (bg) line += ANSI.reset;

    return line;
  }
}

export class Transition {
  static draw(width: number, topBg: Color, bottomBg: Color): string {
    return `${ANSI.fg(topBg)}${ANSI.bg(bottomBg)}${ANSI.blockUpper.repeat(width)}${ANSI.reset}`;
  }

  static drawInverted(width: number, topBg: Color, bottomBg: Color): string {
    return `${ANSI.fg(bottomBg)}${ANSI.bg(topBg)}${ANSI.blockLower.repeat(width)}${ANSI.reset}`;
  }
}

export class Grid {
  static calculateWidths(totalWidth: number, configs: ColumnConfig[]): number[] {
    const numCols = configs.length;
    if (numCols === 0) return [];

    const minWidths = configs.map(c => c.minWidth ?? 0);
    const weights = configs.map(c => c.weight ?? 1);

    const totalMinWidth = minWidths.reduce((a, b) => a + b, 0);
    const availableWidth = totalWidth - totalMinWidth;

    if (availableWidth <= 0) {
      // If not enough space, distribute equally based on minWidths or just evenly
      const equalWidth = Math.floor(totalWidth / numCols);
      return new Array(numCols).fill(equalWidth);
    }

    // Cap weights to prevent extreme ratios (max 4x average)
    const avgWeight = weights.reduce((a, b) => a + b, 0) / numCols;
    const maxWeight = avgWeight * 4;
    const cappedWeights = weights.map(w => Math.min(w, maxWeight));
    const totalWeight = cappedWeights.reduce((a, b) => a + b, 0);

    if (totalWeight === 0) {
        const equalWidth = Math.floor(totalWidth / numCols);
        return new Array(numCols).fill(equalWidth);
    }

    const widths = cappedWeights.map((w, i) => minWidths[i] + Math.floor((w / totalWeight) * availableWidth));

    // Distribute rounding remainder to the last column
    const usedWidth = widths.reduce((a, b) => a + b, 0);
    if (usedWidth < totalWidth) {
      widths[widths.length - 1] += (totalWidth - usedWidth);
    }

    return widths;
  }
}
