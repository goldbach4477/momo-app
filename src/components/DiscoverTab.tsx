"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MomoOrbSmall } from "./MomoOrb";

const STORIES = [
  { title: "深渊编年史", author: "星河少年", reads: "1.2万", comments: 326, bg: "from-violet-500 to-purple-600", level: "🌳" },
  { title: "末日邮局", author: "小鱼写字", reads: "8,934", comments: 217, bg: "from-pink-500 to-rose-500", level: "🌿" },
  { title: "猫的第九次", author: "月光收集者", reads: "5,621", comments: 143, bg: "from-cyan-500 to-blue-500", level: "🌱" },
  { title: "时间旅人日记", author: "番茄酱", reads: "3,287", comments: 89, bg: "from-emerald-500 to-teal-500", level: "🌱" },
];

const TAGS = ["奇幻", "校园", "末日", "悬疑", "重生", "科幻", "短篇新人", "搞笑", "古风"];

export default function DiscoverTab() {
  return (
    <div className="px-4 pt-5 pb-6 space-y-6">
      {/* Search */}
      <Card size="sm" className="cursor-pointer">
        <CardContent className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">🔍</span>
          <span className="text-sm text-muted-foreground flex-1">想看什么？问Momo...</span>
          <MomoOrbSmall />
        </CardContent>
      </Card>

      {/* Momo pick */}
      <Section title="⭐ Momo 为你选的">
        <Card className="overflow-hidden">
          <div className="h-32 bg-gradient-to-br from-violet-500 to-purple-600 flex items-end p-4 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <div className="relative z-10">
              <h3 className="text-base font-bold text-white">深渊编年史</h3>
              <div className="flex gap-1.5 mt-1">
                {["奇幻", "12章", "⭐ 9.2"].map((t) => (
                  <span key={t} className="text-[10px] bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </div>
          <CardContent>
            <div className="flex items-start gap-2.5 bg-muted rounded-lg p-3">
              <MomoOrbSmall />
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">你上次写了&quot;冰封千年&quot;的设定，这本的时间观处理得很不一样，推荐看看 ✨</p>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Tags */}
      <Section title="🔥 热门标签">
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t, i) => (
            <Badge key={t} variant={i === 0 ? "default" : "outline"} className={`cursor-pointer ${i === 0 ? "text-white border-0" : ""}`} style={i === 0 ? { background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" } : undefined}>
              {i === 0 ? "🔥 " : ""}{t}
            </Badge>
          ))}
        </div>
      </Section>

      <Separator />

      {/* New stars */}
      <Section title="🌟 本周新星">
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {STORIES.slice(2).map((s) => (
            <Card key={s.title} size="sm" className="min-w-[130px] overflow-hidden cursor-pointer hover:shadow-md transition-shadow shrink-0">
              <div className={`h-20 bg-gradient-to-br ${s.bg} flex items-center justify-center`}>
                <span className="text-2xl">📖</span>
              </div>
              <CardContent>
                <p className="text-xs font-semibold truncate">{s.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.author} · {s.level}</p>
                <p className="text-[10px] text-[#FF6B6B] mt-1">❤️ {s.reads}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Trending */}
      <Section title="📢 大家在催更">
        <div className="space-y-2">
          {STORIES.slice(0, 2).map((s) => (
            <Card key={s.title} size="sm" className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                  <span className="text-lg">📖</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">{s.author} · {s.level}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-[#FF6B6B] font-medium">🔥 {s.reads}</p>
                  <p className="text-[10px] text-muted-foreground">💬 {s.comments}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Completed */}
      <Section title="✅ 完结好评">
        <div className="grid grid-cols-2 gap-2">
          {[
            { t: "笔记本的秘密", i: "5章短篇 · 已完结", l: "2,312" },
            { t: "最后一班地铁", i: "8章短篇 · 已完结", l: "891" },
          ].map((s) => (
            <Card key={s.t} size="sm" className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent>
                <p className="text-xs font-semibold">{s.t}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{s.i}</p>
                <p className="text-[10px] text-[#FF6B6B] mt-1.5 font-medium">❤️ {s.l}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground tracking-wider mb-3">{title}</p>
      {children}
    </div>
  );
}
