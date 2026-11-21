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
const chatSendEl = el<HTMLButtonElement>("chat-send");
const chatMessagesEl = el("chat-messages");
const chatEmptyEl = el("chat-empty");
const apiKeyInputEl = el<HTMLInputElement>("api-key-input");
const apiKeySaveEl = el<HTMLButtonElement>("api-key-save");
const apiKeyStatusEl = el("api-key-status");
const timerToggleEl = el<HTMLButtonElement>("timer-toggle");
const timerFormEl = el<HTMLFormElement>("timer-form");
const timerInputEl = el<HTMLInputElement>("timer-input");
const timerCancelEl = el<HTMLButtonElement>("timer-cancel");

let recording: HotkeyAction | null = null;
let lastHotkeyJson = "";
let lastState: CueState;
let isBodyVisible = false;
let chatBusy = false;
let currentModelBubble: HTMLElement | null = null;

let lastOpened: "deck" | "chat" | "settings" = "deck";

const CHAT_INPUT_MAX_LINES = 3;

const ICON_CLOCK = `<circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.2 1.6" />`;
const ICON_PAUSE = `<path d="M6 4v8M10 4v8" />`;
const ICON_PLAY = `<path d="M6.5 4.5 11.5 8l-5 3.5Z" />`;

function chatInputMaxHeight(): number {
  const cs = getComputedStyle(chatInputEl);
  const lineHeight = parseFloat(cs.lineHeight) || 15.4;
  const padding =
    (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  const border =
    (parseFloat(cs.borderTopWidth) || 0) +
    (parseFloat(cs.borderBottomWidth) || 0);
  return lineHeight * CHAT_INPUT_MAX_LINES + padding + border;
}

function resizeChatInput(): void {
  chatInputEl.style.height = "auto";
  const max = chatInputMaxHeight();
  chatInputEl.style.height = Math.min(chatInputEl.scrollHeight, max) + "px";
}

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

function keyLabel(part: string): string {
  switch (part) {
    case "CommandOrControl":
      return "Ctrl";
    case "Super":
      return "Win";
    case "Return":
      return "Enter";
    case "Escape":
      return "Esc";
    case "Up":
      return "↑";
    case "Down":
      return "↓";
    case "Left":
      return "←";
    case "Right":
      return "→";
    default:
      return part;
  }
}

function renderKeycaps(btn: HTMLButtonElement, accelerator: string): void {
  const parts = accelerator.split("+").filter((p) => p.length > 0);
  const frag = document.createDocumentFragment();

  parts.forEach((part, i) => {
    if (i > 0) {
      const plus = document.createElement("span");
      plus.className = "hk-plus";
      plus.textContent = "+";
      frag.append(plus);
    }

    const kbd = document.createElement("kbd");
    kbd.textContent = keyLabel(part);
    frag.append(kbd);
  });

  btn.replaceChildren(frag);
}

function renderHotkeys(s: CueState): void {
  const json = JSON.stringify([s.hotkeys, s.hotkeyConflicts, recording]);
  if (json === lastHotkeyJson) return;
  lastHotkeyJson = json;

  for (const btn of hotkeyListEl.querySelectorAll<HTMLButtonElement>(
    ".hk-key",
  )) {
    const action = btn.dataset.action as HotkeyAction;
    const isRecording = recording === action;

    btn.classList.toggle("conflict", s.hotkeyConflicts.includes(action));
    btn.classList.toggle("recording", isRecording);

    if (isRecording) {
      btn.textContent = "Tekan tombol…";
    } else {
      renderKeycaps(btn, s.hotkeys[action]);
    }
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
  const settingsOpen = lastState?.settingsOpen === true;
  const chatOpen = lastState?.chatOpen === true;

  if (settingsOpen || chatOpen || isBodyVisible) {
    if (settingsOpen) window.cue.setSettingsOpen(false);
    if (chatOpen) window.cue.toggleChat();
    if (isBodyVisible) setBodyVisible(false);
    return;
  }

  if (lastOpened === "settings") {
    window.cue.setSettingsOpen(true);
  } else if (lastOpened === "chat") {
    window.cue.toggleChat();
  } else {
    setBodyVisible(true);
  }
}

function fmtTimer(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

function renderClock(s: CueState): void {
  const { status, remaining, total } = s.timer;

  if (status === "idle" && total === 0) {
    clockEl.textContent = "--:--";
    clockEl.classList.remove("warn", "done");
    return;
  }

  clockEl.textContent = fmtTimer(remaining);
  const warn =
    status !== "idle" &&
    remaining > 0 &&
    remaining <= Math.max(10, total * 0.1);
  clockEl.classList.toggle("warn", warn);
  clockEl.classList.toggle("done", remaining === 0);
}

function renderTimerToggle(s: CueState): void {
  const status = s.timer.status;

  timerToggleEl.classList.toggle("on", status !== "idle");
  timerToggleEl.title =
    status === "running"
      ? "Jeda timer"
      : status === "paused"
        ? "Lanjutkan timer"
        : "Mulai timer";

  const svg = timerToggleEl.firstElementChild;
  if (!svg) return;

  const path =
    status === "running"
      ? ICON_PAUSE
      : status === "paused"
        ? ICON_PLAY
        : ICON_CLOCK;

  svg.innerHTML = path;
}

function openTimerForm(): void {
  timerFormEl.hidden = false;
  timerInputEl.value =
    lastState.timerMinutes > 0 ? String(lastState.timerMinutes) : "";
  timerInputEl.focus();
  timerInputEl.select();
}

function closeTimerForm(): void {
  timerFormEl.hidden = true;
}

function chatScrollToBottom(): void {
  const body = chatMessagesEl.parentElement;
  if (body) body.scrollTop = body.scrollHeight;
}

function chatAppendUser(text: string): void {
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble chat-bubble-user";
  bubble.textContent = text;
  chatMessagesEl.append(bubble);
  chatEmptyEl.hidden = true;
  chatScrollToBottom();
}

function chatAppendModel(): HTMLElement {
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble chat-bubble-model";
  bubble.textContent = "";
  chatMessagesEl.append(bubble);
  chatEmptyEl.hidden = true;
  chatScrollToBottom();
  return bubble;
}

function chatSetBusy(busy: boolean): void {
  chatBusy = busy;
  chatSendEl.disabled = busy;
  chatInputEl.disabled = busy;
}

function chatSend(): void {
  if (chatBusy) return;
  const text = chatInputEl.value.trim();
  if (text.length === 0) return;

  if (!lastState.hasApiKey) {
    apiKeyStatusEl.textContent =
      "API key Gemini belum diset. Isi di Settings atau set GEMINI_API_KEY.";
    window.cue.setSettingsOpen(true);
    return;
  }

  chatInputEl.value = "";
  resizeChatInput();
  chatAppendUser(text);
  currentModelBubble = chatAppendModel();
  chatSetBusy(true);
  window.cue.sendChatMessage(text);
}

function renderApiKeyStatus(s: CueState): void {
  if (s.hasApiKey) {
    apiKeyStatusEl.textContent = "API key tersimpan.";
    apiKeyStatusEl.classList.remove("warn");
  } else {
    apiKeyStatusEl.textContent =
      "Belum ada API key. Chat tidak akan berfungsi.";
    apiKeyStatusEl.classList.add("warn");
  }
}

function render(s: CueState): void {
  lastState = s;

  const isRead = s.mode === "read";
  const isChatOpen = s.chatOpen;

  if (s.settingsOpen) {
    lastOpened = "settings";
  } else if (isChatOpen) {
    lastOpened = "chat";
  } else if (isBodyVisible) {
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

  if (isChatOpen) resizeChatInput();

  osStatusEl.textContent = s.contentProtected ? "OS: excluded" : "OS: visible";
  osStatusEl.classList.toggle("mismatch", s.privateMode !== s.contentProtected);

  deckEl.textContent = s.deckName ?? "Belum ada deck";
  deckEl.title = s.deckName ?? "";
  errorEl.textContent = s.error ?? "";
  errorEl.hidden = s.error === null;

  renderHotkeys(s);
  renderClock(s);
  renderTimerToggle(s);
  renderApiKeyStatus(s);

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

apiKeySaveEl.addEventListener("click", async () => {
  const key = apiKeyInputEl.value.trim();
  if (key.length === 0) {
    apiKeyStatusEl.textContent = "API key kosong.";
    return;
  }
  apiKeyStatusEl.textContent = "Menyimpan…";
  const ok = await window.cue.setApiKey(key);
  apiKeyInputEl.value = "";
  if (ok) {
    apiKeyStatusEl.textContent = "API key tersimpan.";
    apiKeyStatusEl.classList.remove("warn");
  } else {
    apiKeyStatusEl.textContent = "Gagal menyimpan API key.";
    apiKeyStatusEl.classList.add("warn");
  }
});

timerToggleEl.addEventListener("click", () => {
  const status = lastState.timer.status;
  if (status === "running" || status === "paused") {
    window.cue.toggleTimer();
  } else {
    openTimerForm();
  }
});

clockEl.addEventListener("click", () => {
  if (lastState.timer.status === "idle") openTimerForm();
});

timerFormEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const m = Math.floor(Number(timerInputEl.value));
  if (!Number.isFinite(m) || m <= 0) return;
  window.cue.startTimer(m);
  closeTimerForm();
});

timerCancelEl.addEventListener("click", closeTimerForm);

timerInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    closeTimerForm();
  }
});

chatInputEl.addEventListener("input", resizeChatInput);

chatInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatSend();
  }
});

chatSendEl.addEventListener("click", chatSend);

window.cue.onChatUser((text) => {
  // Pesan user sudah ditampilkan optimistis; ini hanya cadangan
  // jika ada sumber lain (misal command) yang mengirim pesan.
  void text;
});

window.cue.onChatChunk((text) => {
  if (!currentModelBubble) currentModelBubble = chatAppendModel();
  currentModelBubble.textContent += text;
  chatScrollToBottom();
});

window.cue.onChatDone(() => {
  chatSetBusy(false);
  currentModelBubble = null;
});

window.cue.onChatError((msg) => {
  if (currentModelBubble) {
    currentModelBubble.textContent = `Error: ${msg}`;
    currentModelBubble.classList.add("chat-bubble-error");
  }
  chatSetBusy(false);
  currentModelBubble = null;
});

buildHotkeyRows();
resizeChatInput();
window.cue.onState(render);
window.cue.getState().then(render);
