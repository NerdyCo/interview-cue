import "./index.css";
import type { CueState } from "./shared/ipc";

const modeEl = document.getElementById("mode")!;
const toggleEl = document.getElementById("toggle") as HTMLButtonElement;

function render(s: CueState): void {
  const isRead = s.mode === "read";
  document.body.classList.toggle("read", isRead);
  modeEl.textContent = isRead ? "READ" : "INTERACT";
  toggleEl.textContent = isRead ? "Interact mode" : "Read mode";
}

toggleEl.addEventListener("click", () => window.cue.toggleMode());

window.cue.onState(render);
window.cue.getState().then(render);
