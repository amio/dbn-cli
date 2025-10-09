# DBPeek

A lightweight terminal-based SQLite database browser with an ncdu-style interface.

## Features

- 🚀 **Zero dependencies** - Uses Node.js 22+ built-in `node:sqlite`
- 📊 **Full-screen TUI** - ncdu-inspired keyboard navigation
- ⚡ **Fast** - Native SQLite performance
- 🔍 **Browse tables** - View schema and data with pagination
- 🎯 **Simple** - Intuitive keyboard shortcuts

## Requirements

- Node.js >= 22.5.0

## Installation

```bash
npm install -g dbpeek
```

Or run locally:

```bash
npm install
npm link
```

## Usage

```bash
dbp <path-to-sqlite-db-file>
```

Example:

```bash
dbp ./mydatabase.db
```

## Keyboard Shortcuts

### Tables List View
- `j` / `↓` - Move down
- `k` / `↑` - Move up
- `Enter` / `l` - Open table details
- `g` - Jump to top
- `G` - Jump to bottom
- `q` - Quit

### Table Detail View
- `j` / `↓` - Move to next row
- `k` / `↑` - Move to previous row
- `Enter` / `l` - View selected row details
- `s` - Toggle schema visibility
- `h` / `Esc` - Back to tables list
- `g` - Jump to top
- `G` - Jump to bottom
- `r` - Reload data
- `q` - Quit

### Row Detail View
- `h` / `Esc` - Back to table view
- `q` - Quit

## Architecture

### Adapter Pattern
The project uses an adapter pattern to abstract database operations, making it easy to add support for other database types in the future:

```
src/adapter/
├── base.js      # Base adapter interface
└── sqlite.js    # SQLite implementation using node:sqlite
```

### UI Components
```
src/ui/
├── screen.js     # Full-screen terminal management
├── renderer.js   # ncdu-style rendering
├── navigator.js  # Navigation state and logic
└── theme.js      # Colors and styling
```

## Future Enhancements

- [ ] Search functionality (`/` key)
- [ ] Support for PostgreSQL and MySQL
- [ ] Support for remote databases
- [ ] Custom SQL queries
- [ ] Export data to CSV/JSON
- [ ] Configuration file support

## Development

```bash
# Install dependencies (none!)
npm install

# Run in development mode
npm run dev path/to/database.db

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

See [TESTING.md](./TESTING.md) for detailed testing documentation.

## License

MIT
