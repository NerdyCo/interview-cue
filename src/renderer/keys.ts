export function toAccelerator(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("CommandOrControl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Super");

  const key = normalizeKey(e);
  if (!key) return null;

  if (parts.length === 0 && !/^F\d{1,2}$/.test(key)) return null;

  parts.push(key);
  return parts.join("+");
}

function normalizeKey(e: KeyboardEvent): string | null {
  const k = e.key;

  if (["Control", "Alt", "Shift", "Meta", "OS"].includes(k)) return null;

  if (/^F\d{1,2}$/.test(k)) return k;

  switch (k) {
    case "ArrowUp":
      return "Up";
    case "ArrowDown":
      return "Down";
    case "ArrowLeft":
      return "Left";
    case "ArrowRight":
      return "Right";
    case " ":
      return "Space";
    case "Escape":
      return "Escape";
    case "Enter":
      return "Return";
    case "+":
      return "Plus";
    case "PageUp":
      return "PageUp";
    case "PageDown":
      return "PageDown";
    default:
      break;
  }

  if (k.length === 1) {
    const upper = k.toUpperCase();
    if (/[A-Z0-9]/.test(upper)) return upper;
    if (/[;=,\-./[\]\\'`]/.test(k)) return k;
  }

  return null;
}
