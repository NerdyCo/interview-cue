import { app, BrowserWindow, ipcMain, Menu } from "electron";
import started from "electron-squirrel-startup";
import { createCueWindow } from "./main/windows";
import {
  ackDisclaimer,
  attachOverlay,
  cleanupOverlay,
  getCueState,
  nextCard,
  openDeck,
  panicHide,
  prevCard,
  rebindHotkey,
  reopenLastDeck,
  reportHotkeyConflicts,
  resetHotkeys,
  setMode,
  setSettingsOpen,
  toggleChat,
  toggleMode,
  togglePrivate,
  toggleSession,
} from "./main/overlay";
import { applyHotkeys, initHotkeys, unregisterHotkeys } from "./main/hotkeys";
import { flushSettings, getSettings, loadSettings } from "./main/store";
import { createTray, destroyTray } from "./main/tray";
import { IPC, type HotkeyAction, type OverlayMode } from "./shared/ipc";

if (started) app.quit();

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

Menu.setApplicationMenu(null);

app.setAppUserModelId("com.squirrel.InterviewCue.InterviewCue");

app.whenReady().then(async () => {
  await loadSettings();

  const win = createCueWindow();
  attachOverlay(win);

  createTray({
    onToggleHidden: () => panicHide(),
    onQuit: () => app.quit(),
  });

  initHotkeys(getSettings().hotkeys, {
    nextCard,
    prevCard,
    toggleMode,
    togglePrivate,
    toggleSession,
    panicHide,
  });

  ipcMain.on(IPC.setMode, (_e, mode: OverlayMode) => setMode(mode));
  ipcMain.on(IPC.toggleMode, () => toggleMode());
  ipcMain.on(IPC.togglePrivate, () => togglePrivate());
  ipcMain.on(IPC.toggleSession, () => toggleSession());
  ipcMain.on(IPC.toggleChat, () => toggleChat());
  ipcMain.on(IPC.panicHide, () => panicHide());
  ipcMain.on(IPC.setSettingsOpen, (_e, open: boolean) => setSettingsOpen(open));
  ipcMain.handle(IPC.ackDisclaimer, () => ackDisclaimer());
  ipcMain.handle(IPC.openDeck, () => openDeck());
  ipcMain.on(IPC.nextCard, () => nextCard());
  ipcMain.on(IPC.prevCard, () => prevCard());
  ipcMain.handle(IPC.getState, () => getCueState());
  ipcMain.handle(IPC.rebindHotkey, (_e, action: HotkeyAction, accel: string) =>
    rebindHotkey(action, accel),
  );
  ipcMain.handle(IPC.resetHotkeys, () => resetHotkeys());

  reportHotkeyConflicts(applyHotkeys(getSettings().hotkeys));
  await reopenLastDeck();

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
  if (getCueState().hidden) panicHide();
});

app.on("before-quit", () => {
  void flushSettings();
  void cleanupOverlay();
});

app.on("will-quit", () => {
  unregisterHotkeys();
  destroyTray();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
