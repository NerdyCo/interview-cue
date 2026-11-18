import { app, BrowserWindow } from "electron";
import started from "electron-squirrel-startup";
import { createCueWindow } from "./main/windows";

if (started) app.quit();

app.whenReady().then(() => {
  createCueWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createCueWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
