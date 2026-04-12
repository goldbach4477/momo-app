"use client";

import { useState } from "react";
import MomoOrb from "./MomoOrb";

const SEEDS = [
  { emoji: "📓", text: "你捡到一本笔记本，写上去的东西都会成真——但每次实现都有意想不到的代价" },
  { emoji: "👑", text: "你穿越到古代，成为了一个即将被废黜的落魄王爷，而你只有三天时间翻盘" },
  { emoji: "🌙", text: "你发现自己其实是封印了记忆的千年仙女，而封印正在一点点解开" },
  { emoji: "🔮", text: "你能看到每个人头上的倒计时数字，今天你看到了最好朋友的——只剩7天" },
  { emoji: "🤖", text: "你收到一封来自未来自己的求救信，但信上的字迹正在慢慢消失" },
  { emoji: "🐉", text: "全世界的龙都消失了，只有你知道它们去了哪里——因为是你不小心放走的" },
  { emoji: "🎭", text: "你每晚做的梦都会在第二天变成现实，而今晚你梦到了世界末日" },
  { emoji: "🌊", text: "海底浮起一座古城，城门上刻着你的名字" },
];

export default function HomeTab({ onStartChat }: { onStartChat: (seed: string) => void }) {
  const [seedIdx, setSeedIdx] = useState(() => Math.floor(Math.random() * SEEDS.length));
  const [input, setInput] = useState("");
  const seed = SEEDS[seedIdx];

  return (
    <div className="px-4 pt-10 pb-6" style={{ background: "linear-gradient(180deg, #FFF3EE 0%, #FFFAF8 50%, #F8F9FF 100%)" }}>
      {/* Momo */}
      <div className="flex flex-col items-center mb-8 anim-in">
        <MomoOrb size={88} />
        <h1 className="text-xl font-bold mt-3 gradient-text">Momo</h1>
        <p className="text-xs text-gray-400 mt-1">你的专属故事编辑</p>
      </div>

      {/* Seed */}
      <div className="card p-5 mb-4 anim-in-1">
        <p className="text-[11px] font-medium text-gray-400 mb-3 tracking-wide">✦ 今日灵感</p>
        <div className="flex gap-3 mb-5">
          <span className="text-3xl leading-none mt-0.5">{seed.emoji}</span>
          <p className="text-[15px] leading-[1.75] text-gray-800 font-medium flex-1">{seed.text}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => onStartChat(seed.text)} className="btn-primary flex-1 py-3 text-sm">
            这个有意思，聊聊！
          </button>
          <button onClick={() => setSeedIdx((i) => (i + 1) % SEEDS.length)} className="btn-secondary w-12 h-12 flex items-center justify-center text-lg">
            ↻
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="card p-4 mb-5 anim-in-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="🎤 说说你自己的想法..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { onStartChat(input.trim()); setInput(""); } }}
            className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus:border-orange-200 focus:bg-white"
          />
          <button
            onClick={() => { if (input.trim()) { onStartChat(input.trim()); setInput(""); } }}
            disabled={!input.trim()}
            className="btn-primary w-10 h-10 flex items-center justify-center text-base disabled:opacity-25"
          >↑</button>
        </div>
      </div>

      {/* Fragments */}
      <div className="anim-in-3">
        <p className="text-[11px] font-medium text-gray-400 mb-3 tracking-wide px-1">💡 灵感碎片</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { t: "时间手表", d: "停止时间但失去记忆", s: "一个能停止时间的手表，但每次使用都会失去一段记忆" },
            { t: "樱花树的秘密", d: "听到植物说话的少女", s: "一个能听到植物说话的少女，发现校园里的老樱花树在求救" },
            { t: "神秘来信", d: "每天准时出现的信", s: "一封没有寄件人的信，每天准时出现在课桌上" },
          ].map((f) => (
            <button key={f.t} onClick={() => onStartChat(f.s)} className="card p-3 text-left cursor-pointer hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-gray-800 leading-snug">{f.t}</p>
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{f.d}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
