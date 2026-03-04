import { test, expect } from '@microsoft/tui-test';

test('Grit visual components', async ({ terminal }) => {
  // Use node to run the test app
  // Using experimental-strip-types for simplicity
  terminal.submit('node --experimental-strip-types src/ui/grit/test-app.ts');

  // Wait for the render
  await expect(terminal.getByText('GRIT TEST APP')).toBeVisible();

  // Check colors (Expected might be without # or case sensitive in found check)
  await expect(terminal.getByText('GRIT TEST APP')).toHaveBgColor('ff5733');

  // Transition line (Unicode block character)
  await expect(terminal.getByText('▀▀▀▀', { strict: false })).toBeVisible();
  // The transition line has foreground #FF5733 and background #3357FF
  await expect(terminal.getByText('▀▀▀▀', { strict: false })).toHaveFgColor('ff5733');
  await expect(terminal.getByText('▀▀▀▀', { strict: false })).toHaveBgColor('3357ff');

  // Persistence check
  await expect(terminal.getByText('Reset')).toHaveBgColor('33ff57');
});
