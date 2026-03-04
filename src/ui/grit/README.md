# GRIT (Grid-TUI)

GRIT is a lightweight TUI layout library built for Node.js. It focuses on a modern "OpenCode" aesthetic using solid background blocks and Unicode half-height characters for smooth transitions, rather than traditional box-drawing characters.

## Design Philosophy

- **Grid-based**: Everything is a grid or a box.
- **No Lines**: Uses background colors and Unicode blocks (`▀`, `▄`) for visual separation.
- **TrueColor**: Native support for 24-bit ANSI colors.
- **Width-Aware**: Correctly handles CJK characters and emojis.

## API

### `Box`

A container that handles background color, padding, and alignment.

```typescript
import { Box } from './grit/index.ts';

const box = new Box({
  width: 80,
  background: '#1A1A1A',
  padding: 1
});

const line = box.render("Hello World", { align: 'center' });
```

### `Transition`

Creates a half-height vertical transition between two background colors.

```typescript
import { Transition } from './grit/index.ts';

// Top half is #1A1A1A, bottom half is #0D0D0D
const line = Transition.draw(80, '#1A1A1A', '#0D0D0D');
```

### `Grid`

Calculates weighted column widths for tabular layouts.

```typescript
import { Grid } from './grit/index.ts';

const columns = Grid.calculateWidths(100, [
  { weight: 1 }, // Flexible
  { weight: 2 }, // Twice as wide
  { minWidth: 10 } // Fixed minimum
]);
```

## Internal Utilities

- `ANSI`: Low-level ANSI escape sequence generators.
- `wrapAnsiBg`: Helper to persist background colors across ANSI resets.
