# dbn

A zero-dependency terminal SQLite browser with ncdu-style interface.

## Features

- **Zero dependencies** - Uses Node.js 22+ built-in `node:sqlite`
- **TypeScript** - Written in TypeScript with native Node.js 22.18+ support
- **Full-screen TUI** - ncdu-inspired keyboard navigation
- **Fast** - Native SQLite performance

## Requirements

- Node.js >= 22.18.0

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
npm run dev path/to/database.db  # Run in dev mode
npm test                          # Run tests
```

## License

MIT
