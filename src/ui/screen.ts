import { EventEmitter } from 'node:events';
import { createCliRenderer, type Renderer as OpenTUIRenderer } from '@opentui/core';
import type { ScreenDimensions } from '../types.ts';

/**
 * Screen manager for full-screen TUI applications
 * Handles OpenTUI renderer lifecycle
 */
export class Screen extends EventEmitter {
  width: number = 80;
  height: number = 24;
  private isActive: boolean = false;
  renderer: OpenTUIRenderer | null = null;

  constructor() {
    super();
  }

  /**
   * Enter alternate screen buffer and set up terminal via OpenTUI
   */
  async enter(): Promise<void> {
    if (this.isActive) return;

    this.renderer = await createCliRenderer({
      exitOnCtrlC: false, // We handle it in DBPeek
    });

    this.width = this.renderer.width;
    this.height = this.renderer.height;

    this.renderer.on('resize', (width, height) => {
      this.width = width;
      this.height = height;
      this.emit('resize', { width, height } as ScreenDimensions);
    });

    this.isActive = true;
  }

  /**
   * Exit alternate screen buffer and restore terminal
   */
  exit(): void {
    if (!this.isActive || !this.renderer) return;

    // OpenTUI handles cleanup internally, but we can't manually exit easily in current core version
    // without just letting the process end or if it had an exit method.
    // However, createCliRenderer sets up everything.
    
    this.isActive = false;
  }

  /**
   * Clear the screen
   */
  clear(): void {
    // OpenTUI manages clearing and redraws
  }

  /**
   * Write text to the screen (Legacy, not used with OpenTUI's declarative API)
   */
  write(_text: string): void {
  }
}
