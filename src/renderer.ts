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
const chatBtnEl = el<HTMLButtonElement>("chat");
const settingsEl = el<HTMLButtonElement>("settings");
const gripEl = el<HTMLButtonElement>("grip");
const collapseEl = el<HTMLButtonElement>("collapse");
const clockEl = el("clock");
const sessionDotEl = el("session-dot");
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
const bodyWrapperEl = el("body-wrapper");
const chatPanelEl = el("chat-panel");
const chatCloseEl = el<HTMLButtonElement>("chat-close");
const chatInputEl = el<HTMLTextAreaElement>("chat-input");

let recording: HotkeyAction | null = null;
let lastHotkeyJson = "";
let lastState: CueState;
let isBodyVisible = false;

let lastOpened: "deck" | "chat" = "deck";

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
      lastHotkeyJson = "";
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
    btn.classList.toggle("conflict", s.hotkeyConflicts.includes(action));
    btn.classList.toggle("recording", recording === action);
    btn.textContent =
      recording === action ? "Tekan tombol…" : s.hotkeys[action];
  }
}

function setIconState(
  btn: HTMLButtonElement,
  on: boolean,
  labelOn: string,
  labelOff: string,
): void {
  btn.classList.toggle("on", on);
  btn.title = on ? labelOn : labelOff;
  btn.setAttribute("aria-pressed", String(on));
}

function setBodyVisible(visible: boolean): void {
  isBodyVisible = visible;
  bodyWrapperEl.hidden = !visible;
  document.body.classList.toggle("show-body", visible);
  collapseEl.setAttribute("aria-expanded", String(visible));
  collapseEl.title = visible ? "Tutup kartu" : "Buka kartu";
}

function smartToggle(): void {
  const isChatOpen = lastState?.chatOpen;

  if (isChatOpen || isBodyVisible) {
    if (isChatOpen) window.cue.toggleChat();
    if (isBodyVisible) setBodyVisible(false);
    return;
  }

  if (lastOpened === "chat") {
    window.cue.toggleChat();
  } else {
    setBodyVisible(true);
  }
}

function tickClock(): void {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  clockEl.textContent = `${hh}:${mm}`;
}

function render(s: CueState): void {
  lastState = s;

  const isRead = s.mode === "read";
  const isChatOpen = s.chatOpen;

  if (isChatOpen) {
    lastOpened = "chat";
  } else if (isBodyVisible && !s.settingsOpen) {
    lastOpened = "deck";
  }

  document.body.classList.toggle("read", isRead);
  document.body.classList.toggle("private", s.privateMode);
  document.body.classList.toggle("session", s.sessionActive);
  document.body.classList.toggle("needs-ack", !s.disclaimerAcked);
  document.body.classList.toggle("show-settings", s.settingsOpen);
  document.body.classList.toggle("show-chat", isChatOpen);

  if (s.error && !isBodyVisible && !isChatOpen) setBodyVisible(true);

  modeEl.textContent = isRead ? "READ" : "INTERACT";

  setIconState(
    toggleEl,
    !isRead,
    "Mode interact — klik untuk jadikan click-through",
    "Mode baca (click-through) — klik untuk bisa scroll",
  );
  const toggleLabel = toggleEl.querySelector("span");
  if (toggleLabel) toggleLabel.textContent = isRead ? "Read" : "Interact";

  setIconState(
    chatBtnEl,
    isChatOpen,
    "Tutup AI Chat",
    "Buka AI Chat Assistant",
  );
  setIconState(
    privateEl,
    s.privateMode,
    "Private: ON — dikecualikan dari capture",
    "Private: OFF — terlihat di screen share",
  );
  setIconState(
    sessionEl,
    s.sessionActive,
    "Sesi aktif — klik untuk matikan penanda",
    "Tandai sedang presentasi/share",
  );

  sessionDotEl.title = s.sessionActive
    ? "SESI AKTIF — layar diasumsikan dibagikan"
    : "Penanda sesi mati";

  privateEl.disabled = !s.disclaimerAcked;
  sessionEl.disabled = !s.disclaimerAcked;
  settingsEl.classList.toggle("on", s.settingsOpen);

  bannerEl.hidden = !s.sessionActive;
  settingsPanelEl.hidden = !s.settingsOpen;
  disclaimerEl.hidden = s.disclaimerAcked;
  chatPanelEl.hidden = !isChatOpen;

  osStatusEl.textContent = s.contentProtected ? "OS: excluded" : "OS: visible";
  osStatusEl.classList.toggle("mismatch", s.privateMode !== s.contentProtected);

  deckEl.textContent = s.deckName ?? "Belum ada deck";
  deckEl.title = s.deckName ?? "";
  errorEl.textContent = s.error ?? "";
  errorEl.hidden = s.error === null;

  renderHotkeys(s);

  bodyWrapperEl.hidden = !isBodyVisible;
  document.body.classList.toggle("show-body", isBodyVisible);
  collapseEl.setAttribute("aria-expanded", String(isBodyVisible));
  collapseEl.title = isBodyVisible ? "Tutup kartu" : "Buka kartu";

  const card = s.cards[s.cardIndex];
  if (card && !isChatOpen && !s.settingsOpen && s.disclaimerAcked) {
    counterEl.textContent = `${s.cardIndex + 1}/${s.cards.length}`;
    titleEl.textContent = card.title;
    bodyEl.innerHTML = DOMPurify.sanitize(card.html, {
      USE_PROFILES: { html: true },
    });
    bodyEl.scrollTop = 0;
  } else {
    counterEl.textContent = "";
    titleEl.textContent = "";
    bodyEl.replaceChildren();
  }
}

collapseEl.addEventListener("click", smartToggle);
gripEl.addEventListener("click", smartToggle);

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
chatBtnEl.addEventListener("click", () => window.cue.toggleChat());
chatCloseEl.addEventListener("click", () => window.cue.toggleChat());
privateEl.addEventListener("click", () => window.cue.togglePrivate());
sessionEl.addEventListener("click", () => window.cue.toggleSession());
hideEl.addEventListener("click", () => window.cue.panicHide());

openEl.addEventListener("click", () => {
  setBodyVisible(true);
  void window.cue.openDeck();
});

ackEl.addEventListener("click", () => window.cue.ackDisclaimer());

settingsEl.addEventListener("click", () =>
  window.cue.setSettingsOpen(!lastState.settingsOpen),
);

settingsCloseEl.addEventListener("click", () => {
  recording = null;
  window.cue.setSettingsOpen(false);
});

hotkeyResetEl.addEventListener("click", () => {
  recording = null;
  void window.cue.resetHotkeys();
});

chatInputEl.addEventListener("input", () => {
  chatInputEl.style.height = "auto";
  chatInputEl.style.height = Math.min(chatInputEl.scrollHeight, 120) + "px";
});

buildHotkeyRows();
tickClock();
setInterval(tickClock, 10_000);
window.cue.onState(render);
window.cue.getState().then(render);
