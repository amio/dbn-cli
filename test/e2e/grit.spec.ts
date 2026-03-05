import { test } from 'node:test';
import { TuiRunner } from './tui-runner.ts';

test('Grit visual components', async () => {
  const tui = new TuiRunner(40, 10);

  await tui.spawn('node', ['--experimental-strip-types', 'test/e2e/grit.fixture.ts']);

  try {
    // Wait for the render
    await tui.expectVisible('GRIT TEST APP');

    // Check colors
    await tui.expectBgColor('GRIT TEST APP', 'ff5733');

    // Transition line (Unicode block character)
    await tui.expectVisible('▀▀▀▀');

    // The transition line has foreground #FF5733 and background #3357FF
    await tui.expectFgColor('▀▀▀▀', 'ff5733');
    await tui.expectBgColor('▀▀▀▀', '3357ff');

    // Persistence check
    await tui.expectBgColor('Reset', '33ff57');
  } finally {
    tui.kill();
  }
});
