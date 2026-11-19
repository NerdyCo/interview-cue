import { contextBridge, ipcRenderer } from "electron";
import { IPC, type CueApi, type CueState } from "./shared/ipc";

contextBridge.exposeInMainWorld("cue", {
  setMode: (mode) => ipcRenderer.send(IPC.setMode, mode),
  toggleMode: () => ipcRenderer.send(IPC.toggleMode),
  openDeck: () => ipcRenderer.invoke(IPC.openDeck),
  nextCard: () => ipcRenderer.send(IPC.nextCard),
  prevCard: () => ipcRenderer.send(IPC.prevCard),
  getState: () => ipcRenderer.invoke(IPC.getState),
  onState: (cb) => {
    ipcRenderer.on(IPC.state, (_e, s: CueState) => cb(s));
  },
} satisfies CueApi);
