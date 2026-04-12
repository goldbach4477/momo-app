"use client";

import { MomoOrbSmall } from "./MomoOrb";

const COMMENTS: Record<number, number> = { 1: 12, 3: 48, 6: 7, 9: 23 };

export default function ReadingScreen({ title, content, onBack }: { title: string; content: string; onBack: () => void }) {
  const paras = content.split("\n").map((p) => p.trim()).filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-100 shrink-0 z-10">
        <button onClick={onBack} className="btn-secondary w-8 h-8 flex items-center justify-center text-sm p-0">←</button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{title || "章节预览"}</p>
          <p className="text-[10px] text-gray-400">by 你</p>
        </div>
        <button className="text-xs text-orange-400 bg-orange-50 rounded-lg px-2.5 py-1.5 border-none cursor-pointer">🔖 收藏</button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Illustration placeholder */}
        <div className="mx-4 mt-4 h-44 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FFE8E0, #FFD8B0 40%, #D0E0FF 70%, #E0D0FF)" }}>
          <div className="text-center">
            <span className="text-4xl block" style={{ animation: "orb-float 3s ease-in-out infinite" }}>🎨</span>
            <p className="text-[11px] text-gray-400 mt-2">AI插画生成中...</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 text-center">{title}</h2>
          <div className="space-y-4">
            {paras.map((p, i) => (
              <div key={i} className="relative group">
                <p className="text-[15px] leading-[2] text-gray-800 pr-12">{p}</p>
                {COMMENTS[i] && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 bg-red-50 text-orange-400 text-[11px] rounded-full px-2 py-0.5 cursor-pointer">
                    💬 {COMMENTS[i]}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 flex justify-center gap-8 text-sm text-gray-500">
            <span>❤️ 128</span><span>💬 89</span><span>🔗 分享</span>
          </div>

          <div className="card mt-6 p-4">
            <div className="flex items-start gap-3">
              <MomoOrbSmall />
              <div className="flex-1">
                <p className="text-sm text-gray-800 leading-relaxed mb-3">这一章写得很有感觉！接下来你想怎么发展？</p>
                <div className="flex gap-2">
                  <button onClick={onBack} className="btn-primary flex-1 py-2 text-xs">跟Momo聊聊</button>
                  <button onClick={onBack} className="btn-secondary flex-1 py-2 text-xs">继续创作</button>
                </div>
              </div>
            </div>
          </div>
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
