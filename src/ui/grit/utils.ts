export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  inverse: '\x1b[7m',
  // TrueColor (24-bit) foreground
  fg: (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return `\x1b[38;2;${r};${g};${b}m`;
  },
  // TrueColor (24-bit) background
  bg: (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return `\x1b[48;2;${r};${g};${b}m`;
  },
  blockUpper: '▀',
  blockLower: '▄',
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Ensures background color is maintained if content contains ANSI resets.
 */
export function wrapAnsiBg(content: string, bg: string): string {
  if (!bg) return content;
  return content.replaceAll(ANSI.reset, ANSI.reset + ANSI.bg(bg));
}
