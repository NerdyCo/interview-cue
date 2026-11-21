import { GoogleGenAI, ThinkingLevel, type Chat } from "@google/genai";
import { getSettings } from "./store";

const MODEL_ID = "gemini-3.8-flash";

const SYSTEM_INSTRUCTION =
  "Kamu adalah asisten AI di overlay cue card untuk presenter. " +
  "Jawab singkat, padat, dan langsung. Bahasa Indonesia kecuali diminta lain.";

let chat: Chat | null = null;
let apiKeyUsed = "";

function getApiKey(): string {
  const envKey = process.env.GEMINI_API_KEY ?? "";
  if (envKey.trim().length > 0) return envKey.trim();
  return getSettings().geminiApiKey.trim();
}

function ensureChat(): Chat {
  const key = getApiKey();
  if (key.length === 0) {
    throw new Error(
      "API key Gemini belum diset. Isi di Settings atau set GEMINI_API_KEY.",
    );
  }

  if (chat && apiKeyUsed === key) return chat;

  const ai = new GoogleGenAI({ apiKey: key });

  chat = ai.chats.create({
    model: MODEL_ID,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      // Overlay butuh jawaban cepat, bukan reasoning panjang.
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  apiKeyUsed = key;
  return chat;
}

export function resetChatSession(): void {
  chat = null;
  apiKeyUsed = "";
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

export async function streamChat(
  text: string,
  onChunk: (t: string) => void,
): Promise<void> {
  const session = ensureChat();
  const stream = await session.sendMessageStream({ message: text });

  for await (const chunk of stream) {
    const chunkText = chunk.text;
    if (chunkText) onChunk(chunkText);
  }
}
