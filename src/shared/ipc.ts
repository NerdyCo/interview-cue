export type OverlayMode = "read" | "interact";

export interface CueCard {
  title: string;
  html: string;
}

export interface CueState {
  mode: OverlayMode;
  privateMode: boolean;
  deckName: string | null;
  cards: CueCard[];
  cardIndex: number;
  error: string | null;
}

export interface CueApi {
  setMode(mode: OverlayMode): void;
  toggleMode(): void;
  openDeck(): void;
  nextCard(): void;
  prevCard(): void;
  getState(): Promise<CueState>;
  onState(cb: (s: CueState) => void): void;
}

export const IPC = {
  setMode: "cue:set-mode",
  toggleMode: "cue:toggle-mode",
  openDeck: "cue:open-deck",
  nextCard: "cue:next-card",
  prevCard: "cue:prev-card",
  getState: "cue:get-state",
  state: "cue:state",
} as const;
