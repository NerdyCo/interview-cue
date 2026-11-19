import { globalShortcut } from "electron";
import { nextCard, prevCard, toggleMode, togglePrivate } from "./overlay";

const BINDINGS: ReadonlyArray<readonly [string, () => void]> = [
  ["CommandOrControl+Alt+Right", nextCard],
  ["CommandOrControl+Alt+Left", prevCard],
  ["CommandOrControl+Alt+I", toggleMode],
  ["CommandOrControl+Alt+P", togglePrivate],
];

export function registerHotkeys(): string[] {
  const failed: string[] = [];
  for (const [accelerator, handler] of BINDINGS) {
    if (!globalShortcut.register(accelerator, handler)) {
      failed.push(accelerator);
    }
  }
  return failed;
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll();
}
