import { supabase } from "./supabase";

// === Types (NovelCraft-inspired) ===

export type CodexEntryType = "character" | "location" | "item" | "lore" | "faction" | "other";

export type CodexEntry = {
  type: CodexEntryType;
  name: string;
  description: string;
  details?: Record<string, string>; // key-value pairs like age, role, etc.
};

export type OutlineChapter = {
  number: number;
  title: string;
  synopsis: string;
};

export type ChapterExtra = {
  number: number;
  chapterTitle: string; // AI-generated chapter title
  summary: string; // compressed summary for memory
  illustration?: string; // saved illustration URL
};

export type StoryMeta = {
  user_id: string;
  display_description: string;
  codex: CodexEntry[];
  outline: {
    overall: string;
    chapters: OutlineChapter[];
  };
  chapterExtras: ChapterExtra[]; // illustration URLs + summaries per chapter
};

export type Chapter = {
  id: string;
  story_id: string;
  number: number;
  title: string;
  content: string;
  created_at: string;
};

export type Story = {
  id: string;
  title: string;
  meta: StoryMeta;
  chapters: Chapter[];
  created_at: string;
  updated_at: string;
};

// === Helpers ===

function emptyMeta(userId: string, desc?: string): StoryMeta {
  return {
    user_id: userId,
    display_description: desc || "",
    codex: [],
    outline: { overall: "", chapters: [] },
    chapterExtras: [],
  };
}

function parseMeta(description: string): StoryMeta {
  try {
    const parsed = JSON.parse(description);
    if (parsed && typeof parsed === "object") {
      // Ensure all required fields exist with safe defaults
      const meta: StoryMeta = {
        user_id: parsed.user_id || "",
        display_description: parsed.display_description || "",
        codex: Array.isArray(parsed.codex) ? parsed.codex : [],
        outline: {
          overall: parsed.outline?.overall || parsed.plot_summary || "",
          chapters: Array.isArray(parsed.outline?.chapters) ? parsed.outline.chapters : [],
        },
        chapterExtras: Array.isArray(parsed.chapterExtras) ? parsed.chapterExtras : [],
      };
      // Migrate old character format
      if (!meta.codex.length && Array.isArray(parsed.characters)) {
        for (const c of parsed.characters) {
          if (c && c.name) {
            meta.codex.push({ type: "character", name: c.name, description: c.description || "", details: { role: c.role || "" } });
          }
        }
      }
      // Migrate old world_building
      if (parsed.world_building && !meta.codex.some((e: CodexEntry) => e.type === "lore")) {
        meta.codex.push({ type: "lore", name: "世界观", description: parsed.world_building });
      }
      return meta;
    }
  } catch {
    // description is not JSON — treat as plain text
  }
  return emptyMeta("", description || "");
}

function serialize(meta: StoryMeta): string {
  return JSON.stringify(meta);
}

// === CRUD ===

export async function getStories(userId?: string): Promise<Story[]> {
  if (!supabase) return [];
  try {
    // Parallel queries for speed
    const [storiesRes, chaptersRes] = await Promise.all([
      supabase.from("stories").select("*").order("updated_at", { ascending: false }),
      supabase.from("chapters").select("*").order("number", { ascending: true }),
    ]);
    const stories = storiesRes.data;
    const chapters = chaptersRes.data;
    if (storiesRes.error) { console.error("Stories query error:", storiesRes.error); return []; }
    if (!stories) return [];
    return stories
      .map((s) => {
        try {
          return { ...s, meta: parseMeta(s.description), chapters: (chapters || []).filter((c) => c.story_id === s.id) };
        } catch {
          return { ...s, meta: emptyMeta(""), chapters: [] };
        }
      })
      .filter((s) => !userId || s.meta.user_id === userId);
  } catch (err) {
    console.error("getStories failed:", err);
    return [];
  }
}

export async function getStory(id: string): Promise<Story | undefined> {
  if (!supabase) return undefined;
  const { data: story } = await supabase.from("stories").select("*").eq("id", id).single();
  if (!story) return undefined;
  const { data: chapters } = await supabase.from("chapters").select("*").eq("story_id", id).order("number", { ascending: true });
  return { ...story, meta: parseMeta(story.description), chapters: chapters || [] };
}

export async function createStory(title: string, userId: string, description?: string): Promise<Story> {
  if (!supabase) throw new Error("DB not configured");
  const meta = emptyMeta(userId, description);
  const { data, error } = await supabase.from("stories").insert({ title, description: serialize(meta) }).select().single();
  if (error) throw error;
  return { ...data, meta, chapters: [] };
}

export async function updateStoryMeta(storyId: string, updates: Partial<StoryMeta>): Promise<void> {
  if (!supabase) return;
  const story = await getStory(storyId);
  if (!story) return;
  const newMeta = { ...story.meta, ...updates };
  await supabase.from("stories").update({ description: serialize(newMeta), updated_at: new Date().toISOString() }).eq("id", storyId);
}

