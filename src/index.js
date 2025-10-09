import { stdin, stdout, exit } from 'node:process';
import { existsSync } from 'node:fs';
import * as readline from 'node:readline';
import { SQLiteAdapter } from './adapter/sqlite.js';
import { Screen } from './ui/screen.js';
import { Renderer } from './ui/renderer.js';
import { Navigator } from './ui/navigator.js';

/**
 * Main application class
 */
export class DBPeek {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.adapter = null;
    this.screen = null;
    this.renderer = null;
    this.navigator = null;
    this.isRunning = false;
  }

  /**
   * Initialize the application
   */
  init() {
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
      console.error(`Error: ${error.message}`);
      exit(1);
    }

    // Initialize UI components
    this.screen = new Screen();
    this.renderer = new Renderer(this.screen);
    this.navigator = new Navigator(this.adapter);

    // Initialize navigator with tables
    try {
      this.navigator.init();
    } catch (error) {
      console.error(`Error loading tables: ${error.message}`);
      this.cleanup();
      exit(1);
    }
  }

  /**
   * Start the application
   */
  start() {
    this.isRunning = true;

    // Enter full screen mode
    this.screen.enter();

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
  setupInput() {
    // Enable raw mode for key-by-key input
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    // Enable keypress events
    readline.emitKeypressEvents(stdin);

    stdin.on('keypress', (str, key) => {
      if (!this.isRunning) return;

      this.handleKeypress(str, key);
    });
  }

  /**
   * Handle keypress events
   */
  handleKeypress(str, key) {
    // Handle Ctrl+C
    if (key.ctrl && key.name === 'c') {
      this.quit();
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
    }
  }

  /**
   * Render the current state
   */
  render() {
    try {
      const state = this.navigator.getState();
      this.renderer.render(state, this.dbPath);
    } catch (error) {
      // If rendering fails, try to show error and quit gracefully
      this.cleanup();
      console.error(`Render error: ${error.message}`);
      exit(1);
    }
  }

  /**
   * Quit the application
   */
  quit() {
    this.isRunning = false;
    this.cleanup();
    exit(0);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Exit full screen mode
    if (this.screen) {
      this.screen.exit();
    }

    // Close database connection
    if (this.adapter) {
      this.adapter.close();
    }

    // Restore terminal
    if (stdin.isTTY) {
      stdin.setRawMode(false);
      stdin.pause();
    }
  }
}

/**
 * Main entry point
 */
export function main(args) {
  const dbPath = args[0];

  if (!dbPath) {
    console.error('Usage: dbp <path-to-sqlite-db-file>');
    console.error('');
    console.error('Example:');
    console.error('  dbp ./mydatabase.db');
    exit(1);
  }

  const app = new DBPeek(dbPath);

  // Handle process termination
  process.on('SIGINT', () => app.quit());
  process.on('SIGTERM', () => app.quit());
  process.on('exit', () => app.cleanup());

  // Initialize and start
  app.init();
  app.start();
}
