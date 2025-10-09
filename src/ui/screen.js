import { stdin, stdout } from 'node:process';
import { EventEmitter } from 'node:events';

/**
 * Screen manager for full-screen TUI applications
 * Handles alternate screen buffer and terminal state
 */
export class Screen extends EventEmitter {
  constructor() {
    super();
    this.width = stdout.columns || 80;
    this.height = stdout.rows || 24;
    this.isActive = false;
  }

  /**
   * Enter alternate screen buffer and set up terminal
   */
  enter() {
    if (this.isActive) return;

    // Enter alternate screen buffer
    stdout.write('\x1b[?1049h');
    
    // Hide cursor
    stdout.write('\x1b[?25l');
    
    // Clear screen
    stdout.write('\x1b[2J\x1b[H');
    
    // Listen for terminal resize
    this.resizeHandler = () => {
      this.width = stdout.columns || 80;
      this.height = stdout.rows || 24;
      this.emit('resize', { width: this.width, height: this.height });
    };
    process.on('SIGWINCH', this.resizeHandler);
    
    this.isActive = true;
  }

  /**
   * Exit alternate screen buffer and restore terminal
   */
  exit() {
    if (!this.isActive) return;

    // Show cursor
    stdout.write('\x1b[?25h');
    
    // Exit alternate screen buffer
    stdout.write('\x1b[?1049l');
    
    // Remove resize listener
    if (this.resizeHandler) {
      process.off('SIGWINCH', this.resizeHandler);
    }
    
    this.isActive = false;
  }

  /**
   * Clear the screen
   */
  clear() {
    stdout.write('\x1b[2J\x1b[H');
  }

  /**
   * Move cursor to specific position
   * @param {number} row - Row (1-indexed)
   * @param {number} col - Column (1-indexed)
   */
  moveCursor(row, col) {
    stdout.write(`\x1b[${row};${col}H`);
  }

  /**
   * Write text to the screen
   * @param {string} text - Text to write
   */
  write(text) {
    stdout.write(text);
  }

  /**
   * Write text at specific position
   * @param {number} row - Row (1-indexed)
   * @param {number} col - Column (1-indexed)
   * @param {string} text - Text to write
   */
  writeAt(row, col, text) {
    this.moveCursor(row, col);
    this.write(text);
  }
}
