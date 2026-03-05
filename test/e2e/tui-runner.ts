import xtermHeadless from '@xterm/headless';
const { Terminal } = xtermHeadless;
import nodePty from 'node-pty';
const { spawn } = nodePty;
import assert from 'node:assert';

export class TuiRunner {
  terminal: any;
  pty: any;

  constructor(cols = 100, rows = 30) {
    this.terminal = new Terminal({
      cols,
      rows,
      allowProposedApi: true
    });
  }

  async spawn(command: string, args: string[], options: any = {}) {
    this.pty = spawn(command, args, {
      name: 'xterm-256color',
      cols: this.terminal.cols,
      rows: this.terminal.rows,
      cwd: process.cwd(),
      env: { ...process.env, TERM: 'xterm-256color', ...options.env },
      ...options
    });

    this.pty.onData((data: string) => {
      this.terminal.write(data);
    });

    // Wait a bit for the process to start
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  write(data: string) {
    this.pty.write(data);
  }

  resize(cols: number, rows: number) {
    this.terminal.resize(cols, rows);
    this.pty.resize(cols, rows);
  }

  async waitForText(text: string, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (this.getScreenText().includes(text)) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('Current Screen:\n' + this.getScreenText());
    throw new Error(`Timeout waiting for text: "${text}"`);
  }

  getScreenText() {
    const lines: string[] = [];
    for (let i = 0; i < this.terminal.rows; i++) {
      const line = this.terminal.buffer.active.getLine(i);
      if (line) {
        lines.push(line.translateToString());
      }
    }
    return lines.join('\n');
  }

  getCellAtText(text: string) {
    for (let i = 0; i < this.terminal.rows; i++) {
      const line = this.terminal.buffer.active.getLine(i);
      if (!line) continue;
      const str = line.translateToString();
      const index = str.indexOf(text);
      if (index !== -1) {
        return line.getCell(index);
      }
    }
    return null;
  }

  async expectVisible(text: string, timeout = 5000) {
    await this.waitForText(text, timeout);
  }

  async expectBgColor(text: string, expectedHex: string) {
    const cell = this.getCellAtText(text);
    assert(cell, `Could not find text "${text}" to check background color`);
    // Mask color value to remove type bits (TrueColor/P16/P256 bits)
    const actualHex = (cell.getBgColor() & 0xFFFFFF).toString(16).padStart(6, '0');
    assert.strictEqual(actualHex.toLowerCase(), expectedHex.toLowerCase().replace('#', ''), `Background color mismatch for "${text}"`);
  }

  async expectFgColor(text: string, expectedHex: string) {
    const cell = this.getCellAtText(text);
    assert(cell, `Could not find text "${text}" to check foreground color`);
    const actualHex = (cell.getFgColor() & 0xFFFFFF).toString(16).padStart(6, '0');
    assert.strictEqual(actualHex.toLowerCase(), expectedHex.toLowerCase().replace('#', ''), `Foreground color mismatch for "${text}"`);
  }

  async waitExit() {
    return new Promise<void>((resolve) => {
      this.pty.onExit(() => resolve());
    });
  }

  kill() {
    if (this.pty) {
      this.pty.kill();
    }
  }
}
