import { BrowserWindow } from "electron";
import path from "node:path";

export function createCueWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 420,
    height: 260,
    minWidth: 260,
    minHeight: 120,

    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    roundedCorners: false,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,

    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  return win;
}
