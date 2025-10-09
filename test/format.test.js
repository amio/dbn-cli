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

    it('should truncate CJK strings correctly by visible width', () => {
      // 你好世界 = 4 chars, 8 visible width
      assert.strictEqual(getVisibleWidth(truncate('你好世界', 5)), 5); // Should fit '你...' (2+3=5)
      assert.strictEqual(getVisibleWidth(truncate('你好世界', 10)), 8); // Should not truncate
      assert.strictEqual(getVisibleWidth(truncate('Hello你好', 8)), 8); // 'Hello...' = 8 width
    });

    it('should truncate emoji strings correctly by visible width', () => {
      // 👋 = 2 visible width
      assert.strictEqual(getVisibleWidth(truncate('Hello 👋', 6)), 6); // Should fit 'Hel...' = 6 width
      assert.strictEqual(getVisibleWidth(truncate('👋👋👋', 5)), 5); // Should fit '👋...' (2+3=5)
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
      assert.strictEqual(getVisibleWidth(pad('hello world', 5)), 5);
    });

    it('should handle null and undefined', () => {
      assert.strictEqual(pad(null, 5), '     ');
      assert.strictEqual(pad(undefined, 5), '     ');
    });

    it('should pad CJK strings correctly by visible width', () => {
      // 你好 = 2 chars, 4 visible width
      const padded = pad('你好', 10);
      assert.strictEqual(getVisibleWidth(padded), 10); // Should be 4 + 6 spaces = 10
      
      const rightPadded = pad('你好', 10, 'right');
      assert.strictEqual(getVisibleWidth(rightPadded), 10); // Should be 6 spaces + 4 = 10
    });

    it('should truncate CJK strings correctly by visible width', () => {
      // 你好世界 = 4 chars, 8 visible width
      const truncated = pad('你好世界', 5);
      assert.strictEqual(getVisibleWidth(truncated), 5); // Should fit up to 5 width
    });

    it('should pad emoji strings correctly by visible width', () => {
      // 👋 = 2 visible width
      const padded = pad('👋', 10);
      assert.strictEqual(getVisibleWidth(padded), 10); // Should be 2 + 8 spaces = 10
    });

    it('should truncate emoji strings correctly by visible width', () => {
      // 👋👋👋 = 6 visible width
      const truncated = pad('👋👋👋', 5);
      assert.strictEqual(getVisibleWidth(truncated), 5); // Should fit 2 emoji + 1 space = 5
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

    it('should count CJK characters as double-width', () => {
      assert.strictEqual(getVisibleWidth('你好'), 4); // 2 Chinese chars = 4 width
      assert.strictEqual(getVisibleWidth('Hello世界'), 9); // 5 + 2*2 = 9
      assert.strictEqual(getVisibleWidth('こんにちは'), 10); // 5 Japanese chars = 10 width
      assert.strictEqual(getVisibleWidth('안녕하세요'), 10); // 5 Korean chars = 10 width
    });

    it('should count emoji as double-width', () => {
      assert.strictEqual(getVisibleWidth('👋'), 2); // Wave emoji = 2 width
      assert.strictEqual(getVisibleWidth('Hello! 👋'), 9); // 7 + 2 = 9
      assert.strictEqual(getVisibleWidth('😀😁😂'), 6); // 3 emoji = 6 width
      assert.strictEqual(getVisibleWidth('Test 🎉 OK'), 10); // 4 + 1 + 2 + 1 + 2 = 10
    });

    it('should handle mixed content with CJK and ANSI codes', () => {
      assert.strictEqual(getVisibleWidth('\x1b[1m你好\x1b[0m'), 4);
      assert.strictEqual(getVisibleWidth('Test测试'), 8); // 4 + 2*2 = 8
    });

    it('should handle mixed emoji, CJK, and ASCII', () => {
      assert.strictEqual(getVisibleWidth('Hello 你好 👋'), 13); // 5 + 1 + 4 + 1 + 2 = 13
    });
  });
});
