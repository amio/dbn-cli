#!/usr/bin/env node

/**
 * Test statistics summary
 */

import { execSync } from 'node:child_process';

console.log('🧪 DBPeek Test Statistics\n');
console.log('═'.repeat(60));

try {
  // Run tests with coverage
  const output = execSync('npm run test:coverage 2>&1', { encoding: 'utf-8' });
  
  // Extract test counts
  const testsMatch = output.match(/ℹ tests (\d+)/);
  const passMatch = output.match(/ℹ pass (\d+)/);
  const failMatch = output.match(/ℹ fail (\d+)/);
  const suitesMatch = output.match(/ℹ suites (\d+)/);
  
  if (testsMatch && passMatch && suitesMatch) {
    console.log('\n📊 Test Results:');
    console.log(`   Total Tests:    ${testsMatch[1]}`);
    console.log(`   Test Suites:    ${suitesMatch[1]}`);
    console.log(`   ✅ Passed:      ${passMatch[1]}`);
    console.log(`   ❌ Failed:      ${failMatch ? failMatch[1] : '0'}`);
  }
  
  // Extract coverage
  const coverageSection = output.match(/ℹ all files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
  
  if (coverageSection) {
    console.log('\n📈 Code Coverage:');
    console.log(`   Lines:          ${coverageSection[1]}%`);
    console.log(`   Branches:       ${coverageSection[2]}%`);
    console.log(`   Functions:      ${coverageSection[3]}%`);
  }
  
  // Test files
  console.log('\n📁 Test Files:');
  console.log('   - test/adapter.test.js  (SQLiteAdapter - 10 tests)');
  console.log('   - test/format.test.js   (Format Utils - 23 tests)');
  console.log('   - test/theme.test.js    (Theme - 10 tests)');
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n✨ All tests passed! Test suite is healthy.\n');
  
} catch (error) {
  console.error('\n❌ Tests failed!\n');
  console.error(error.stdout || error.message);
  process.exit(1);
}
