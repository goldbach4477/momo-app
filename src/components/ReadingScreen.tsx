"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MomoOrbSmall } from "./MomoOrb";

const COMMENTS: Record<number, number> = { 1: 12, 3: 48, 6: 7, 9: 23 };

export default function ReadingScreen({ title, content, onBack }: { title: string; content: string; onBack: () => void }) {
  const paras = content.split("\n").map((p) => p.trim()).filter(Boolean);
  const [image, setImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  // Generate chapter illustration
  useEffect(() => {
    const prompt = `${title}: ${content.slice(0, 200)}`;
    fetch("/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.image) setImage(d.image); })
      .catch(() => {})
      .finally(() => setImageLoading(false));
  }, [title, content]);

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center gap-3 px-4 h-14 bg-background border-b shrink-0 z-10">
        <Button variant="outline" size="icon-sm" onClick={onBack}>←</Button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{title || "章节预览"}</p>
          <p className="text-[10px] text-muted-foreground">by 你</p>
        </div>
        <Button variant="ghost" size="sm" className="text-[#FF6B6B]">🔖 收藏</Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Chapter illustration */}
        <div className="mx-4 mt-4 h-48 rounded-2xl flex items-center justify-center overflow-hidden"
          style={image ? undefined : { background: "linear-gradient(135deg, #FFE8E0, #FFD8B0 40%, #D0E0FF 70%, #E0D0FF)" }}>
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <div className="text-center">
              <span className="text-4xl block">{imageLoading ? "🎨" : "🖼️"}</span>
              <p className="text-[11px] text-muted-foreground mt-2">
                {imageLoading ? "AI插画生成中..." : "插画加载失败"}
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-6">
          <h2 className="text-lg font-bold mb-6 text-center">{title}</h2>
          <div className="space-y-4">
            {paras.map((p, i) => (
              <div key={i} className="relative group">
                <p className="text-[15px] leading-[2] pr-12">{p}</p>
                {COMMENTS[i] && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#FF6B6B]/10 text-[#FF6B6B] text-[11px] rounded-full px-2 py-0.5 cursor-pointer hover:bg-[#FF6B6B]/20 transition-colors">
                    💬 {COMMENTS[i]}
                  </span>
                )}
              </div>
            ))}
          </div>

          <Separator className="mt-8 mb-4" />
          <div className="flex justify-center gap-8 text-sm text-muted-foreground">
            <span>❤️ 128</span><span>💬 89</span><span>🔗 分享</span>
          </div>

          <Card className="mt-6">
            <CardContent>
              <div className="flex items-start gap-3">
                <MomoOrbSmall />
                <div className="flex-1">
                  <p className="text-sm leading-relaxed mb-3">嗯，还行。接下来打算怎么写？</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }} onClick={onBack}>跟Momo聊聊</Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={onBack}>继续创作</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
