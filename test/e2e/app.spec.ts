import { test } from 'node:test';
import { TuiRunner } from './tui-runner.ts';

test('Main application smoke test', async () => {
  const tui = new TuiRunner(100, 30);

  await tui.spawn(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', 'bin/dbn.ts', 'test.db']);

  try {
    // Should see "quit" in the footer
    await tui.expectVisible('quit');

    // Should see "users" table
    await tui.expectVisible('users');

    // Should see the breadcrumb/title bar
    await tui.expectVisible('test.db');

    // Enter 'users' table
    tui.write('\r'); // Enter key
    await tui.expectVisible('Alice');
    await tui.expectVisible('bob@example.com');

    // Enter row detail for Alice
    tui.write('\r');
    await tui.expectVisible('row 1');
    await tui.expectVisible('email');
    await tui.expectVisible('alice@example.com');

    // Switch to next record (Bob)
    tui.write('j');
    await tui.expectVisible('row 2');
    await tui.expectVisible('bob@example.com');

    // Go back to table view
    tui.write('\x1b[D'); // Left arrow
    await tui.expectVisible('users');
    // Bob should be selected in the list (if sync works)
    // We can check if "Bob" has the selection color, but simple visibility is already checked by expectVisible

    // Press q to quit
    tui.write('q');
    await tui.waitExit();
  } finally {
    tui.kill();
  }
});
