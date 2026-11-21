import { BrowserWindow, dialog, screen } from "electron";
import path from "node:path";
import {
  IPC,
  HOTKEY_ACTIONS,
  type CueState,
  type HotkeyAction,
  type HotkeyMap,
  type OverlayMode,
} from "../shared/ipc";
import { loadDeck } from "./deck";
import {
  DEFAULT_HOTKEYS,
  getSettings,
  saveSettings,
  setHotkey,
  type Bounds,
} from "./store";
import { hideAll, isHidden, showAll } from "./visibility";
import { updateTray } from "./tray";
import { applyHotkeys } from "./hotkeys";
import { stopWatching, watchDeck } from "./watcher";
import { hasApiKey } from "./chat";

const state: CueState = {
  mode: "interact",
  privateMode: false,
  contentProtected: false,
  disclaimerAcked: false,
  sessionActive: false,
  hidden: false,
  deckName: null,
  cards: [],
  cardIndex: 0,
  error: null,
  hotkeys: { ...DEFAULT_HOTKEYS },
  hotkeyConflicts: [],
  settingsOpen: false,
  chatOpen: false,
  timer: { status: "idle", remaining: 0, total: 0 },
  timerMinutes: 0,
  hasApiKey: false,
};

let win: BrowserWindow | null = null;
let deckPath: string | null = null;
let timerHandle: NodeJS.Timeout | null = null;

export function attachOverlay(window: BrowserWindow): void {
  win = window;

  const saved = getSettings();
  state.disclaimerAcked = saved.disclaimerAcked;
  state.hotkeys = saved.hotkeys;
  state.timerMinutes = saved.timerMinutes;

  restoreBounds(saved.bounds);

  window.on("moved", persistBounds);
  window.on("resized", persistBounds);

  window.on("closed", () => {
    win = null;
  });

  applyState();
}

function restoreBounds(bounds: Bounds | null): void {
  if (!win || win.isDestroyed() || !bounds) return;

  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;

  const width = Math.min(bounds.width, area.width);
  const height = Math.min(bounds.height, area.height);
  const x = Math.max(area.x, Math.min(bounds.x, area.x + area.width - width));
  const y = Math.max(area.y, Math.min(bounds.y, area.y + area.height - height));

  win.setBounds({ x, y, width, height });
}

function persistBounds(): void {
  if (!win || win.isDestroyed() || isHidden()) return;
  saveSettings({ bounds: win.getBounds() });
}

export function getCueState(): CueState {
  return { ...state, hotkeys: { ...state.hotkeys } };
}

export function setMode(mode: OverlayMode): void {
  state.mode = mode;
  applyState();
}

export function toggleMode(): void {
  setMode(state.mode === "read" ? "interact" : "read");
}

export function togglePrivate(): void {
  if (!state.disclaimerAcked) return;

  if (state.sessionActive && state.privateMode) {
    state.error =
      "Private mode terkunci selama sesi aktif. Matikan penanda sesi dulu kalau memang ingin menampilkannya.";
    applyState();
    return;
  }

  state.privateMode = !state.privateMode;
  state.error = null;
  applyState();
}

export function toggleSession(): void {
  if (!state.disclaimerAcked) return;

  state.sessionActive = !state.sessionActive;
  if (state.sessionActive) {
    state.privateMode = true;
    state.mode = "read";
    state.error = null;
  }
  applyState();
}

export function toggleChat(): void {
  state.chatOpen = !state.chatOpen;

  // Chat butuh interaksi mouse & keyboard
  if (state.chatOpen) {
    state.mode = "interact";
    state.settingsOpen = false;
  }

  applyState();
}

export function panicHide(): void {
  if (isHidden()) {
    showAll();
    state.hidden = false;
    applyState();
  } else {
    hideAll();
    state.hidden = true;
    updateTray(true, state.sessionActive);
  }
}

export async function ackDisclaimer(): Promise<void> {
  state.disclaimerAcked = true;
  saveSettings({ disclaimerAcked: true });
  applyState();
}

export function nextCard(): void {
  goToCard(state.cardIndex + 1);
}

export function prevCard(): void {
  goToCard(state.cardIndex - 1);
}

function goToCard(index: number): void {
  if (state.cards.length === 0) return;
  const clamped = Math.max(0, Math.min(index, state.cards.length - 1));
  if (clamped === state.cardIndex) return;
  state.cardIndex = clamped;
  applyState();
}

export function setSettingsOpen(open: boolean): void {
  state.settingsOpen = open;

  if (open) {
    state.mode = "interact";
    state.chatOpen = false;
  }
  applyState();
}

