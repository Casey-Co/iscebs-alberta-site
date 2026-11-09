import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));

export async function loadWix(...extraScripts) {
  const window = {};
  const context = vm.createContext({ window, fetch, AbortSignal, URL, console });
  for (const file of ['wix-config.js', 'wix-client.js', ...extraScripts]) {
    vm.runInContext(await readFile(path.join(ROOT, 'assets', file), 'utf8'), context, { filename: file });
  }
  return window;
}
