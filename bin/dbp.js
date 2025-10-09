#!/usr/bin/env node

import { main } from '../src/index.js';

// Get command line arguments (skip node and script path)
const args = process.argv.slice(2);

// Run the application
main(args);
