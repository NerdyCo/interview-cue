import { BrowserWindow, dialog } from "electron";
import { IPC, type CueState, type OverlayMode } from "../shared/ipc";
import { loadDeck } from "./deck";
import { getSettings, saveSettings } from "./store";

const state: CueState = {
  mode: "interact",
  privateMode: false,
  contentProtected: false,
  disclaimerAcked: false,
  deckName: null,
  cards: [],
  cardIndex: 0,
  error: null,
};

let win: BrowserWindow | null = null;

export function attachOverlay(window: BrowserWindow): void {
  win = window;
  state.disclaimerAcked = getSettings().disclaimerAcked;
  applyState();
  window.on("closed", () => {
    win = null;
  });
}

export function getCueState(): CueState {
  return { ...state };
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
  state.privateMode = !state.privateMode;
  state.error = null;
  applyState();
}

export async function ackDisclaimer(): Promise<void> {
  state.disclaimerAcked = true;
  await saveSettings({ disclaimerAcked: true });
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

  try {
    const deck = await loadDeck(result.filePaths[0]);
    state.deckName = deck.name;
    state.cards = deck.cards;
    state.cardIndex = 0;
    state.error = null;
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err);
  }

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

  win.setBounds(bounds);
  win.webContents.send(IPC.state, getCueState());
}
