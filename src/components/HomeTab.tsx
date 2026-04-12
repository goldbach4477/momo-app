"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MomoOrb from "./MomoOrb";
import { SEEDS } from "@/lib/seeds";

export default function HomeTab({ onStartChat }: { onStartChat: (seed: string) => void }) {
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  // Pick 3 random seeds on mount and on refresh
  const picked = useMemo(() => {
    if (!mounted) return SEEDS.slice(0, 3);
    const shuffled = [...SEEDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, refreshKey]);

  const mainSeed = picked[0];

  return (
    <div className="px-4 pt-10 pb-6 space-y-5">
      {/* Momo */}
      <div className="flex flex-col items-center">
        <MomoOrb size={88} />
        <h1 className="text-xl font-bold mt-2 gradient-text">Momo</h1>
        <p className="text-xs text-muted-foreground mt-0.5">你的专属故事编辑</p>
      </div>

      {/* Main seed */}
      {mounted && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-[11px] font-medium text-muted-foreground tracking-wider uppercase">✦ 今日灵感</p>
            <div className="flex gap-3">
              <span className="text-3xl leading-none mt-0.5">{mainSeed.emoji}</span>
              <p className="text-sm leading-relaxed font-medium flex-1">{mainSeed.text}</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 h-10 text-sm font-semibold text-white border-0"
                style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
                onClick={() => onStartChat(mainSeed.text)}
              >
                这个有意思，聊聊！
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0"
                onClick={() => setRefreshKey((k) => k + 1)}>
                ↻
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* More seeds */}
      {mounted && picked.length > 1 && (
        <div className="grid grid-cols-2 gap-2">
          {picked.slice(1, 3).map((s, i) => (
            <Card key={i} size="sm" className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onStartChat(s.text)}>
              <CardContent>
                <div className="flex items-start gap-2">
                  <span className="text-lg">{s.emoji}</span>
                  <p className="text-xs leading-relaxed flex-1 line-clamp-3">{s.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
              onClick={() => { if (input.trim()) { onStartChat(input.trim()); setInput(""); } }}>
              ↑
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
