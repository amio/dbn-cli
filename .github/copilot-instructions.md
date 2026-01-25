# DBPeek AI Agent Instructions

## Project Overview

DBPeek (dbn-cli) is a lightweight terminal-based SQLite database browser with an ncdu-style TUI. The source is written in TypeScript and runs on Node.js 24+ using built-in modules; it keeps third-party deps minimal (currently `string-width`).

## Architecture Pattern: Clear Separation (View / Navigator / Adapter)

The repo layout to look at:

```
├── bin/                  # CLI entry (TypeScript with shebang)
├── src/
│   ├── index.ts          # Main application controller & lifecycle
│   ├── adapter/          # Database adapters (extend DatabaseAdapter)
│   │   ├── base.ts
│   │   └── sqlite.ts     # node:sqlite DatabaseSync adapter
│   ├── ui/               # View layer (rendering & navigation)
│   │   ├── screen.ts
│   │   ├── renderer.ts
│   │   ├── navigator.ts
│   │   └── theme.ts
│   └── utils/format.ts
├── test/                 # Tests (TypeScript)
└── scripts/
```

### Critical Architecture Decisions

1. Adapter pattern: `src/adapter/base.ts` defines the contract; all DB access goes through adapters (see `sqlite.ts`).
2. Navigator maintains a view-stack (e.g. `tables` → `table-detail` → `row-detail`, `schema-view`, `health`) and is the only place that mutates navigation state.
3. Renderer is pure-ish: it builds strings from state and writes them to `Screen`. Side effects (state changes, DB queries) belong in `Navigator` or `Adapter`.

## Essential Patterns

1. ANSI handling: always strip ANSI when measuring visible width. The code uses a regex (see `utils/format.ts:getVisibleWidth`) and `string-width` to handle CJK/emoji.

2. Terminal layout math: renderer composes lines like this:

- 1 line: Title bar
- 1 line: Separator
- N lines: Content (renderer passes `height - 3` as content height)
- 1 line: Help bar

In table-detail the renderer reserves 1 header line, so the navigator should use `state.visibleRows = height - 1` (subtract header) when the table-detail view is rendered.

3. Pagination: adapters support offset/limit. Example:

```ts
this.adapter.getTableData(tableName, { limit: 50, offset: dataOffset });
```

When cursor reaches the bottom and more rows exist, increment `dataOffset` and reload (see `navigator.ts:moveDown`).

4. View state shapes (refer to `src/types.ts`): `tables`, `table-detail`, `schema-view`, `row-detail`, `health` — keep these shapes in sync with navigator/renderer.

## Testing

Tests are written in TypeScript using Node's built-in test runner:

```bash
npm test              # runs: node --test --experimental-strip-types test/*.test.ts
npm run test:watch
npm run test:coverage
```

Tests use `node:test` and `node:assert`; each test creates and cleans up its own SQLite database (see `test/adapter.test.ts`).

## Development & Running

- CLI entry: `bin/dbn.ts` (shebang uses `--experimental-strip-types` so the TypeScript files run directly with Node).
- Run directly: `node bin/dbn.ts path/to/database.db` or use the `npm run dev` script if configured.

### Creating example DBs
Use scripts in `scripts/` (e.g. `create-example-db.ts`, `create-unicode-test-db.ts`) to generate test databases.

### Debugging TUI

1. Use `console.error()` for debug output (writes to stderr).
2. Redirect stderr to a file: `node bin/dbn.ts test.db 2> debug.log`.
3. You can disable raw mode temporarily in `src/index.ts:setupInput()` while debugging.

## Common Pitfalls

- Header width: always measure visible width (strip ANSI / use `string-width`).
- Update `state.visibleRows` when layout changes (table-detail uses `height - 1` for visible rows).
- Quote identifiers or parameterize queries to avoid SQL injection when using dynamic table names.
- Pad/truncate output to exact terminal width to avoid visual glitches; renderer uses a `safeWidth = width - 1` convention to avoid wrapping.

## Language & Conventions

- Source: TypeScript (ES modules). Keep `import/export` style.
- Formatting: 2-space indentation. The codebase uses minimal semicolons (follow existing style).
- Error handling: throw descriptive errors and catch at application boundaries.

## File Naming & Structure

- `*.ts` for all source and test files
- `*.test.ts` for tests
- `bin/*.ts` for CLI entry(s) — files run with Node's `--experimental-strip-types` (shebang)

## When Adding Features

1. New view: add state in `navigator.ts`, implement rendering in `renderer.ts`, add key handlers in `src/index.ts`.
2. New adapter: extend `src/adapter/base.ts`, implement methods, add tests in `test/`.
3. UI changes: keep colors/borders in `src/ui/theme.ts` and formatting in `src/utils/format.ts`.
4. Tests: add `*.test.ts`, ensure each test creates/cleans DB resources in `after()` hooks.

## Key Dependencies

- Node 24+ built-ins: `node:sqlite` (DatabaseSync), `node:test`, `node:readline`, `node:fs`, `node:process`.
- Runtime dependency: `string-width` (accurate visible width for Unicode / emoji).

Keep this document in sync with `src/` when view shapes, key bindings, or layout math change.
