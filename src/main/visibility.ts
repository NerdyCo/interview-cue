import { BrowserWindow } from "electron";

let hidden = false;
let wasVisible: BrowserWindow[] = [];

export function isHidden(): boolean {
  return hidden;
}

export function hideAll(): void {
  wasVisible = [];

  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed() || !win.isVisible()) continue;
    wasVisible.push(win);
    win.setOpacity(0);
    win.hide();
  }

  hidden = true;
}

export function showAll(): void {
  const targets = wasVisible.filter((w) => !w.isDestroyed());
  wasVisible = [];
  hidden = false;

  for (const win of targets) {
    win.setOpacity(0);
    win.showInactive();
  }

  setTimeout(() => {
    for (const win of targets) {
      if (!win.isDestroyed()) win.setOpacity(1);
    }
  }, 32);
}