// Smart merge: add new codex entries or update existing ones by name
export async function mergeCodex(storyId: string, newEntries: CodexEntry[]): Promise<void> {
  const story = await getStory(storyId);
  if (!story) return;
  const codex = [...story.meta.codex];
  for (const entry of newEntries) {
    const existing = codex.findIndex((e) => e.type === entry.type && e.name === entry.name);
    if (existing >= 0) {
      // Update existing entry
      codex[existing] = { ...codex[existing], ...entry, details: { ...codex[existing].details, ...entry.details } };
    } else {
      codex.push(entry);
    }
  }
  await updateStoryMeta(storyId, { codex });
}

// Smart merge outline: update or add chapter outlines
export async function mergeOutline(storyId: string, overall?: string, chapters?: OutlineChapter[]): Promise<void> {
  const story = await getStory(storyId);
  if (!story) return;
  const outline = { ...story.meta.outline };
  if (overall) outline.overall = overall;
  if (chapters) {
    for (const ch of chapters) {
      const idx = outline.chapters.findIndex((c) => c.number === ch.number);
      if (idx >= 0) outline.chapters[idx] = ch;
      else outline.chapters.push(ch);
    }
    outline.chapters.sort((a, b) => a.number - b.number);
  }
  await updateStoryMeta(storyId, { outline });
}

export async function addChapter(storyId: string, title: string, content: string): Promise<Chapter> {
  if (!supabase) throw new Error("DB not configured");
  const { count } = await supabase.from("chapters").select("*", { count: "exact", head: true }).eq("story_id", storyId);
  const number = (count || 0) + 1;
  const { data, error } = await supabase.from("chapters").insert({ story_id: storyId, number, title, content }).select().single();
  if (error) throw error;
  await supabase.from("stories").update({ updated_at: new Date().toISOString() }).eq("id", storyId);
  return data;
}

// Save chapter illustration and summary
export async function saveChapterExtra(storyId: string, chapterNumber: number, extra: Partial<ChapterExtra>): Promise<void> {
  const story = await getStory(storyId);
  if (!story) return;
  const extras = [...story.meta.chapterExtras];
  const idx = extras.findIndex((e) => e.number === chapterNumber);
  if (idx >= 0) {
    extras[idx] = { ...extras[idx], ...extra };
  } else {
    extras.push({ number: chapterNumber, chapterTitle: extra.chapterTitle || "", summary: extra.summary || "", illustration: extra.illustration });
  }
  await updateStoryMeta(storyId, { chapterExtras: extras });
}

// Build story memory for AI context
export async function buildStoryMemory(storyId: string): Promise<string> {
  const story = await getStory(storyId);
  if (!story) return "";

  const parts: string[] = [];

  // 1. Core settings (always included)
  const chars = story.meta.codex.filter((e) => e.type === "character");
  const lore = story.meta.codex.filter((e) => e.type === "lore");
  const locs = story.meta.codex.filter((e) => e.type === "location");

  if (chars.length) parts.push("【主要角色】\n" + chars.map((c) => `${c.name}（${c.details?.role || ""}）：${c.description}`).join("\n"));
  if (lore.length) parts.push("【世界规则】\n" + lore.map((l) => `${l.name}：${l.description}`).join("\n"));
  if (locs.length) parts.push("【重要地点】\n" + locs.map((l) => `${l.name}：${l.description}`).join("\n"));

  // 2. Outline
  if (story.meta.outline.overall) parts.push("【剧情大纲】\n" + story.meta.outline.overall);

  // 3. Chapter history (compressed — older = shorter)
  const totalChapters = story.chapters.length;
  for (let i = 0; i < totalChapters; i++) {
    const ch = story.chapters[i];
    const extra = story.meta.chapterExtras.find((e) => e.number === ch.number);
    const isRecent = i >= totalChapters - 2; // last 2 chapters get more detail

    if (extra?.summary) {
      // Use pre-generated summary
      parts.push(`【第${ch.number}章：${extra.chapterTitle || ch.title}】${isRecent ? "\n" + extra.summary : " " + extra.summary}`);
    } else if (isRecent) {
      // Last 2 chapters: include more content
      parts.push(`【第${ch.number}章：${ch.title}】\n${ch.content.slice(0, 800)}`);
    } else {
      // Older chapters: just title
      parts.push(`【第${ch.number}章：${ch.title}】（详见前文）`);
    }
  }

  return parts.join("\n\n");
}

// Rename story
export async function renameStory(storyId: string, newTitle: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("stories").update({ title: newTitle, updated_at: new Date().toISOString() }).eq("id", storyId);
}
