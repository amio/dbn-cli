import { describe, it } from 'node:test';
import assert from 'node:assert';
import { THEME, UI } from '../ui/theme.ts';

describe('Theme', () => {
  describe('THEME', () => {
    it('should have background colors', () => {
      assert.ok(THEME.background);
      assert.ok(THEME.surface);
    });

    it('should have brand colors', () => {
      assert.ok(THEME.primary);
      assert.ok(THEME.secondary);
      assert.ok(THEME.accent);
    });

    it('should have semantic colors', () => {
      assert.ok(THEME.success);
      assert.ok(THEME.warning);
      assert.ok(THEME.error);
    });
  });

  describe('UI', () => {
    it('should have ellipsis', () => {
      assert.strictEqual(UI.ellipsis, '...');
    });
  });
});
