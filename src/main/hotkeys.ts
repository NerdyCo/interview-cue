import { globalShortcut } from "electron";
import type { HotkeyAction, HotkeyMap } from "../shared/ipc";
import { HOTKEY_ACTIONS } from "../shared/ipc";

type Handlers = Record<HotkeyAction, () => void>;

let handlers: Handlers | null = null;
let current: HotkeyMap | null = null;

export function initHotkeys(map: HotkeyMap, h: Handlers): void {
  current = { ...map };
  handlers = h;
}

export function applyHotkeys(map: HotkeyMap): HotkeyAction[] {
  current = { ...map };
  globalShortcut.unregisterAll();

  if (!handlers) return [];

  const failed: HotkeyAction[] = [];
  const used = new Set<string>();

  for (const action of HOTKEY_ACTIONS) {
    const accel = map[action];

    if (used.has(accel)) {
      failed.push(action);
      continue;
    }
    used.add(accel);

    if (!globalShortcut.register(accel, handlers[action])) {
      failed.push(action);
    }
  }

  return failed;
}

export function getHotkeys(): HotkeyMap | null {
  return current ? { ...current } : null;
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll();
}
