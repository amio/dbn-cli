import { test } from 'node:test';
import { TuiRunner } from './tui-runner.ts';

test('Main application smoke test', async () => {
  const tui = new TuiRunner(100, 30);

  await tui.spawn('node', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', 'bin/dbn.ts', 'test.db']);

  try {
    // Should see "quit" in the footer
    await tui.expectVisible('quit');

    // Should see "users" table
    await tui.expectVisible('users');

    // Should see the breadcrumb/title bar
    await tui.expectVisible('test.db');

    // Press q to quit
    tui.write('q');

    await tui.waitExit();
  } finally {
    tui.kill();
  }
});
