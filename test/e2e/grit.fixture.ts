import { Box, Transition, Grid } from '../../src/ui/grit/index.ts';

const width = 40;
const height = 10;

// Clear screen
process.stdout.write('\x1bc');

// 1. Box with alignment and colors
const headerBox = new Box({ width, background: '#FF5733', padding: 1 });
console.log(headerBox.render('GRIT TEST APP', { align: 'center' }));

// 2. Transition
console.log(Transition.draw(width, '#FF5733', '#3357FF'));

// 3. Grid
const configs = [{ weight: 1 }, { weight: 2 }];
const widths = Grid.calculateWidths(width - 2, configs);
const gridBox = new Box({ width, background: '#3357FF', padding: 1 });
const row = `Col1(${widths[0]})`.padEnd(widths[0]) + `Col2(${widths[1]})`.padEnd(widths[1]);
console.log(gridBox.render(row));

// 4. Persistence check (ANSI resets)
const complexBox = new Box({ width, background: '#33FF57', padding: 1 });
const complexRow = `Normal \x1b[0m Reset \x1b[31m Red`;
console.log(complexBox.render(complexRow));

// Fill the rest
const bgBox = new Box({ width, background: '#000000', padding: 1 });
for(let i = 0; i < 5; i++) {
    console.log(bgBox.render(''));
}
