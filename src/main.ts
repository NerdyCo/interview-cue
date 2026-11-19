import { app, BrowserWindow, ipcMain, Menu } from "electron";
import started from "electron-squirrel-startup";
import { createCueWindow } from "./main/windows";
import {
  attachOverlay,
  getCueState,
  nextCard,
  openDeck,
  prevCard,
  setMode,
  toggleMode,
} from "./main/overlay";
import { registerHotkeys, unregisterHotkeys } from "./main/hotkeys";
import { IPC, type OverlayMode } from "./shared/ipc";

if (started) app.quit();

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  const win = createCueWindow();
  attachOverlay(win);

  ipcMain.on(IPC.setMode, (_e, mode: OverlayMode) => setMode(mode));
  ipcMain.on(IPC.toggleMode, () => toggleMode());
  ipcMain.on(IPC.nextCard, () => nextCard());
  ipcMain.on(IPC.prevCard, () => prevCard());
  ipcMain.handle(IPC.openDeck, () => openDeck());
  ipcMain.handle(IPC.getState, () => getCueState());

  const failed = registerHotkeys();
  if (failed.length > 0) {
    console.warn("[cue] Hotkey gagal didaftarkan:", failed.join(", "));
  }

  win.once("ready-to-show", () => win.showInactive());

  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      attachOverlay(createCueWindow());
    }
  });
});

app.on("will-quit", () => unregisterHotkeys());

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
