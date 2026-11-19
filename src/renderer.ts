import "./index.css";
import DOMPurify from "dompurify";
import type { CueState } from "./shared/ipc";
import { el } from "./renderer/dom";

const modeEl = el("mode");
const toggleEl = el<HTMLButtonElement>("toggle");
const privateEl = el<HTMLButtonElement>("private");
const sessionEl = el<HTMLButtonElement>("session");
const hideEl = el<HTMLButtonElement>("hide");
const openEl = el<HTMLButtonElement>("open");
const deckEl = el("deck");
const counterEl = el("counter");
const osStatusEl = el("os-status");
const titleEl = el("card-title");
const bodyEl = el("card-body");
const errorEl = el("error");
const bannerEl = el("session-banner");
const disclaimerEl = el("disclaimer");
const ackEl = el<HTMLButtonElement>("ack");

function render(s: CueState): void {
  const isRead = s.mode === "read";
  document.body.classList.toggle("read", isRead);
  document.body.classList.toggle("private", s.privateMode);
  document.body.classList.toggle("session", s.sessionActive);
  document.body.classList.toggle("needs-ack", !s.disclaimerAcked);

  modeEl.textContent = isRead ? "READ" : "INTERACT";
  toggleEl.textContent = isRead ? "Interact" : "Read";

  privateEl.textContent = s.privateMode ? "Private: ON" : "Private: OFF";
  privateEl.disabled = !s.disclaimerAcked;

  sessionEl.textContent = s.sessionActive ? "Sesi: ON" : "Sesi";
  sessionEl.disabled = !s.disclaimerAcked;

  bannerEl.hidden = !s.sessionActive;

  osStatusEl.textContent = s.contentProtected ? "OS: excluded" : "OS: visible";
  osStatusEl.classList.toggle("mismatch", s.privateMode !== s.contentProtected);

  disclaimerEl.hidden = s.disclaimerAcked;

  deckEl.textContent = s.deckName ?? "Belum ada deck";
  errorEl.textContent = s.error ?? "";
  errorEl.hidden = s.error === null;

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

toggleEl.addEventListener("click", () => window.cue.toggleMode());
privateEl.addEventListener("click", () => window.cue.togglePrivate());
sessionEl.addEventListener("click", () => window.cue.toggleSession());
hideEl.addEventListener("click", () => window.cue.panicHide());
openEl.addEventListener("click", () => window.cue.openDeck());
ackEl.addEventListener("click", () => window.cue.ackDisclaimer());

window.cue.onState(render);
window.cue.getState().then(render);
