import { app, BrowserWindow, ipcMain, Menu } from "electron";
import started from "electron-squirrel-startup";
import { createCueWindow } from "./main/windows";
import {
  ackDisclaimer,
  attachOverlay,
  getCueState,
  nextCard,
  openDeck,
  panicHide,
  prevCard,
  setMode,
  toggleMode,
  togglePrivate,
  toggleSession,
} from "./main/overlay";
import { registerHotkeys, unregisterHotkeys } from "./main/hotkeys";
import { loadSettings } from "./main/store";
import { createTray, destroyTray } from "./main/tray";
import { IPC, type OverlayMode } from "./shared/ipc";

if (started) app.quit();

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

Menu.setApplicationMenu(null);

app.whenReady().then(async () => {
  await loadSettings();

  const win = createCueWindow();
  attachOverlay(win);

  createTray({
    onToggleHidden: () => panicHide(),
    onQuit: () => app.quit(),
  });

  ipcMain.on(IPC.setMode, (_e, mode: OverlayMode) => setMode(mode));
  ipcMain.on(IPC.toggleMode, () => toggleMode());
  ipcMain.on(IPC.togglePrivate, () => togglePrivate());
  ipcMain.on(IPC.toggleSession, () => toggleSession());
  ipcMain.on(IPC.panicHide, () => panicHide());
  ipcMain.handle(IPC.ackDisclaimer, () => ackDisclaimer());
  ipcMain.handle(IPC.openDeck, () => openDeck());
  ipcMain.on(IPC.nextCard, () => nextCard());
  ipcMain.on(IPC.prevCard, () => prevCard());
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

app.on("second-instance", () => {
  const state = getCueState();
  if (state.hidden) panicHide();
});

app.on("will-quit", () => {
  unregisterHotkeys();
  destroyTray();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
