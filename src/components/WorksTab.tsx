"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getStories, type Story } from "@/lib/store";

export default function WorksTab({ onContinue, onRead }: {
  onContinue: (storyId: string) => void;
  onRead: (title: string, content: string) => void;
}) {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    setStories(getStories());
  }, []);

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-8" style={{ height: "calc(100dvh - 120px)" }}>
        <span className="text-5xl">✏️</span>
        <p className="text-sm font-medium">还没有作品</p>
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          去&quot;创作&quot;页面跟Momo聊聊<br />你的第一个故事就会出现在这里
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">我的作品</h2>
        <Badge variant="outline">{stories.length} 部</Badge>
      </div>

      {stories.map((story) => (
        <Card key={story.id}>
          <CardHeader>
            <CardTitle>{story.title}</CardTitle>
            <CardDescription>{story.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{story.chapters.length} 章</Badge>
              <span>·</span>
              <span>更新于 {new Date(story.updatedAt).toLocaleDateString("zh-CN")}</span>
            </div>

            {story.chapters.length > 0 && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  {story.chapters.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => onRead(ch.title, ch.content)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm flex items-center justify-between group"
                    >
                      <span>
                        <span className="text-muted-foreground mr-2">第{ch.number}章</span>
                        {ch.title}
                      </span>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        阅读 →
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <Button
              className="w-full text-white border-0"
              style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
              onClick={() => onContinue(story.id)}
            >
              继续创作
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
