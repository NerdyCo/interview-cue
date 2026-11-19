import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  HOTKEY_ACTIONS,
  type HotkeyAction,
  type HotkeyMap,
} from "../shared/ipc";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_HOTKEYS: HotkeyMap = {
  nextCard: "CommandOrControl+Alt+Right",
  prevCard: "CommandOrControl+Alt+Left",
  toggleMode: "CommandOrControl+Alt+I",
  togglePrivate: "CommandOrControl+Alt+P",
  toggleSession: "CommandOrControl+Alt+S",
  panicHide: "F9",
};

export interface Settings {
  disclaimerAcked: boolean;
  bounds: Bounds | null;
  lastDeckPath: string | null;
  hotkeys: HotkeyMap;
}

const DEFAULTS: Settings = {
  disclaimerAcked: false,
  bounds: null,
  lastDeckPath: null,
  hotkeys: { ...DEFAULT_HOTKEYS },
};

let settings: Settings = { ...DEFAULTS, hotkeys: { ...DEFAULT_HOTKEYS } };
let filePath: string | null = null;
let writeTimer: NodeJS.Timeout | null = null;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseBounds(v: unknown): Bounds | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  if (
    !isFiniteNumber(o.x) ||
    !isFiniteNumber(o.y) ||
    !isFiniteNumber(o.width) ||
    !isFiniteNumber(o.height)
  ) {
    return null;
  }
  if (o.width < 200 || o.height < 100) return null;
  return { x: o.x, y: o.y, width: o.width, height: o.height };
}

function parseHotkeys(v: unknown): HotkeyMap {
  const result: HotkeyMap = { ...DEFAULT_HOTKEYS };
  if (typeof v !== "object" || v === null) return result;
  const o = v as Record<string, unknown>;
  for (const action of HOTKEY_ACTIONS) {
    const value = o[action];
    if (typeof value === "string" && value.length > 0) {
      result[action] = value;
    }
  }
  return result;
}

function parse(raw: string): Settings {
  const data: unknown = JSON.parse(raw);
  if (typeof data !== "object" || data === null) {
    return { ...DEFAULTS, hotkeys: { ...DEFAULT_HOTKEYS } };
  }
  const o = data as Record<string, unknown>;
  return {
    disclaimerAcked: o.disclaimerAcked === true,
    bounds: parseBounds(o.bounds),
    lastDeckPath: typeof o.lastDeckPath === "string" ? o.lastDeckPath : null,
    hotkeys: parseHotkeys(o.hotkeys),
  };
}

export async function loadSettings(): Promise<void> {
  const dir = path.join(app.getPath("userData"), "cue-data");
  filePath = path.join(dir, "settings.json");
  try {
    settings = parse(await readFile(filePath, "utf8"));
  } catch {
    settings = { ...DEFAULTS, hotkeys: { ...DEFAULT_HOTKEYS } };
  }
}

export function getSettings(): Settings {
  return { ...settings, hotkeys: { ...settings.hotkeys } };
}

export function saveSettings(patch: Partial<Settings>): void {
  settings = { ...settings, ...patch };
  if (!filePath) return;

  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    void flush();
  }, 400);
}

export async function flushSettings(): Promise<void> {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  await flush();
}

async function flush(): Promise<void> {
  if (!filePath) return;
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(settings, null, 2), "utf8");
  } catch (err) {
    console.warn("[cue] Gagal menyimpan settings:", err);
  }
}

export function setHotkey(action: HotkeyAction, accelerator: string): void {
  saveSettings({ hotkeys: { ...settings.hotkeys, [action]: accelerator } });
}
