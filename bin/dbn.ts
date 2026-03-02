#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { main } from '../src/index.ts';

// Get command line arguments (skip node and script path)
const args = process.argv.slice(2);

// Run the application
main(args);
