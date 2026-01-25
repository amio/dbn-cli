import { describe, it } from 'node:test';
import assert from 'node:assert';
import { COLORS, BORDERS, UI } from '../src/ui/theme.ts';

describe('Theme', () => {
  describe('COLORS', () => {
    it('should have reset code', () => {
      assert.strictEqual(COLORS.reset, '\x1b[0m');
    });

    it('should have style codes', () => {
      assert.ok(COLORS.bold);
      assert.ok(COLORS.dim);
      assert.ok(COLORS.inverse);
    });

    it('should have foreground colors', () => {
      assert.ok(COLORS.red);
      assert.ok(COLORS.green);
      assert.ok(COLORS.blue);
      assert.ok(COLORS.cyan);
      assert.ok(COLORS.yellow);
    });

    it('should have background colors', () => {
      assert.ok(COLORS.bgRed);
      assert.ok(COLORS.bgGreen);
      assert.ok(COLORS.bgBlue);
    });
  });

  describe('BORDERS', () => {
    it('should have box drawing characters', () => {
      assert.strictEqual(BORDERS.horizontal, '─');
      assert.strictEqual(BORDERS.vertical, '│');
      assert.strictEqual(BORDERS.topLeft, '┌');
      assert.strictEqual(BORDERS.topRight, '┐');
      assert.strictEqual(BORDERS.bottomLeft, '└');
      assert.strictEqual(BORDERS.bottomRight, '┘');
    });

    it('should have join characters', () => {
      assert.strictEqual(BORDERS.leftJoin, '├');
      assert.strictEqual(BORDERS.rightJoin, '┤');
      assert.strictEqual(BORDERS.topJoin, '┬');
      assert.strictEqual(BORDERS.bottomJoin, '┴');
      assert.strictEqual(BORDERS.cross, '┼');
    });
  });

  describe('UI', () => {
    it('should have cursor character', () => {
      assert.strictEqual(UI.cursor, '>');
    });

    it('should have empty space', () => {
      assert.strictEqual(UI.empty, ' ');
    });

    it('should have ellipsis', () => {
      assert.strictEqual(UI.ellipsis, '...');
    });
  });
});
