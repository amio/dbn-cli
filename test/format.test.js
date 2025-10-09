import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatNumber, truncate, pad, formatValue, getVisibleWidth } from '../src/utils/format.js';

describe('Format Utils', () => {
  describe('formatNumber', () => {
    it('should format numbers with thousand separators', () => {
      assert.strictEqual(formatNumber(1234), '1,234');
      assert.strictEqual(formatNumber(1234567), '1,234,567');
      assert.strictEqual(formatNumber(123), '123');
      assert.strictEqual(formatNumber(0), '0');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      assert.strictEqual(truncate('Hello World', 8), 'Hello...');
      assert.strictEqual(truncate('Hello World', 15), 'Hello World');
      assert.strictEqual(truncate('Hello', 10), 'Hello');
    });

    it('should handle null and undefined', () => {
      assert.strictEqual(truncate(null, 10), '');
      assert.strictEqual(truncate(undefined, 10), '');
    });

    it('should handle empty strings', () => {
      assert.strictEqual(truncate('', 10), '');
    });

    it('should convert non-strings', () => {
      assert.strictEqual(truncate(123, 5), '123');
      assert.strictEqual(truncate(12345678, 5), '12...');
    });
  });

  describe('pad', () => {
    it('should pad strings to the left by default', () => {
      assert.strictEqual(pad('test', 10), 'test      ');
      assert.strictEqual(pad('hello', 8), 'hello   ');
    });

    it('should pad strings to the right', () => {
      assert.strictEqual(pad('test', 10, 'right'), '      test');
      assert.strictEqual(pad('hello', 8, 'right'), '   hello');
    });

    it('should pad strings to the center', () => {
      assert.strictEqual(pad('test', 10, 'center'), '   test   ');
      assert.strictEqual(pad('hello', 9, 'center'), '  hello  ');
    });

    it('should truncate if string is longer than length', () => {
      assert.strictEqual(pad('hello world', 5), 'hello');
    });

    it('should handle null and undefined', () => {
      assert.strictEqual(pad(null, 5), '     ');
      assert.strictEqual(pad(undefined, 5), '     ');
    });
  });

  describe('formatValue', () => {
    it('should format null as NULL', () => {
      assert.strictEqual(formatValue(null), 'NULL');
    });

    it('should format undefined as empty string', () => {
      assert.strictEqual(formatValue(undefined), '');
    });

    it('should format booleans', () => {
      assert.strictEqual(formatValue(true), 'true');
      assert.strictEqual(formatValue(false), 'false');
    });

    it('should format objects as JSON', () => {
      assert.strictEqual(formatValue({ key: 'value' }), '{"key":"value"}');
      assert.strictEqual(formatValue([1, 2, 3]), '[1,2,3]');
    });

    it('should format strings as-is', () => {
      assert.strictEqual(formatValue('hello'), 'hello');
    });

    it('should format numbers as strings', () => {
      assert.strictEqual(formatValue(123), '123');
      assert.strictEqual(formatValue(45.67), '45.67');
    });
  });

  describe('getVisibleWidth', () => {
    it('should get width of plain strings', () => {
      assert.strictEqual(getVisibleWidth('hello'), 5);
      assert.strictEqual(getVisibleWidth('test string'), 11);
    });

    it('should ignore ANSI escape codes', () => {
      assert.strictEqual(getVisibleWidth('\x1b[1mhello\x1b[0m'), 5);
      assert.strictEqual(getVisibleWidth('\x1b[31mred text\x1b[0m'), 8);
      assert.strictEqual(getVisibleWidth('\x1b[1m\x1b[31mbold red\x1b[0m\x1b[0m'), 8);
    });

    it('should handle empty strings', () => {
      assert.strictEqual(getVisibleWidth(''), 0);
    });
  });
});
