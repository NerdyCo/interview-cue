export type OverlayMode = "read" | "interact";

export interface CueState {
  mode: OverlayMode;
  privateMode: boolean;
}

export const IPC = {
  setMode: "cue:set-mode",
  toggleMode: "cue:toggle-mode",
  getState: "cue:get-state",
  state: "cue:state",
} as const;

export interface CueApi {
  setMode(mode: OverlayMode): void;
  toggleMode(): void;
  getState(): Promise<CueState>;
  onState(cb: (s: CueState) => void): void;
}
