import { ANSI as GRIT_ANSI } from './grit/index.ts';

/**
 * ANSI Escape Codes for Styling
 */
export const ANSI = GRIT_ANSI;

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
  footerBg: '',
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
