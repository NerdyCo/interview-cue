export type OverlayMode = "read" | "interact";

export interface CueCard {
  title: string;
  html: string;
}

export type HotkeyAction =
  | "nextCard"
  | "prevCard"
  | "toggleMode"
  | "togglePrivate"
  | "toggleSession"
  | "panicHide";

export const HOTKEY_ACTIONS: readonly HotkeyAction[] = [
  "nextCard",
  "prevCard",
  "toggleMode",
  "togglePrivate",
  "toggleSession",
  "panicHide",
] as const;

export const HOTKEY_LABELS: Record<HotkeyAction, string> = {
  nextCard: "Kartu berikutnya",
  prevCard: "Kartu sebelumnya",
  toggleMode: "Toggle interact",
  togglePrivate: "Toggle private",
  toggleSession: "Toggle penanda sesi",
  panicHide: "Panic hide",
};

export type HotkeyMap = Record<HotkeyAction, string>;

export interface CueState {
  mode: OverlayMode;
  privateMode: boolean;
  contentProtected: boolean;
  disclaimerAcked: boolean;
  sessionActive: boolean;
  hidden: boolean;
  deckName: string | null;
  cards: CueCard[];
  cardIndex: number;
  error: string | null;
  hotkeys: HotkeyMap;
  hotkeyConflicts: HotkeyAction[];
  settingsOpen: boolean;
}

export interface CueApi {
  setMode(mode: OverlayMode): void;
  toggleMode(): void;
  togglePrivate(): void;
  toggleSession(): void;
  panicHide(): void;
  ackDisclaimer(): void;
  openDeck(): void;
  nextCard(): void;
  prevCard(): void;
  setSettingsOpen(open: boolean): void;
  rebindHotkey(
    action: HotkeyAction,
    accelerator: string,
  ): Promise<HotkeyAction[]>;
  resetHotkeys(): Promise<HotkeyAction[]>;
  getState(): Promise<CueState>;
  onState(cb: (s: CueState) => void): void;
}

export const IPC = {
  setMode: "cue:set-mode",
  toggleMode: "cue:toggle-mode",
  togglePrivate: "cue:toggle-private",
  toggleSession: "cue:toggle-session",
  panicHide: "cue:panic-hide",
  ackDisclaimer: "cue:ack-disclaimer",
  openDeck: "cue:open-deck",
  nextCard: "cue:next-card",
  prevCard: "cue:prev-card",
  setSettingsOpen: "cue:set-settings-open",
  rebindHotkey: "cue:rebind-hotkey",
  resetHotkeys: "cue:reset-hotkeys",
  getState: "cue:get-state",
  state: "cue:state",
} as const;
