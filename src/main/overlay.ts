import { BrowserWindow } from "electron";
import { IPC, type CueState, type OverlayMode } from "../shared/ipc";

const state: CueState = {
  mode: "interact",
  privateMode: false,
};

let win: BrowserWindow | null = null;

export function attachOverlay(window: BrowserWindow): void {
  win = window;
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

function applyState(): void {
  if (!win || win.isDestroyed()) return;

  const bounds = win.getBounds();

  if (state.mode === "read") {
    win.setIgnoreMouseEvents(true, { forward: true });
  } else {
    win.setIgnoreMouseEvents(false);
  }

  win.setBounds(bounds);

  win.webContents.send(IPC.state, getCueState());
}
