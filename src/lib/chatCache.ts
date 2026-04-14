// Cache chat sessions in localStorage so they survive navigation

const CACHE_KEY = "momo_chat_sessions";
const RECENT_KEY = "momo_recent_session";

export type ChatSession = {
  id: string; // storyId or a temp id
  storyId?: string;
  storyTitle: string;
  seed: string;
  messages: { role: string; text: string; choices?: string[]; paragraph?: string }[];
  apiHistory: { role: string; content: string }[];
  draftParagraphs: string[];
  updatedAt: string;
};

function getSessions(): Record<string, ChatSession> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}

export function saveSession(session: ChatSession) {
  const sessions = getSessions();
  sessions[session.id] = { ...session, updatedAt: new Date().toISOString() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(sessions));
  localStorage.setItem(RECENT_KEY, session.id);
}

export function getSession(id: string): ChatSession | null {
  return getSessions()[id] || null;
}

export function getRecentSession(): ChatSession | null {
  if (typeof window === "undefined") return null;
  const recentId = localStorage.getItem(RECENT_KEY);
  if (!recentId) return null;
  return getSession(recentId);
}

export function deleteSession(id: string) {
  const sessions = getSessions();
  delete sessions[id];
  localStorage.setItem(CACHE_KEY, JSON.stringify(sessions));
  const recent = localStorage.getItem(RECENT_KEY);
  if (recent === id) localStorage.removeItem(RECENT_KEY);
}
