import { test } from 'node:test';
import { TuiRunner } from './tui-runner.ts';
import assert from 'node:assert';

test('Performance: resize events are debounced', async () => {
  const tui = new TuiRunner(100, 30);

  await tui.spawn('node', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', 'bin/dbn.ts', 'perf-test.db']);

  try {
    await tui.expectVisible('items');

    const startTime = Date.now();

    // Rapidly resize 10 times
    for (let i = 0; i < 10; i++) {
      tui.resize(100 + i, 30);
    }

    // It should still be responsive and show content eventually
    await tui.expectVisible('items');

    const duration = Date.now() - startTime;
    assert(duration < 2000, `Resize burst took too long: ${duration}ms`);

    tui.write('q');
    await tui.waitExit();
  } finally {
    tui.kill();
  }
});

test('Performance: scrolling in dense data is smooth', async () => {
  const tui = new TuiRunner(100, 30);

  await tui.spawn('node', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', 'bin/dbn.ts', 'perf-test.db']);

  try {
    await tui.expectVisible('items');

    // Enter the table
    tui.write('\r');
    await tui.expectVisible('row 1/');

    const startTime = Date.now();

    // Scroll down 50 times rapidly
    for (let i = 0; i < 50; i++) {
      tui.write('j');
    }

    // Should have updated the row indicator
    await tui.expectVisible('row 51/100');

    const duration = Date.now() - startTime;
    // 50 updates should be very fast with incremental rendering.
    assert(duration < 2000, `Rapid scrolling took too long: ${duration}ms`);

    tui.write('q');
    await tui.waitExit();
  } finally {
    tui.kill();
  }
});
