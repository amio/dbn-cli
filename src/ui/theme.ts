/**
 * ANSI Escape Codes for Styling
 */
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
  }
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
 * Modern color palette (OpenCode style)
 */
export const THEME = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  primary: '#00A0FF', // Brighter Blue
  secondary: '#A259FF', // Brighter Purple
  accent: '#FF3B30', // Red
  text: '#FFFFFF',
  textDim: '#8E8E93',
  headerBg: '#242426',
  footerBg: '#1C1C1E',
  selectionBg: '#3A3A3C',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

/**
 * Common UI elements
 */
export const UI = {
  ellipsis: '...',
} as const;
