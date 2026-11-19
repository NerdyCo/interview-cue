import { readFile } from "node:fs/promises";
import path from "node:path";
import { Marked, type Token } from "marked";
import type { CueCard } from "../shared/ipc";

const marked = new Marked({ gfm: true, breaks: true });

const CARD_HEADING_DEPTH = 2;

function isCardBoundary(token: Token): boolean {
  return token.type === "heading" && token.depth === CARD_HEADING_DEPTH;
}

function headingTitle(token: Token): string {
  return token.type === "heading" ? token.text : "";
}

export function splitCards(source: string): CueCard[] {
  const tokens = marked.lexer(source);
  const groups: Token[][] = [];
  let current: Token[] = [];

  for (const token of tokens) {
    if (isCardBoundary(token)) {
      if (current.length > 0) groups.push(current);
      current = [token];
    } else {
      current.push(token);
    }
  }
  if (current.length > 0) groups.push(current);

  return groups.map((group, i) => {
    const first = group[0];
    const title =
      first && isCardBoundary(first) ? headingTitle(first) : `Kartu ${i + 1}`;
    return { title, html: marked.parser(group) };
  });
}

export async function loadDeck(filePath: string): Promise<{
  name: string;
  cards: CueCard[];
}> {
  const source = await readFile(filePath, "utf8");
  const cards = splitCards(source);

  if (cards.length === 0) {
    throw new Error("File ini kosong, tidak ada kartu yang bisa ditampilkan.");
  }

  return { name: path.basename(filePath), cards };
}
