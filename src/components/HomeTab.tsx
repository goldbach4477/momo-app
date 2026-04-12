"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MomoOrb from "./MomoOrb";

const FALLBACK_SEEDS = [
  { emoji: "📓", text: "你捡到一本笔记本，写上去的东西都会成真——但每次实现都有意想不到的代价" },
  { emoji: "🔮", text: "你能看到每个人头上的倒计时数字，今天你看到了最好朋友的——只剩7天" },
  { emoji: "🌊", text: "海底浮起一座古城，城门上刻着你的名字" },
];

type Seed = { emoji: string; text: string };

export default function HomeTab({ onStartChat }: { onStartChat: (seed: string) => void }) {
  const [seeds, setSeeds] = useState<Seed[]>(FALLBACK_SEEDS);
  const [seedIdx, setSeedIdx] = useState(0);
  const [input, setInput] = useState("");
  const [loadingSeeds, setLoadingSeeds] = useState(true);

  // Fetch AI-generated seeds on mount
  useEffect(() => {
    fetch("/api/inspire")
      .then((r) => r.json())
      .then((data) => {
        if (data.seeds && Array.isArray(data.seeds) && data.seeds.length > 0) {
          setSeeds(data.seeds);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSeeds(false));
  }, []);

  const seed = seeds[seedIdx % seeds.length];

  const nextSeed = () => {
    if (seedIdx + 1 >= seeds.length) {
      // Fetch more seeds
      setLoadingSeeds(true);
      fetch("/api/inspire")
        .then((r) => r.json())
        .then((data) => {
          if (data.seeds && Array.isArray(data.seeds)) {
            setSeeds(data.seeds);
            setSeedIdx(0);
          } else {
            setSeedIdx((i) => (i + 1) % seeds.length);
          }
        })
        .catch(() => setSeedIdx((i) => (i + 1) % seeds.length))
        .finally(() => setLoadingSeeds(false));
    } else {
      setSeedIdx((i) => i + 1);
    }
  };

  return (
    <div className="px-4 pt-10 pb-6 space-y-5">
      {/* Momo greeting */}
      <div className="flex flex-col items-center">
        <MomoOrb size={88} />
        <h1 className="text-xl font-bold mt-2 gradient-text">Momo</h1>
        <p className="text-xs text-muted-foreground mt-0.5">你的专属故事编辑</p>
      </div>

      {/* Story seed */}
      <Card>
        <CardContent className="space-y-4">
          <p className="text-[11px] font-medium text-muted-foreground tracking-wider uppercase">✦ 今日灵感 · AI生成</p>
          {loadingSeeds && seeds === FALLBACK_SEEDS ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <span className="w-2 h-2 rounded-full bg-[#FF6B6B] dot-anim-1" />
              <span className="w-2 h-2 rounded-full bg-[#FF9A5C] dot-anim-2" />
              <span className="w-2 h-2 rounded-full bg-[#FFD06B] dot-anim-3" />
              <span className="text-xs text-muted-foreground ml-2">Momo正在想灵感...</span>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <span className="text-3xl leading-none mt-0.5">{seed.emoji}</span>
                <p className="text-sm leading-relaxed font-medium flex-1">{seed.text}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-10 text-sm font-semibold text-white border-0"
                  style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
                  onClick={() => onStartChat(seed.text)}
                >
                  这个有意思，聊聊！
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={nextSeed}
                  disabled={loadingSeeds}
                >
                  {loadingSeeds ? "…" : "↻"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Custom input */}
      <Card>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="🎤 说说你自己的想法..."
              className="h-10"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { onStartChat(input.trim()); setInput(""); } }}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 text-white border-0"
              style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
              disabled={!input.trim()}
              onClick={() => { if (input.trim()) { onStartChat(input.trim()); setInput(""); } }}
            >
              ↑
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fragments - these could also be AI generated in future */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground tracking-wider mb-3 px-1">💡 灵感碎片</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { t: "时间手表", d: "停止时间但失去记忆", s: "一个能停止时间的手表，但每次使用都会失去一段记忆" },
            { t: "樱花树的秘密", d: "听到植物说话的少女", s: "一个能听到植物说话的少女，发现校园里的老樱花树在求救" },
            { t: "神秘来信", d: "每天准时出现的信", s: "一封没有寄件人的信，每天准时出现在课桌上" },
          ].map((f) => (
            <Card key={f.t} size="sm" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onStartChat(f.s)}>
              <CardContent>
                <p className="text-xs font-semibold leading-snug">{f.t}</p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{f.d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
