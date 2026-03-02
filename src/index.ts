import { exit } from 'node:process';
import { existsSync, readFileSync } from 'node:fs';
import { SQLiteAdapter } from './adapter/sqlite.ts';
import { Screen } from './ui/screen.ts';
import { Renderer } from './ui/renderer.ts';
import { Navigator } from './ui/navigator.ts';
import type { KeyEvent } from '@opentui/core';

/**
 * Main application class
 */
export class DBPeek {
  private dbPath: string;
  private adapter: SQLiteAdapter | null = null;
  private screen: Screen | null = null;
  private renderer: Renderer | null = null;
  private navigator: Navigator | null = null;
  private isRunning: boolean = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Initialize the application
   */
  async init(): Promise<void> {
    // Validate database file
    if (!existsSync(this.dbPath)) {
      console.error(`Error: Database file not found: ${this.dbPath}`);
      exit(1);
    }

    // Create adapter and connect
    try {
      this.adapter = new SQLiteAdapter();
      this.adapter.connect(this.dbPath);
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      exit(1);
    }

    // Initialize UI components
    this.screen = new Screen();
    await this.screen.enter(); // OpenTUI needs async enter

    this.renderer = new Renderer(this.screen);
    this.navigator = new Navigator(this.adapter);

    // Initialize navigator with tables
    try {
      this.navigator.init();
    } catch (error) {
      console.error(`Error loading tables: ${(error as Error).message}`);
      this.cleanup();
      exit(1);
    }
  }

  /**
   * Start the application
   */
  start(): void {
    if (!this.screen || !this.navigator || !this.screen.renderer) {
      throw new Error('Application not initialized');
    }

    this.isRunning = true;

    // Set up keyboard input
    this.setupInput();

    // Handle screen resize
    this.screen.on('resize', () => {
      this.render();
    });

    // Initial render
    this.render();
  }

  /**
   * Set up keyboard input handling
   */
  private setupInput(): void {
    if (!this.screen?.renderer) return;

    this.screen.renderer.keyInput.on('keypress', (key: KeyEvent) => {
      if (!this.isRunning) return;
      this.handleKeypress(key);
    });
  }

  /**
   * Handle keypress events
   */
  private handleKeypress(key: KeyEvent): void {
    if (!this.navigator) return;

    // Handle Ctrl+C
    if (key.ctrl && key.name === 'c') {
      this.quit();
      return;
    }

    if (key.name === 'y' && this.navigator.hasPendingDelete()) {
      this.navigator.confirmDelete();
      this.render();
      return;
    }

    if (
      this.navigator.hasPendingDelete() &&
      (key.name === 'escape' || key.name === 'h' || key.name === 'left')
    ) {
      this.navigator.cancelDelete();
      this.render();
      return;
    }

    if (this.navigator.hasPendingDelete()) {
      return;
    }

    // Handle different keys
    switch (key.name) {
      case 'q':
        this.quit();
        break;

      case 'j':
      case 'down':
        this.navigator.moveDown();
        this.render();
        break;

      case 'k':
      case 'up':
        this.navigator.moveUp();
        this.render();
        break;

      case 'return':
      case 'l':
      case 'right':
        this.navigator.enter();
        this.render();
        break;

      case 'h':
      case 'left':
      case 'escape':
        this.navigator.back();
        this.render();
        break;

      case 'g':
        if (key.shift) {
          // G - jump to bottom
          this.navigator.jumpToBottom();
        } else {
          // g - jump to top
          this.navigator.jumpToTop();
        }
        this.render();
        break;

      case 'r':
        // Reload current view
        this.navigator.reload();
        this.render();
        break;

      case 'backspace': {
        const deleteState = this.navigator.getState();
        if (deleteState.type === 'table-detail' || deleteState.type === 'row-detail') {
          this.navigator.requestDelete();
          this.render();
        }
        break;
      }

      case 's':
        // Toggle schema view in full screen mode
        const currentState = this.navigator.getState();
        if (currentState.type === 'table-detail') {
          this.navigator.viewSchema();
          this.render();
        } else if (currentState.type === 'schema-view') {
          this.navigator.back();
          this.render();
        }
        break;

      case 'i':
        // Toggle core health overview
        const infoState = this.navigator.getState();
        if (infoState.type === 'health') {
          this.navigator.back();
        } else if (infoState.type === 'tables') {
          this.navigator.viewHealth();
        }
        this.render();
        break;
    }
  }

  /**
   * Render the current state
   */
  private render(): void {
    if (!this.renderer || !this.navigator) return;

    try {
      const state = this.navigator.getState();
      this.renderer.render(state, this.dbPath);
    } catch (error) {
      // If rendering fails, try to show error and quit gracefully
      this.cleanup();
      console.error(`Render error: ${(error as Error).message}`);
      exit(1);
    }
  }

  /**
   * Quit the application
   */
  quit(): void {
    this.isRunning = false;
    this.cleanup();
    exit(0);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Exit full screen mode
    if (this.screen) {
      this.screen.exit();
    }

    // Close database connection
    if (this.adapter) {
      this.adapter.close();
    }
  }
}

/**
 * Main entry point
 */
export async function main(args: string[]): Promise<void> {
  // Simple CLI parsing: support flags (-v/--version, -h/--help)
  const flags = new Set(args.filter(a => a.startsWith('-')));
  const dbPath = args.find(a => !a.startsWith('-'));

  const printHelp = () => {
    process.stdout.write(`Usage: dbn [options] <path-to-sqlite-db-file>\n\n`);
    process.stdout.write(`Options:\n`);
    process.stdout.write(`  -h, --help       Show help information\n`);
    process.stdout.write(`  -v, --version    Show version\n\n`);
    process.stdout.write(`Example:\n`);
    process.stdout.write(`  dbn ./mydatabase.db\n`);
  };

  const printVersion = () => {
    try {
      const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version?: string };
      process.stdout.write((pkg.version ?? 'unknown') + '\n');
    } catch {
      process.stdout.write('unknown\n');
    }
  };

  if (flags.has('-h') || flags.has('--help')) {
    printHelp();
    exit(0);
  }

  if (flags.has('-v') || flags.has('--version')) {
    printVersion();
    exit(0);
  }

  // If no db path provided, show help by default
  if (!dbPath) {
    printHelp();
    exit(0);
  }

  const app = new DBPeek(dbPath);

  // Handle process termination
  process.on('SIGINT', () => app.quit());
  process.on('SIGTERM', () => app.quit());
  process.on('exit', () => app.cleanup());

  // Initialize and start
  await app.init();
  app.start();
}
