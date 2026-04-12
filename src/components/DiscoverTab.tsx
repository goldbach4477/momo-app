"use client";

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
    <div className="px-4 pt-5 pb-6" style={{ background: "linear-gradient(180deg, #EEF0FF, #FFFAF8 25%)" }}>
      {/* Search */}
      <div className="card px-4 py-3 flex items-center gap-3 mb-6 anim-in">
        <span className="text-gray-400 text-sm">🔍</span>
        <span className="text-sm text-gray-400 flex-1">想看什么？问Momo...</span>
        <MomoOrbSmall />
      </div>

      {/* Momo pick */}
      <Section title="⭐ Momo 为你选的" delay="anim-in-1">
        <div className="card overflow-hidden">
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
          <div className="p-3.5">
            <div className="flex items-start gap-2.5 bg-orange-50/50 rounded-xl p-3">
              <MomoOrbSmall />
              <p className="text-xs text-gray-500 leading-relaxed flex-1">你上次写了&quot;冰封千年&quot;的设定，这本的时间观处理得很不一样，推荐看看 ✨</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Tags */}
      <Section title="🔥 热门标签" delay="anim-in-2">
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t, i) => (
            <span key={t} className={`px-3 py-1.5 rounded-full text-[13px] cursor-pointer transition-all ${i === 0 ? "btn-primary px-3.5 py-1.5 text-xs shadow-none" : "bg-white text-gray-500 border border-gray-100 hover:border-orange-200 hover:text-orange-500"}`}>
              {i === 0 ? "🔥 " : ""}{t}
            </span>
          ))}
        </div>
      </Section>

      {/* New stars */}
      <Section title="🌟 本周新星" delay="anim-in-3">
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {STORIES.slice(2).map((s) => (
            <div key={s.title} className="min-w-[130px] card overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
              <div className={`h-20 bg-gradient-to-br ${s.bg} flex items-center justify-center`}>
                <span className="text-2xl">📖</span>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-gray-800 truncate">{s.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.author} · {s.level}</p>
                <p className="text-[10px] text-orange-400 mt-1">❤️ {s.reads}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Trending */}
      <Section title="📢 大家在催更" delay="anim-in-3">
        <div className="space-y-2.5">
          {STORIES.slice(0, 2).map((s) => (
            <div key={s.title} className="card p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center shrink-0`}>
                <span className="text-lg">📖</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{s.title}</p>
                <p className="text-[11px] text-gray-400">{s.author} · {s.level}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-orange-500 font-medium">🔥 {s.reads}</p>
                <p className="text-[10px] text-gray-400">💬 {s.comments}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Completed */}
      <Section title="✅ 完结好评" delay="anim-in-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            { t: "笔记本的秘密", i: "5章短篇 · 已完结", l: "2,312" },
            { t: "最后一班地铁", i: "8章短篇 · 已完结", l: "891" },
          ].map((s) => (
            <div key={s.t} className="card p-3 cursor-pointer hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-gray-800">{s.t}</p>
              <p className="text-[10px] text-gray-400 mt-1">{s.i}</p>
              <p className="text-[10px] text-orange-400 mt-1.5 font-medium">❤️ {s.l}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, delay, children }: { title: string; delay: string; children: React.ReactNode }) {
  return (
    <div className={`mb-6 ${delay}`}>
      <p className="text-[11px] font-semibold text-gray-400 mb-3 tracking-wide">{title}</p>
      {children}
    </div>
  );
}
