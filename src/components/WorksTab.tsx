"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getStories, type Story } from "@/lib/store";

export default function WorksTab({ userId, onContinue, onRead }: {
  userId: string; onContinue: (storyId: string) => void; onRead: (title: string, content: string) => void;
}) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"settings" | "chapters">("chapters");

  useEffect(() => { getStories(userId).then(setStories).finally(() => setLoading(false)); }, [userId]);

  if (loading) return <div className="flex items-center justify-center" style={{ height: "calc(100dvh - 120px)" }}><span className="w-2 h-2 rounded-full bg-[#FF6B6B] dot-anim-1" /></div>;

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-8" style={{ height: "calc(100dvh - 120px)" }}>
        <span className="text-5xl">✏️</span>
        <p className="text-sm font-medium">还没有作品</p>
        <p className="text-xs text-muted-foreground text-center leading-relaxed">去&quot;创作&quot;页面跟Momo聊聊<br />你的第一个故事就会出现在这里</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">我的作品</h2>
        <Badge variant="outline">{stories.length} 部</Badge>
      </div>

      {stories.map((story) => {
        const isOpen = expanded === story.id;
        const meta = story.meta;

        return (
          <Card key={story.id}>
            <CardHeader className="cursor-pointer" onClick={() => setExpanded(isOpen ? null : story.id)}>
              <div className="flex items-center justify-between">
                <CardTitle>{story.title}</CardTitle>
                <span className="text-muted-foreground text-xs">{isOpen ? "▲" : "▼"}</span>
              </div>
              <CardDescription>{meta.display_description}</CardDescription>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="secondary">{story.chapters.length} 章</Badge>
                {meta.characters.length > 0 && <Badge variant="outline">{meta.characters.length} 角色</Badge>}
                <span className="text-[10px] text-muted-foreground">更新于 {new Date(story.updated_at).toLocaleDateString("zh-CN")}</span>
              </div>
            </CardHeader>

            {isOpen && (
              <CardContent className="space-y-3">
                {/* Tab switch: 设定 / 正文 */}
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  <button onClick={() => setTab("settings")} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tab === "settings" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                    📋 设定
                  </button>
                  <button onClick={() => setTab("chapters")} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tab === "chapters" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                    📖 正文
                  </button>
                </div>

                {tab === "settings" ? (
                  <div className="space-y-3">
                    {/* World building */}
                    <SettingSection icon="🌍" title="世界观" content={meta.world_building} empty="还没有设定世界观" />

                    {/* Plot */}
                    <SettingSection icon="📋" title="剧情概要" content={meta.plot_summary} empty="还没有剧情概要" />

                    {/* Characters */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">👥 人物</p>
                      {meta.characters.length > 0 ? (
                        <div className="space-y-2">
                          {meta.characters.map((c, i) => (
                            <div key={i} className="bg-muted rounded-lg p-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{c.name}</span>
                                <Badge variant="outline" className="text-[10px]">{c.role}</Badge>
                              </div>
                              {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2.5">还没有人物设定</p>
                      )}
                    </div>

                    <p className="text-[10px] text-muted-foreground text-center">💡 跟Momo聊天后点"+"→"插入作品"自动更新设定</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {story.chapters.length > 0 ? (
                      story.chapters.map((ch) => (
                        <button key={ch.id} onClick={() => onRead(ch.title, ch.content)}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm flex items-center justify-between group">
                          <span>
                            <span className="text-muted-foreground mr-2">第{ch.number}章</span>
                            {ch.title}
                          </span>
                          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">阅读 →</span>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">还没写任何章节</p>
                    )}
                  </div>
                )}

                <Separator />
                <Button className="w-full text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
                  onClick={() => onContinue(story.id)}>继续创作</Button>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function SettingSection({ icon, title, content, empty }: { icon: string; title: string; content: string; empty: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2">{icon} {title}</p>
      <div className="bg-muted rounded-lg p-2.5">
        <p className="text-xs leading-relaxed">{content || <span className="text-muted-foreground">{empty}</span>}</p>
      </div>
    </div>
  );
}
