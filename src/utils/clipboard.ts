import { spawn } from 'node:child_process';
import { platform } from 'node:os';

/**
 * Copy text to system clipboard
 * Supports macOS (pbcopy), Windows (clip), and Linux (xclip/xsel)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const os = platform();
  let command = '';
  let args: string[] = [];

  if (os === 'darwin') {
    command = 'pbcopy';
  } else if (os === 'win32') {
    command = 'clip';
  } else if (os === 'linux') {
    // Try xclip first
    command = 'xclip';
    args = ['-selection', 'clipboard'];
  } else {
    return false;
  }

  return new Promise((resolve) => {
    try {
      const child = spawn(command, args);

      child.on('error', () => {
        if (os === 'linux' && command === 'xclip') {
          // Fallback to xsel if xclip fails
          try {
            const fallback = spawn('xsel', ['--clipboard', '--input']);
            fallback.on('error', () => resolve(false));
            fallback.stdin.write(text);
            fallback.stdin.end();
            fallback.on('exit', (code) => resolve(code === 0));
          } catch {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });

      child.stdin.write(text);
      child.stdin.end();

      child.on('exit', (code) => {
        resolve(code === 0);
      });
    } catch {
      resolve(false);
    }
  });
}
