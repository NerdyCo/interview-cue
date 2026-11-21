export type OverlayMode = "read" | "interact";

export type TimerStatus = "idle" | "running" | "paused";

export interface TimerState {
  status: TimerStatus;
  remaining: number;
  total: number;
}

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
  chatOpen: boolean;
  timer: TimerState;
  timerMinutes: number;
  hasApiKey: boolean;
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
  toggleChat(): void;
  startTimer(minutes: number): void;
  toggleTimer(): void;
  resetTimer(): void;
  sendChatMessage(text: string): void;
  clearChat(): void;
  setApiKey(key: string): Promise<boolean>;
  rebindHotkey(
    action: HotkeyAction,
    accelerator: string,
  ): Promise<HotkeyAction[]>;
  resetHotkeys(): Promise<HotkeyAction[]>;
  getState(): Promise<CueState>;
  onState(cb: (s: CueState) => void): void;
  onChatChunk(cb: (text: string) => void): void;
  onChatDone(cb: () => void): void;
  onChatError(cb: (message: string) => void): void;
  onChatUser(cb: (text: string) => void): void;
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
  toggleChat: "cue:toggle-chat",
  startTimer: "cue:start-timer",
  toggleTimer: "cue:toggle-timer",
  resetTimer: "cue:reset-timer",
  sendChatMessage: "cue:send-chat-message",
  clearChat: "cue:clear-chat",
  setApiKey: "cue:set-api-key",
  rebindHotkey: "cue:rebind-hotkey",
  resetHotkeys: "cue:reset-hotkeys",
  getState: "cue:get-state",
  state: "cue:state",
  chatChunk: "cue:chat-chunk",
  chatDone: "cue:chat-done",
  chatError: "cue:chat-error",
  chatUser: "cue:chat-user",
} as const;
