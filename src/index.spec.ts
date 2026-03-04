import { test, expect } from '@microsoft/tui-test';

test('Main application smoke test', async ({ terminal }) => {
  // Run the app with a sample db
  // Increase terminal size to ensure content is visible
  terminal.resize(100, 30);
  terminal.submit('node --experimental-strip-types bin/dbn.ts test.db');

  // Should see the breadcrumb/title bar
  await expect(terminal.getByText('test.db', { strict: false })).toBeVisible();

  // Should see some tables (assuming test.db exists and has tables)
  // We'll check for common UI elements
  // Tables view usually shows "X/Y tables" in the right part of title bar
  await expect(terminal.getByText('select', { strict: false })).toBeVisible();

  // Press q to quit
  terminal.write('q');
});