export async function openDeck(): Promise<void> {
  if (!win || win.isDestroyed()) return;

  if (state.privateMode) {
    state.error =
      "Matikan private mode dulu untuk memilih deck. Dialog file bawaan Windows tidak ikut dikecualikan dari screen share.";
    applyState();
    return;
  }

  const result = await dialog.showOpenDialog(win, {
    title: "Pilih deck catatan",
    properties: ["openFile"],
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
  });

  if (result.canceled || result.filePaths.length === 0) return;
  await loadAndWatch(result.filePaths[0], true);
}

export async function reopenLastDeck(): Promise<void> {
  const saved = getSettings().lastDeckPath;
  if (!saved) return;
  await loadAndWatch(saved, false);
}

async function loadAndWatch(
  filePath: string,
  resetIndex: boolean,
): Promise<void> {
  try {
    const deck = await loadDeck(filePath);
    state.deckName = deck.name;
    state.cards = deck.cards;
    state.error = null;

    if (resetIndex) {
      state.cardIndex = 0;
    } else {
      state.cardIndex = Math.min(state.cardIndex, deck.cards.length - 1);
    }

    deckPath = filePath;
    saveSettings({ lastDeckPath: filePath });

    watchDeck(filePath, () => {
      if (deckPath) void loadAndWatch(deckPath, false);
    });
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err);

    if (!resetIndex) {
      state.deckName = `${path.basename(filePath)} (gagal dibuka)`;
    }
  }

  applyState();
}

function stopTimerTick(): void {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}

function tickTimer(): void {
  if (state.timer.status !== "running") return;

  state.timer.remaining = Math.max(0, state.timer.remaining - 1);

  if (state.timer.remaining === 0) {
    state.timer.status = "idle";
    stopTimerTick();
  }

  applyState();
}

export function startTimer(minutes: number): void {
  const m = Math.max(0, Math.min(600, Math.floor(minutes)));
  if (m <= 0) return;

  state.timerMinutes = m;
  saveSettings({ timerMinutes: m });

  state.timer = { status: "running", remaining: m * 60, total: m * 60 };
  stopTimerTick();
  timerHandle = setInterval(tickTimer, 1000);
  applyState();
}

export function toggleTimer(): void {
  if (state.timer.status === "running") {
    state.timer.status = "paused";
    stopTimerTick();
  } else if (state.timer.status === "paused") {
    state.timer.status = "running";
    stopTimerTick();
    timerHandle = setInterval(tickTimer, 1000);
  }
  applyState();
}

export function resetTimer(): void {
  stopTimerTick();
  state.timer = { status: "idle", remaining: 0, total: 0 };
  applyState();
}

export async function rebindHotkey(
  action: HotkeyAction,
  accelerator: string,
): Promise<HotkeyAction[]> {
  if (!HOTKEY_ACTIONS.includes(action)) return state.hotkeyConflicts;

  setHotkey(action, accelerator);
  state.hotkeys = { ...state.hotkeys, [action]: accelerator };

  const failed = applyHotkeys(state.hotkeys);
  state.hotkeyConflicts = failed;
  state.error =
    failed.length > 0
      ? `Tombol ini dipakai aplikasi lain atau bentrok: ${failed.join(", ")}. Pilih kombinasi lain.`
      : null;

  applyState();
  return failed;
}

export async function resetHotkeys(): Promise<HotkeyAction[]> {
  saveSettings({ hotkeys: { ...DEFAULT_HOTKEYS } });
  state.hotkeys = { ...DEFAULT_HOTKEYS };

  const failed = applyHotkeys(state.hotkeys);
  state.hotkeyConflicts = failed;
  state.error = null;
  applyState();
  return failed;
}

export function reportHotkeyConflicts(failed: HotkeyAction[]): void {
  state.hotkeyConflicts = failed;
  if (failed.length > 0) {
    state.error = `Hotkey dipakai aplikasi lain: ${failed.join(", ")}. Buka pengaturan untuk mengubahnya.`;
  }
  applyState();
}

export async function cleanupOverlay(): Promise<void> {
  stopTimerTick();
  await stopWatching();
}

export function refreshState(): void {
  applyState();
}

function applyState(): void {
  if (!win || win.isDestroyed()) return;

  const bounds = win.getBounds();

  if (state.mode === "read") {
    win.setIgnoreMouseEvents(true, { forward: true });
  } else {
    win.setIgnoreMouseEvents(false);
  }

  win.setContentProtection(state.privateMode);
  state.contentProtected = win.isContentProtected();

  state.hasApiKey = hasApiKey();

  win.setBounds(bounds);
  win.webContents.send(IPC.state, getCueState());
  updateTray(state.hidden, state.sessionActive);
}
