import test from 'node:test';
import assert from 'node:assert/strict';
import { Box, Transition, Grid, ANSI } from '../src/ui/grit/index.ts';

test('Grid.calculateWidths distributes widths correctly', () => {
  const widths = Grid.calculateWidths(100, [
    { weight: 1 },
    { weight: 1 }
  ]);
  assert.deepEqual(widths, [50, 50]);

  const weightedWidths = Grid.calculateWidths(100, [
    { weight: 1 },
    { weight: 3 }
  ]);
  assert.deepEqual(weightedWidths, [25, 75]);

  const minWidths = Grid.calculateWidths(100, [
    { weight: 1, minWidth: 40 },
    { weight: 1 }
  ]);
  // Total weight 2, available 100 - 40 = 60.
  // Col 1: 40 + (1/2 * 60) = 70
  // Col 2: 0 + (1/2 * 60) = 30
  assert.deepEqual(minWidths, [70, 30]);
});

test('Grid.calculateWidths caps extreme weights', () => {
    // Avg weight = (1 + 10) / 2 = 5.5. Max weight = 22.
    // Wait, if I have 1 and 100, avg is 50.5, max is 202. That won't cap.
    // If I have [1, 1, 1, 10], avg is 13/4 = 3.25. Max is 13. Capped 10 is fine.
    // If I have [1, 1, 1, 20], avg is 23/4 = 5.75. Max is 23.
    // Let's use [1, 1, 1, 1, 1, 100]. Avg = 105/6 = 17.5. Max = 70. 100 capped to 70.
    const configs = [
        { weight: 1 }, { weight: 1 }, { weight: 1 }, { weight: 1 }, { weight: 1 }, { weight: 100 }
    ];
    const widths = Grid.calculateWidths(100, configs);
    // Total capped weight = 1+1+1+1+1+70 = 75.
    // Each 1 weight gets 1/75 * 100 = 1.33 -> 1
    // 70 weight gets 70/75 * 100 = 93.33 -> 93
    // Sum = 1*5 + 93 = 98. Last col gets remainder: 93 + 2 = 95.
    assert.deepEqual(widths, [1, 1, 1, 1, 1, 95]);
});

test('Box renders with background and padding', () => {
  const box = new Box({ width: 10, background: '#000000', padding: 1 });
  const result = box.render('HI');

  // ANSI.bg('#000000') + ' ' + 'HI' + ' '.repeat(10 - 1 - 2 - 1) + ' ' + ANSI.reset
  // width 10, padding 1. Inner width 8. 'HI' is 2. Fill 6.
  // BG + ' ' (pad) + 'HI' + '      ' (fill) + ' ' (pad) + RESET
  const expected = `${ANSI.bg('#000000')} HI       ${ANSI.reset}`;
  assert.strictEqual(result, expected);
});

test('Box handles alignment', () => {
  const box = new Box({ width: 10, padding: 0 });

  assert.strictEqual(box.render('HI', { align: 'right' }), '        HI');
  assert.strictEqual(box.render('HI', { align: 'center' }), '    HI    ');
});

test('Transition.draw generates correct ANSI', () => {
  const result = Transition.draw(5, '#FF0000', '#0000FF');
  const expected = `${ANSI.fg('#FF0000')}${ANSI.bg('#0000FF')}▀▀▀▀▀${ANSI.reset}`;
  assert.strictEqual(result, expected);
});
