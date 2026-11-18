import type { CueApi } from "./shared/ipc";

declare global {
  interface Window {
    cue: CueApi;
  }
}

export {};
