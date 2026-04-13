import { supabase } from "./supabase";

export type Character = { name: string; description: string; role: string };
export type OutlineItem = { chapter: number; summary: string };

export type StoryMeta = {
  user_id: string;
  display_description: string;
  world_building: string;
  plot_summary: string;
  characters: Character[];
  outline: OutlineItem[];
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

function parseMeta(description: string): StoryMeta {
  try {
    const parsed = JSON.parse(description);
    if (parsed.user_id) return parsed;
  } catch {}
  return { user_id: "", display_description: description || "", world_building: "", plot_summary: "", characters: [], outline: [] };
}

function serializeMeta(meta: StoryMeta): string {
  return JSON.stringify(meta);
}

export async function getStories(userId?: string): Promise<Story[]> {
  if (!supabase) return [];
  const { data: stories } = await supabase.from("stories").select("*").order("updated_at", { ascending: false });
  if (!stories) return [];
  const { data: chapters } = await supabase.from("chapters").select("*").order("number", { ascending: true });

  return stories
    .map((s) => ({ ...s, meta: parseMeta(s.description), chapters: (chapters || []).filter((c) => c.story_id === s.id) }))
    .filter((s) => !userId || s.meta.user_id === userId);
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
  const meta: StoryMeta = { user_id: userId, display_description: description || "", world_building: "", plot_summary: "", characters: [], outline: [] };
  const { data, error } = await supabase.from("stories").insert({ title, description: serializeMeta(meta) }).select().single();
  if (error) throw error;
  return { ...data, meta, chapters: [] };
}

export async function updateStoryMeta(storyId: string, meta: Partial<StoryMeta>): Promise<void> {
  if (!supabase) return;
  const story = await getStory(storyId);
  if (!story) return;
  const newMeta = { ...story.meta, ...meta };
  await supabase.from("stories").update({ description: serializeMeta(newMeta), updated_at: new Date().toISOString() }).eq("id", storyId);
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
