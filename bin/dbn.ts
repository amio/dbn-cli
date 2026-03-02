#!/usr/bin/env bun

import { main } from '../src/index.ts';

// Get command line arguments (skip node and script path)
const args = process.argv.slice(2);

// Run the application
main(args).catch(err => {
  console.error(err);
  process.exit(1);
});
