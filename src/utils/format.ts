/**
 * Formatting utilities for displaying data
 */

/**
 * Format a number with thousand separators
 * @param num - Number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Truncate a string to a specific visible width with ellipsis
 * @param str - String to truncate
 * @param maxWidth - Maximum visible width (accounting for double-width chars)
 * @returns Truncated string
 */
import stringWidth from 'string-width';

export function truncate(str: string, maxWidth: number): string {
  if (!str) return '';
  const s = String(str);
  
  const currentWidth = getVisibleWidth(s);
  if (currentWidth <= maxWidth) return s;
  
  const ellipsis = '...';
  const ellipsisWidth = 3;
  
  if (maxWidth <= ellipsisWidth) {
    return ellipsis.slice(0, maxWidth);
  }

  // Optimization: for plain ASCII strings, we can use slice directly
  const isPlainASCII = /^[\x20-\x7E]*$/.test(s);
  if (isPlainASCII) {
    return s.slice(0, maxWidth - ellipsisWidth) + ellipsis;
  }

  // For complex strings, we still need to be careful about double-width characters
  // but we can optimize by taking a slice that is definitely not too long
  let result = s.slice(0, maxWidth);
  while (getVisibleWidth(result) + ellipsisWidth > maxWidth && result.length > 0) {
    // Remove one character (potentially a multi-byte character or emoji)
    // Using Array.from to correctly handle surrogate pairs
    const chars = Array.from(result);
    chars.pop();
    result = chars.join('');
  }
  
  return result + ellipsis;
}

/**
 * Pad a string to a specific visible width
 * @param str - String to pad
 * @param targetWidth - Target visible width (accounting for double-width chars)
 * @param align - Alignment: 'left', 'right', or 'center'
 * @returns Padded string
 */
export function pad(str: string, targetWidth: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const s = String(str || '');
  const currentWidth = getVisibleWidth(s);
  
  if (currentWidth >= targetWidth) {
    // Need to truncate
    let result = '';
    let width = 0;
    
    // Build using string-width for grapheme-aware sizing
    for (const char of Array.from(s)) {
      const charWidth = stringWidth(char);

      if (width + charWidth > targetWidth) break;

      result += char;
      width += charWidth;
    }
    
    // If we stopped before a double-width char and have 1 space left, add a space
    if (width < targetWidth) {
      result += ' '.repeat(targetWidth - width);
    }
    
    return result;
  }
  
  const padding = targetWidth - currentWidth;
  
  if (align === 'right') {
    return ' '.repeat(padding) + s;
  } else if (align === 'center') {
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + s + ' '.repeat(rightPad);
  } else {
    return s + ' '.repeat(padding);
  }
}

/**
 * Format a value for display (handle null, undefined, etc.)
 * @param value - Value to format
 * @returns Formatted string
 */
export function formatValue(value: any): string {
  if (value === null) return 'NULL';
  if (value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  
  // Convert to string and remove control characters (newlines, tabs, etc.)
  const str = String(value);
  return str.replace(/[\n\r\t\v\f]/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Check if a character is double-width (CJK, emoji, etc.)
 * @param char - Single character or code point
 * @returns True if character is double-width
 */
// Deprecated: custom double-width detection replaced by `string-width`.
// Keep function stub for backward compatibility if other modules import it.
function isDoubleWidth(_char: string): boolean {
  return false; // use string-width instead
}

/**
 * Get the visible width of a string (accounting for ANSI codes, CJK characters, and emoji)
 * @param str - String to measure
 * @returns Visible width
 */
export function getVisibleWidth(str: string): number {
  if (!str) return 0;
  // Remove ANSI escape codes
  const cleanStr = str.replace(/\x1b\[[0-9;]*m/g, '');
  
  return stringWidth(cleanStr);
}
