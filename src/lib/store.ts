// Simple localStorage-based store for prototype

export type Chapter = {
  id: string;
  number: number;
  title: string;
  content: string;
  createdAt: string;
};

export type Story = {
  id: string;
  title: string;
  description: string;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
};

const STORIES_KEY = "momo_stories";

export function getStories(): Story[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORIES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getStory(id: string): Story | undefined {
  return getStories().find((s) => s.id === id);
}

export function createStory(title: string, description: string): Story {
  const stories = getStories();
  const story: Story = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title,
    description,
    chapters: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  stories.unshift(story);
  localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
  return story;
}

export function addChapter(storyId: string, title: string, content: string): Chapter {
  const stories = getStories();
  const story = stories.find((s) => s.id === storyId);
  if (!story) throw new Error("Story not found");

  const chapter: Chapter = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    number: story.chapters.length + 1,
    title,
    content,
    createdAt: new Date().toISOString(),
  };
  story.chapters.push(chapter);
  story.updatedAt = new Date().toISOString();
  localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
  return chapter;
}

export function deleteStory(id: string) {
  const stories = getStories().filter((s) => s.id !== id);
  localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
}
