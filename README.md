# dbn - DB Navigator

A lightweight terminal SQLite browser with an ncdu-style interface.

## Features

- **Minimal dependencies** - Uses Node.js 24+ built-in `node:sqlite` module
- **Full-screen TUI** - ncdu-inspired keyboard navigation

## Installation

```bash
npm install -g dbn-cli
```

## Usage

```bash
dbn <path-to-sqlite-db-file>
```

## Keyboard Shortcuts

- `j/k` or `↓/↑` - Navigate
- `Enter` or `l` - Open/view details
- `h` or `Esc` - Go back
- `s` - Toggle schema view
- `r` - Reload data
- `g/G` - Jump to top/bottom
- `q` - Quit

## Development

```bash
npm run dev path/to/database.db   # Run in dev mode
npm test                          # Run tests
```

## License

MIT
