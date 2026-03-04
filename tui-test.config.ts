import { defineConfig, Shell } from '@microsoft/tui-test';

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.ts',
  shell: Shell.Bash,
  expect: {
    timeout: 5000,
  }
});
