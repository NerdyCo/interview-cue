import "./index.css";
import DOMPurify from "dompurify";
import type { CueState } from "./shared/ipc";
import { el } from "./renderer/dom";

const modeEl = el("mode");
const toggleEl = el<HTMLButtonElement>("toggle");
const openEl = el<HTMLButtonElement>("open");
const deckEl = el("deck");
const counterEl = el("counter");
const titleEl = el("card-title");
const bodyEl = el("card-body");
const errorEl = el("error");

function render(s: CueState): void {
  const isRead = s.mode === "read";
  document.body.classList.toggle("read", isRead);
  modeEl.textContent = isRead ? "READ" : "INTERACT";
  toggleEl.textContent = isRead ? "Interact" : "Read";

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

  counterEl.textContent = `Kartu ${s.cardIndex + 1} dari ${s.cards.length}`;
  titleEl.textContent = card.title;

  const clean = DOMPurify.sanitize(card.html, { USE_PROFILES: { html: true } });
  bodyEl.innerHTML = clean;
  bodyEl.scrollTop = 0;
}

toggleEl.addEventListener("click", () => window.cue.toggleMode());
openEl.addEventListener("click", () => window.cue.openDeck());

window.cue.onState(render);
window.cue.getState().then(render);
