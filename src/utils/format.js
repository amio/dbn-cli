/**
 * Formatting utilities for displaying data
 */

/**
 * Format a number with thousand separators
 * @param {number} num - Number to format
 * @returns {string}
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Truncate a string to a specific length with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string}
 */
export function truncate(str, maxLength) {
  if (!str) return '';
  const s = String(str);
  if (s.length <= maxLength) return s;
  return s.substring(0, maxLength - 3) + '...';
}

/**
 * Pad a string to a specific length
 * @param {string} str - String to pad
 * @param {number} length - Target length
 * @param {string} align - Alignment: 'left', 'right', or 'center'
 * @returns {string}
 */
export function pad(str, length, align = 'left') {
  const s = String(str || '');
  if (s.length >= length) return s.substring(0, length);
  
  const padding = length - s.length;
  
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
 * @param {any} value - Value to format
 * @returns {string}
 */
export function formatValue(value) {
  if (value === null) return 'NULL';
  if (value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Get the visible width of a string (accounting for ANSI codes)
 * @param {string} str - String to measure
 * @returns {number}
 */
export function getVisibleWidth(str) {
  // Remove ANSI escape codes
  const cleanStr = str.replace(/\x1b\[[0-9;]*m/g, '');
  return cleanStr.length;
}
