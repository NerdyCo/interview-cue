import { contextBridge, ipcRenderer } from "electron";
import { IPC, type CueApi, type CueState } from "./shared/ipc";

contextBridge.exposeInMainWorld("cue", {
  setMode: (mode) => ipcRenderer.send(IPC.setMode, mode),
  toggleMode: () => ipcRenderer.send(IPC.toggleMode),
  togglePrivate: () => ipcRenderer.send(IPC.togglePrivate),
  toggleSession: () => ipcRenderer.send(IPC.toggleSession),
  panicHide: () => ipcRenderer.send(IPC.panicHide),
  setSettingsOpen: (open) => ipcRenderer.send(IPC.setSettingsOpen, open),
  ackDisclaimer: () => ipcRenderer.invoke(IPC.ackDisclaimer),
  openDeck: () => ipcRenderer.invoke(IPC.openDeck),
  nextCard: () => ipcRenderer.send(IPC.nextCard),
  prevCard: () => ipcRenderer.send(IPC.prevCard),
  rebindHotkey: (action, accel) =>
    ipcRenderer.invoke(IPC.rebindHotkey, action, accel),
  resetHotkeys: () => ipcRenderer.invoke(IPC.resetHotkeys),
  getState: () => ipcRenderer.invoke(IPC.getState),
  onState: (cb) => {
    ipcRenderer.on(IPC.state, (_e, s: CueState) => cb(s));
  },
} satisfies CueApi);
