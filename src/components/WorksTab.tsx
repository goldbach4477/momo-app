"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getStories, type Story, type CodexEntryType } from "@/lib/store";

const TYPE_LABELS: Record<CodexEntryType, string> = {
  character: "👥 人物", location: "🗺️ 地点", item: "⚔️ 物品", lore: "📜 规则", faction: "🏴 势力", other: "📌 其他"
};

export default function WorksTab({ userId, onContinue, onRead }: {
  userId: string; onContinue: (storyId: string) => void; onRead: (title: string, content: string) => void;
}) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"settings" | "chapters">("settings");

  useEffect(() => {
    getStories(userId)
      .then(setStories)
      .catch((err) => { console.error("Failed to load stories:", err); setStories([]); })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="flex items-center justify-center" style={{ height: "calc(100dvh - 120px)" }}><span className="w-2 h-2 rounded-full bg-[#FF6B6B] dot-anim-1" /></div>;
  if (stories.length === 0) return (
    <div className="flex flex-col items-center justify-center gap-4 px-8" style={{ height: "calc(100dvh - 120px)" }}>
      <span className="text-5xl">✏️</span><p className="text-sm font-medium">还没有作品</p>
      <p className="text-xs text-muted-foreground text-center">去&quot;创作&quot;页面跟Momo聊聊</p>
    </div>
  );

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">我的作品</h2>
        <Badge variant="outline">{stories.length} 部</Badge>
      </div>

      {stories.map((story) => {
        const isOpen = expanded === story.id;
        return (
          <Card key={story.id}>
            <CardHeader className="cursor-pointer" onClick={() => { setExpanded(isOpen ? null : story.id); }}>
              <div className="flex items-center justify-between">
                <CardTitle>{story.title}</CardTitle>
                <span className="text-muted-foreground text-xs">{isOpen ? "▲" : "▼"}</span>
              </div>
              <CardDescription>{story.meta.display_description}</CardDescription>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="secondary">{story.chapters.length} 章</Badge>
                <Badge variant="outline">{story.meta.codex.length} 条设定</Badge>
                {story.meta.outline.chapters.length > 0 && <Badge variant="outline">{story.meta.outline.chapters.length} 章大纲</Badge>}
              </div>
            </CardHeader>

            {isOpen && (
              <CardContent className="space-y-3">
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  <button onClick={() => setTab("settings")} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tab === "settings" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>📋 设定集</button>
                  <button onClick={() => setTab("chapters")} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tab === "chapters" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>📖 正文</button>
                </div>

                {tab === "settings" ? (
                  <div className="space-y-3">
                    {/* Outline */}
                    {story.meta.outline.overall && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">📋 大纲</p>
                        <p className="text-xs leading-relaxed bg-muted rounded-lg p-2.5">{story.meta.outline.overall}</p>
                      </div>
                    )}
                    {story.meta.outline.chapters.length > 0 && (
                      <div className="space-y-1">
                        {story.meta.outline.chapters.map((ch) => (
                          <div key={ch.number} className="flex gap-2 text-xs bg-muted rounded-lg p-2">
                            <Badge variant="outline" className="text-[10px] shrink-0">第{ch.number}章</Badge>
                            <span className="font-medium">{ch.title}</span>
                            {ch.synopsis && <span className="text-muted-foreground truncate">— {ch.synopsis}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Codex by type */}
                    {(Object.keys(TYPE_LABELS) as CodexEntryType[]).map((type) => {
                      const entries = story.meta.codex.filter((e) => e.type === type);
                      if (entries.length === 0) return null;
                      return (
                        <div key={type}>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">{TYPE_LABELS[type]}</p>
                          <div className="space-y-1.5">
                            {entries.map((e, i) => (
                              <div key={i} className="bg-muted rounded-lg p-2.5">
                                <span className="text-xs font-medium">{e.name}</span>
                                {e.details?.role && <Badge variant="outline" className="text-[10px] ml-2">{e.details.role}</Badge>}
                                {e.description && <p className="text-[11px] text-muted-foreground mt-0.5">{e.description}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {story.meta.codex.length === 0 && !story.meta.outline.overall && (
                      <p className="text-xs text-muted-foreground text-center py-4">还没有设定，去聊天页跟Momo聊，然后点"生成到作品"</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {story.chapters.length > 0 ? story.chapters.map((ch) => (
                      <button key={ch.id} onClick={() => onRead(ch.title, ch.content)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm flex items-center justify-between group">
                        <span><span className="text-muted-foreground mr-2">第{ch.number}章</span>{ch.title}</span>
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">阅读 →</span>
                      </button>
                    )) : <p className="text-xs text-muted-foreground text-center py-4">还没写任何章节</p>}
                  </div>
                )}

                <Separator />
                <Button className="w-full text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }} onClick={() => onContinue(story.id)}>继续创作</Button>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
