import { supabase } from "./supabase";

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
  description: string;
  chapters: Chapter[];
  created_at: string;
  updated_at: string;
};

export async function getStories(): Promise<Story[]> {
  if (!supabase) return [];

  const { data: stories } = await supabase
    .from("stories")
    .select("*")
    .order("updated_at", { ascending: false });

  if (!stories) return [];

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .order("number", { ascending: true });

  return stories.map((s) => ({
    ...s,
    chapters: (chapters || []).filter((c) => c.story_id === s.id),
  }));
}

export async function getStory(id: string): Promise<Story | undefined> {
  if (!supabase) return undefined;

  const { data: story } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .single();

  if (!story) return undefined;

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("story_id", id)
    .order("number", { ascending: true });

  return { ...story, chapters: chapters || [] };
}

export async function createStory(title: string, description: string): Promise<Story> {
  if (!supabase) throw new Error("Database not configured");

  const { data, error } = await supabase
    .from("stories")
    .insert({ title, description })
    .select()
    .single();

  if (error) throw error;
  return { ...data, chapters: [] };
}

export async function addChapter(storyId: string, title: string, content: string): Promise<Chapter> {
  if (!supabase) throw new Error("Database not configured");

  const { count } = await supabase
    .from("chapters")
    .select("*", { count: "exact", head: true })
    .eq("story_id", storyId);

  const number = (count || 0) + 1;

  const { data, error } = await supabase
    .from("chapters")
    .insert({ story_id: storyId, number, title, content })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from("stories")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", storyId);

  return data;
}
