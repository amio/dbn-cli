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
export function truncate(str: string, maxWidth: number): string {
  if (!str) return '';
  const s = String(str);
  
  const currentWidth = getVisibleWidth(s);
  if (currentWidth <= maxWidth) return s;
  
  // Need to truncate - build string character by character
  let result = '';
  let width = 0;
  const ellipsis = '...';
  const ellipsisWidth = 3; // '...' is 3 single-width chars
  
  // Use Array.from to properly iterate over code points (handles emoji)
  for (const char of Array.from(s)) {
    const charWidth = isDoubleWidth(char) ? 2 : 1;
    
    if (width + charWidth + ellipsisWidth > maxWidth) {
      break;
    }
    
    result += char;
    width += charWidth;
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
    
    // Use Array.from to properly iterate over code points (handles emoji)
    for (const char of Array.from(s)) {
      const charWidth = isDoubleWidth(char) ? 2 : 1;
      
      if (width + charWidth > targetWidth) {
        break;
      }
      
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
function isDoubleWidth(char: string): boolean {
  const code = char.codePointAt(0);
  if (!code) return false;
  
  return (
    // CJK Unified Ideographs
    (code >= 0x4E00 && code <= 0x9FFF) ||
    // CJK Extension A
    (code >= 0x3400 && code <= 0x4DBF) ||
    // CJK Compatibility Ideographs
    (code >= 0xF900 && code <= 0xFAFF) ||
    // Fullwidth Latin letters
    (code >= 0xFF01 && code <= 0xFF60) ||
    // Fullwidth brackets and symbols
    (code >= 0xFFE0 && code <= 0xFFE6) ||
    // Hangul Syllables
    (code >= 0xAC00 && code <= 0xD7AF) ||
    // Hiragana and Katakana
    (code >= 0x3040 && code <= 0x30FF) ||
    // Emoji and symbols (basic)
    (code >= 0x1F300 && code <= 0x1F9FF) ||
    // Miscellaneous Symbols and Pictographs
    (code >= 0x1F600 && code <= 0x1F64F) ||
    // Emoticons
    (code >= 0x1F680 && code <= 0x1F6FF) ||
    // Transport and Map Symbols
    (code >= 0x2600 && code <= 0x26FF) ||
    // Miscellaneous Symbols
    (code >= 0x2700 && code <= 0x27BF) ||
    // Dingbats
    (code >= 0x1F900 && code <= 0x1F9FF) ||
    // Supplemental Symbols and Pictographs
    (code >= 0x1FA00 && code <= 0x1FA6F) ||
    // Extended Pictographs
    (code >= 0x1FA70 && code <= 0x1FAFF)
  );
}

/**
 * Get the visible width of a string (accounting for ANSI codes, CJK characters, and emoji)
 * @param str - String to measure
 * @returns Visible width
 */
export function getVisibleWidth(str: string): number {
  // Remove ANSI escape codes
  const cleanStr = str.replace(/\x1b\[[0-9;]*m/g, '');
  
  let width = 0;
  // Use Array.from to properly iterate over code points (handles emoji)
  for (const char of Array.from(cleanStr)) {
    if (isDoubleWidth(char)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  
  return width;
}
