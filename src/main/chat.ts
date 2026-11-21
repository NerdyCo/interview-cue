import { GoogleGenerativeAI, type ChatSession } from "@google/generative-ai";
import { getSettings } from "./store";

const MODEL_ID = "gemini-2.5-flash";

let chatSession: ChatSession | null = null;
let apiKeyUsed = "";

function getApiKey(): string {
  const envKey = process.env.GEMINI_API_KEY ?? "";
  if (envKey.trim().length > 0) return envKey.trim();
  return getSettings().geminiApiKey.trim();
}

function ensureSession(): ChatSession {
  const key = getApiKey();
  if (key.length === 0) {
    throw new Error(
      "API key Gemini belum diset. Isi di Settings atau set GEMINI_API_KEY.",
    );
  }

  if (chatSession && apiKeyUsed === key) return chatSession;

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction:
      "Kamu adalah asisten AI di overlay cue card untuk presenter. Jawab singkat, padat, dan langsung. Bahasa Indonesia kecuali diminta lain.",
  });

  chatSession = model.startChat({ history: [] });
  apiKeyUsed = key;
  return chatSession;
}

export function resetChatSession(): void {
  chatSession = null;
  apiKeyUsed = "";
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

export async function streamChat(
  text: string,
  onChunk: (t: string) => void,
): Promise<void> {
  const session = ensureSession();
  const result = await session.sendMessageStream(text);

  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    if (chunkText.length > 0) onChunk(chunkText);
  }
}
