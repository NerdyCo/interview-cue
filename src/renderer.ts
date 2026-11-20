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

let recording: HotkeyAction | null = null;
let lastHotkeyJson = "";
let lastState: CueState;
let isBodyVisible = false;

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

/**
 * Tombol berikon TIDAK boleh diset textContent — itu menghapus SVG-nya.
 * Untuk .tb-btn (ikon + label), update hanya span label-nya.
 */
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

function tickClock(): void {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  clockEl.textContent = `${hh}:${mm}`;
}

function render(s: CueState): void {
  lastState = s;

  const isRead = s.mode === "read";
  document.body.classList.toggle("read", isRead);
  document.body.classList.toggle("private", s.privateMode);
  document.body.classList.toggle("session", s.sessionActive);
  document.body.classList.toggle("needs-ack", !s.disclaimerAcked);
  document.body.classList.toggle("show-settings", s.settingsOpen);

  // Error penting (mis. hotkey bentrok) harus langsung terlihat.
  if (s.error && !isBodyVisible) setBodyVisible(true);

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

  osStatusEl.textContent = s.contentProtected ? "OS: excluded" : "OS: visible";
  osStatusEl.classList.toggle("mismatch", s.privateMode !== s.contentProtected);

  deckEl.textContent = s.deckName ?? "Belum ada deck";
  deckEl.title = s.deckName ?? "";
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

  // marked tidak membersihkan HTML. Langkah ini wajib.
  bodyEl.innerHTML = DOMPurify.sanitize(card.html, {
    USE_PROFILES: { html: true },
  });
  bodyEl.scrollTop = 0;
}

// Buka/tutup kartu: chevron atau klik logo grip.
// Drag window tetap lewat grip (app-region: drag); klik pendek = toggle.
collapseEl.addEventListener("click", () => setBodyVisible(!isBodyVisible));
gripEl.addEventListener("click", () => setBodyVisible(!isBodyVisible));

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

buildHotkeyRows();
tickClock();
setInterval(tickClock, 10_000);
window.cue.onState(render);
window.cue.getState().then(render);
