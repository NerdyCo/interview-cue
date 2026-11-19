import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface Settings {
  disclaimerAcked: boolean;
}

const DEFAULTS: Settings = { disclaimerAcked: false };

let settings: Settings = { ...DEFAULTS };
let filePath: string | null = null;

function parse(raw: string): Settings {
  const data: unknown = JSON.parse(raw);
  if (typeof data !== "object" || data === null) return { ...DEFAULTS };
  const obj = data as Record<string, unknown>;
  return { disclaimerAcked: obj.disclaimerAcked === true };
}

export async function loadSettings(): Promise<void> {
  const dir = path.join(app.getPath("userData"), "cue-data");
  filePath = path.join(dir, "settings.json");

  try {
    settings = parse(await readFile(filePath, "utf8"));
  } catch {
    settings = { ...DEFAULTS };
  }
}

export function getSettings(): Settings {
  return { ...settings };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  settings = { ...settings, ...patch };
  if (!filePath) return;

  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(settings, null, 2), "utf8");
  } catch (err) {
    console.warn("[cue] Gagal menyimpan settings:", err);
  }
}
