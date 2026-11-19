import "./index.css";
import DOMPurify from "dompurify";
import {
  HOTKEY_ACTIONS,
  HOTKEY_LABELS,
  type CueState,
  type HotkeyAction,
} from "./shared/ipc";
import { el } from "./renderer/dom";
import { toAccelerator } from "./renderer/keys";

const modeEl = el("mode");
const toggleEl = el<HTMLButtonElement>("toggle");
const privateEl = el<HTMLButtonElement>("private");
const sessionEl = el<HTMLButtonElement>("session");
const hideEl = el<HTMLButtonElement>("hide");
const openEl = el<HTMLButtonElement>("open");
const settingsEl = el<HTMLButtonElement>("settings");
const deckEl = el("deck");
const counterEl = el("counter");
const osStatusEl = el("os-status");
const titleEl = el("card-title");
const bodyEl = el("card-body");
const errorEl = el("error");
const bannerEl = el("session-banner");
const disclaimerEl = el("disclaimer");
const ackEl = el<HTMLButtonElement>("ack");
const settingsPanelEl = el("settings-panel");
const hotkeyListEl = el("hotkey-list");
const hotkeyResetEl = el<HTMLButtonElement>("hotkey-reset");
const settingsCloseEl = el<HTMLButtonElement>("settings-close");

let recording: HotkeyAction | null = null;
let lastHotkeyJson = "";

function buildHotkeyRows(): void {
  hotkeyListEl.replaceChildren();

  for (const action of HOTKEY_ACTIONS) {
    const row = document.createElement("div");
    row.className = "hk-row";

    const label = document.createElement("span");
    label.textContent = HOTKEY_LABELS[action];

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hk-key";
    btn.dataset.action = action;
    btn.addEventListener("click", () => {
      recording = action;
      renderHotkeys(lastState);
    });

    row.append(label, btn);
    hotkeyListEl.append(row);
  }
}

function renderHotkeys(s: CueState): void {
  const json = JSON.stringify([s.hotkeys, s.hotkeyConflicts, recording]);
  if (json === lastHotkeyJson) return;
  lastHotkeyJson = json;

  for (const btn of hotkeyListEl.querySelectorAll<HTMLButtonElement>(
    ".hk-key",
  )) {
    const action = btn.dataset.action as HotkeyAction;
    const conflict = s.hotkeyConflicts.includes(action);
    btn.classList.toggle("conflict", conflict);
    btn.classList.toggle("recording", recording === action);
    btn.textContent =
      recording === action ? "Tekan tombol…" : s.hotkeys[action];
  }
}

let lastState: CueState;

function render(s: CueState): void {
  lastState = s;

  const isRead = s.mode === "read";
  document.body.classList.toggle("read", isRead);
  document.body.classList.toggle("private", s.privateMode);
  document.body.classList.toggle("session", s.sessionActive);
  document.body.classList.toggle("needs-ack", !s.disclaimerAcked);
  document.body.classList.toggle("show-settings", s.settingsOpen);

  modeEl.textContent = isRead ? "READ" : "INTERACT";
  toggleEl.textContent = isRead ? "Interact" : "Read";

  privateEl.textContent = s.privateMode ? "Private: ON" : "Private: OFF";
  privateEl.disabled = !s.disclaimerAcked;

  sessionEl.textContent = s.sessionActive ? "Sesi: ON" : "Sesi";
  sessionEl.disabled = !s.disclaimerAcked;

  bannerEl.hidden = !s.sessionActive;
  settingsPanelEl.hidden = !s.settingsOpen;

  osStatusEl.textContent = s.contentProtected ? "OS: excluded" : "OS: visible";
  osStatusEl.classList.toggle("mismatch", s.privateMode !== s.contentProtected);

  disclaimerEl.hidden = s.disclaimerAcked;

  deckEl.textContent = s.deckName ?? "Belum ada deck";
  errorEl.textContent = s.error ?? "";
  errorEl.hidden = s.error === null;

  renderHotkeys(s);

  const card = s.cards[s.cardIndex];
  if (!card) {
    counterEl.textContent = "";
    titleEl.textContent = "";
    bodyEl.replaceChildren();
    return;
  }

  counterEl.textContent = `${s.cardIndex + 1}/${s.cards.length}`;
  titleEl.textContent = card.title;
  bodyEl.innerHTML = DOMPurify.sanitize(card.html, {
    USE_PROFILES: { html: true },
  });
  bodyEl.scrollTop = 0;
}

window.addEventListener(
  "keydown",
  (e) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape" && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      recording = null;
      lastHotkeyJson = "";
      renderHotkeys(lastState);
      return;
    }

    const accel = toAccelerator(e);
    if (!accel) return;

    const action = recording;
    recording = null;
    lastHotkeyJson = "";
    void window.cue.rebindHotkey(action, accel);
  },
  true,
);

toggleEl.addEventListener("click", () => window.cue.toggleMode());
privateEl.addEventListener("click", () => window.cue.togglePrivate());
sessionEl.addEventListener("click", () => window.cue.toggleSession());
hideEl.addEventListener("click", () => window.cue.panicHide());
openEl.addEventListener("click", () => window.cue.openDeck());
ackEl.addEventListener("click", () => window.cue.ackDisclaimer());
settingsEl.addEventListener("click", () => window.cue.setSettingsOpen(true));
settingsCloseEl.addEventListener("click", () => {
  recording = null;
  window.cue.setSettingsOpen(false);
});
hotkeyResetEl.addEventListener("click", () => {
  recording = null;
  void window.cue.resetHotkeys();
});

buildHotkeyRows();
window.cue.onState(render);
window.cue.getState().then(render);
