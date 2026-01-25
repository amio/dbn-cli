# DBPeek AI Agent Instructions

## Project Overview

DBPeek is a **zero-dependency** terminal-based SQLite database browser with an ncdu-style TUI (Text User Interface). Built for Node.js 22+ using only built-in modules (`node:sqlite`, `node:process`, `node:readline`).

## Architecture Pattern: MVC-Style Separation

The codebase follows a clear separation of concerns:

```
├── src/index.js          # Main application controller & lifecycle
├── src/adapter/          # Data layer (adapter pattern for DB abstraction)
│   ├── base.js          # Interface contract all adapters must implement
│   └── sqlite.js        # Node.js 22+ built-in DatabaseSync implementation
├── src/ui/              # View layer (rendering & navigation)
│   ├── screen.js        # Terminal management (raw mode, resize events)
│   ├── renderer.js      # All rendering logic (tables, details, schema, rows)
│   ├── navigator.js     # Navigation state machine (view stack & cursor)
│   └── theme.js         # ANSI codes & UI constants
└── src/utils/format.js  # Text formatting utilities
```

### Critical Architecture Decisions

1. **Adapter Pattern**: `base.js` defines the contract, making it easy to add PostgreSQL/MySQL adapters later. All database operations go through this interface.

2. **State Stack Navigation**: `navigator.js` maintains a stack of view states (`tables` → `table-detail` → `row-detail`). Pressing 'h/Esc' pops the stack. Never manipulate state directly in renderer.

3. **Renderer is Pure**: `renderer.js` receives state, returns strings. Zero side effects. All state mutations happen in `navigator.js` or `index.js`.

## Essential Patterns

### 1. ANSI Code Handling
When calculating string widths for alignment, **always strip ANSI codes first**:
```javascript
const cleanStr = str.replace(/\x1b\[[0-9;]*m/g, '');
const width = cleanStr.length;
```
Forgetting this causes misalignment bugs. See `format.js:getVisibleWidth()`.

### 2. Terminal Layout Math
The screen is divided as:
- 1 line: Title bar
- 1 line: Separator
- N lines: Content (height - 4)
- 1 line: Separator  
- 1 line: Help bar

In `buildTableDetail()`, content space is further divided:
- 1 line: "Data: (showing X-Y of Z)" info
- 1 line: Column headers (bold + underline)
- Remaining: Data rows

**Critical**: `state.visibleRows = height - 2` (subtract info line + header line). This tells `navigator.js` how many rows fit on screen for pagination.

### 3. Pagination Pattern
Data loading is offset-based:
```javascript
this.adapter.getTableData(tableName, { limit: 100, offset: dataOffset });
```
When cursor reaches bottom and more data exists, increment `dataOffset` and call `this.reload()`. See `navigator.js:moveDown()`.

### 4. View State Structure
Each view type has specific state properties:
- `tables`: `{type, tables, cursor, scrollOffset}`
- `table-detail`: `{type, tableName, schema, data, totalRows, dataOffset, dataCursor, visibleRows}`
- `schema-view`: `{type, tableName, schema, cursor, scrollOffset}`
- `row-detail`: `{type, tableName, row, rowIndex, schema}`

Never add properties not documented in these structures without updating ALL related code.

## Testing Philosophy

**Zero external test frameworks**. Uses Node.js 22+ built-in test runner:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

Test files use `node:test` and `node:assert`:
```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
```

Each test creates its own SQLite database, runs tests, then cleans up. See `test/adapter.test.js` for the pattern.

## Development Workflows

### Running the App
```bash
npm run dev path/to/database.db
# OR
node bin/dbn.js example.db
```

### Creating Test Databases
Use `scripts/create-example-db.js` as a template to create databases with various schemas for testing UI edge cases.

### Debugging TUI Applications
TUI apps capture stdin/stdout, making debugging tricky:
1. Use `console.error()` to write to stderr
2. Redirect stderr to a file: `node bin/dbp.js test.db 2> debug.log`
3. Or disable raw mode temporarily in `index.js:setupInput()`

## Common Pitfalls

### 1. Header Line Width Miscalculation
When building header lines with ANSI codes:
```javascript
// WRONG: Measures string with ANSI codes
if (headerLine.length < width) { ... }

// RIGHT: Strip codes first
const headerClean = headerLine.replace(/\x1b\[[0-9;]*m/g, '');
if (headerClean.length < width) { ... }
```

### 2. Forgetting to Update visibleRows
After modifying layout (adding/removing lines in table detail), update `state.visibleRows` or pagination breaks. The renderer calculates this and navigator reads it.

### 3. SQL Injection in Table Names
Always use parameterized queries or quote table names:
```javascript
// WRONG: Vulnerable to injection
this.db.prepare(`SELECT * FROM ${tableName}`)

// RIGHT: Quoted identifiers
this.db.prepare(`SELECT * FROM "${tableName}"`)
```

### 4. Terminal Width Overflow
Always pad/truncate lines to exact terminal width:
```javascript
if (cleanLine.length < width) {
  line += ' '.repeat(width - cleanLine.length);
} else {
  line = line.substring(0, width);
}
```
Failing to do this causes visual glitches.

## Language & Conventions

- **Language**: English for code, Chinese OK in docs (project has bilingual documentation)
- **Formatting**: 2-space indentation, no semicolons (existing style)
- **Exports**: ES modules only (`import/export`), no CommonJS
- **Error handling**: Throw descriptive errors, catch at application boundaries
- **Comments**: JSDoc for public methods, inline comments for complex logic

## File Naming & Structure

- `*.js` for all JavaScript (ES modules)
- `*.test.js` for test files (auto-discovered by test runner)
- `*.md` for documentation
- Utility scripts in `scripts/` directory
 - Single entry point: `bin/dbn.js` (shebang for CLI)

## When Adding Features

1. **New view type**: Add to `navigator.js` state stack, implement render method in `renderer.js`, add key handlers in `index.js`
2. **New database adapter**: Extend `base.js`, implement all methods, add to `adapter/` directory
3. **UI improvements**: All ANSI codes/borders/colors go in `theme.js`, all text formatting in `format.js`
4. **Tests**: Add to `test/` directory, follow existing patterns, ensure cleanup in `after()` hooks

## Key Dependencies (All Built-in)

- `node:sqlite` - DatabaseSync API (Node.js 22.5.0+)
- `node:process` - stdin/stdout/exit
- `node:readline` - keypress events via `emitKeypressEvents()`
- `node:fs` - file existence checks
- `node:test` - test runner and assertions

**No npm dependencies**. This is a design constraint for simplicity and security.
