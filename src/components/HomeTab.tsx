"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MomoOrb from "./MomoOrb";
import { SEEDS } from "@/lib/seeds";
import { getStories, type Story } from "@/lib/store";
import { getRecentSession, type ChatSession } from "@/lib/chatCache";

export default function HomeTab({ userId, onStartChat, onContinueStory }: {
  userId?: string;
  onStartChat: (seed: string) => void;
  onContinueStory?: (storyId: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [recentStory, setRecentStory] = useState<Story | null>(null);
  const [recentChat, setRecentChat] = useState<ChatSession | null>(null);

  useEffect(() => {
    setMounted(true);
    // Check for recent unsaved chat session
    const cached = getRecentSession();
    if (cached && cached.messages.length > 0) setRecentChat(cached);
    // Check for recent saved story
    if (userId) {
      getStories(userId).then((stories) => {
        if (stories.length > 0) setRecentStory(stories[0]);
      }).catch(() => {});
    }
  }, [userId]);

  const picked = useMemo(() => {
    if (!mounted) return SEEDS.slice(0, 2);
    const shuffled = [...SEEDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, refreshKey]);

  return (
    <div className="px-4 pt-10 pb-6 space-y-5">
      {/* Momo */}
      <div className="flex flex-col items-center">
        <MomoOrb size={88} />
        <h1 className="text-xl font-bold mt-2 gradient-text">Momo</h1>
        <p className="text-xs text-muted-foreground mt-0.5">你的专属故事编辑</p>
      </div>

      {/* Resume recent chat session — highest priority */}
      {recentChat && !recentChat.storyId && (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-[11px] font-medium text-muted-foreground tracking-wider uppercase">💬 上次的对话</p>
            <div>
              <p className="text-sm">{recentChat.seed?.slice(0, 40)}...</p>
              <p className="text-xs text-muted-foreground mt-1">{recentChat.messages.length}条消息</p>
            </div>
            <Button className="w-full h-10 text-sm font-semibold text-white border-0"
              style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
              onClick={() => onStartChat(recentChat.seed)}>
              继续聊
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Continue recent saved story */}
      {recentStory && onContinueStory && (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-[11px] font-medium text-muted-foreground tracking-wider uppercase">📖 继续创作</p>
            <div>
              <p className="text-base font-semibold">{recentStory.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {recentStory.chapters.length}章 · {recentStory.meta.codex.length}条设定
                · 更新于 {new Date(recentStory.updated_at).toLocaleDateString("zh-CN")}
              </p>
            </div>
            <Button className="w-full h-10 text-sm font-semibold text-white border-0"
              style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
              onClick={() => onContinueStory(recentStory.id)}>
              继续上次的故事
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New inspiration */}
      {mounted && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground tracking-wider uppercase">✦ 新灵感</p>
              <button onClick={() => setRefreshKey((k) => k + 1)}
                className="text-[11px] text-[#FF6B6B] bg-transparent border-none cursor-pointer">↻ 换一批</button>
            </div>
            {picked.map((seed, i) => (
              <div key={i} className="flex gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                onClick={() => onStartChat(seed.text)}>
                <span className="text-2xl leading-none mt-0.5">{seed.emoji}</span>
                <p className="text-sm leading-relaxed flex-1">{seed.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Custom input */}
      <Card>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="🎤 说说你自己的想法..." className="h-10" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { onStartChat(input.trim()); setInput(""); } }} />
            <Button size="icon" className="h-10 w-10 shrink-0 text-white border-0"
              style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
              disabled={!input.trim()}
              onClick={() => { if (input.trim()) { onStartChat(input.trim()); setInput(""); } }}>↑</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
