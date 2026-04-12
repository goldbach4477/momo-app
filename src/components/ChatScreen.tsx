"use client";

import { useState, useRef, useEffect } from "react";
import MomoOrb, { MomoOrbSmall } from "./MomoOrb";

type Msg = { role: "momo" | "user"; text: string; choices?: string[]; preview?: { title: string; body: string } };

export default function ChatScreen({ initialSeed, onBack, onReadChapter }: {
  initialSeed: string; onBack: () => void; onReadChapter: (t: string, c: string) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hist, setHist] = useState<{ role: string; content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const init = useRef(false);

  useEffect(() => { if (!init.current) { init.current = true; send(`我想写一个故事，灵感是：${initialSeed}`); } }, [initialSeed]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, loading]);

  async function send(text: string) {
    setMsgs((p) => [...p, { role: "user", text }]);
    setLoading(true);
    const h = [...hist, { role: "user", content: text }];
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: h }) });
      const data = await res.json();
      const raw = data.content || "Momo走神了…再说一遍？";
      setHist([...h, { role: "assistant", content: raw }]);
      setMsgs((p) => [...p, ...parse(raw)]);
    } catch { setMsgs((p) => [...p, { role: "momo", text: "网络出了点问题，再试试？" }]); }
    finally { setLoading(false); }
  }

  function parse(raw: string): Msg[] {
    const out: Msg[] = [];
    const pm = raw.match(/\[CHAPTER_PREVIEW\]\s*章节标题[：:]\s*(.+?)\s*---\s*([\s\S]+?)\s*\[\/CHAPTER_PREVIEW\]/);
    if (pm) {
      const before = raw.slice(0, raw.indexOf("[CHAPTER_PREVIEW]")).trim();
      const after = raw.slice(raw.indexOf("[/CHAPTER_PREVIEW]") + 18).trim();
      if (before) out.push({ role: "momo", text: before });
      out.push({ role: "momo", text: "", preview: { title: pm[1], body: pm[2].trim() } });
      if (after) out.push(...parse(after));
      return out;
    }
    const cp = [/(?:^|\n)\s*[A-C][.、）)]\s*.+/g, /(?:^|\n)\s*[1-3][.、）)]\s*.+/g];
    let choices: string[] = [], text = raw;
    for (const p of cp) { const m = raw.match(p); if (m && m.length >= 2) { choices = m.map((x) => x.trim()); for (const x of m) text = text.replace(x, ""); break; } }
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    if (text) out.push({ role: "momo", text, choices: choices.length >= 2 ? choices : undefined });
    else if (choices.length >= 2) out.push({ role: "momo", text: "你觉得呢？", choices });
    return out.length ? out : [{ role: "momo", text: raw }];
  }

  function handleSend() { if (!input.trim() || loading) return; send(input.trim()); setInput(""); }

  return (
    <div className="flex flex-col h-full" style={{ background: "linear-gradient(180deg, #FFFAF8 0%, #F8F9FF 100%)" }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-14 bg-white/85 backdrop-blur-md border-b border-gray-100 shrink-0 z-10">
        <button onClick={onBack} className="btn-secondary w-8 h-8 flex items-center justify-center text-sm p-0">←</button>
        <MomoOrbSmall speaking={loading} />
        <div>
          <p className="text-sm font-semibold text-gray-900 leading-tight">Momo</p>
          <p className="text-[10px] text-gray-400">{loading ? "构思中..." : "你的故事编辑"}</p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className="anim-in">
            {m.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[75%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed text-white" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)", boxShadow: "0 1px 4px rgba(255,107,107,0.15)" }}>
                  {m.text}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <MomoOrbSmall />
                <div className="flex-1 space-y-2 min-w-0">
                  {/* Preview */}
                  {m.preview && (
                    <div className="card max-w-[88%] overflow-hidden" style={{ border: "1.5px solid #FFD4A8" }}>
                      <div className="px-3.5 py-2 bg-orange-50/60 text-[11px] font-semibold text-orange-500 flex items-center gap-1.5">
                        📖 章节预览 · {m.preview.title}
                      </div>
                      <div className="px-3.5 py-3 text-sm leading-[1.85] text-gray-800 whitespace-pre-wrap">{m.preview.body}</div>
                      <div className="px-3.5 pb-3 flex gap-2">
                        <button onClick={() => onReadChapter(m.preview!.title, m.preview!.body)} className="btn-primary flex-1 py-2 text-xs">📖 查看全文</button>
                        <button onClick={() => send("换个感觉")} className="btn-secondary flex-1 py-2 text-xs">🔄 换一个</button>
                      </div>
                    </div>
                  )}
                  {/* Text */}
                  {m.text && (
                    <div className="card max-w-[88%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                      {m.text}
                    </div>
                  )}
                  {/* Choices */}
                  {m.choices && (
                    <div className="space-y-2 max-w-[88%]">
                      {m.choices.map((c, j) => (
                        <button key={j} onClick={() => !loading && send(c)} className="w-full card px-3.5 py-2.5 text-left text-sm text-gray-800 cursor-pointer hover:shadow-md transition-shadow flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: ["#8B5CF6","#06B6D4","#10B981"][j] || "#8B5CF6" }}>
                            {String.fromCharCode(65 + j)}
                          </span>
                          <span className="flex-1">{c.replace(/^[A-C1-3][.、）)]\s*/, "")}</span>
                        </button>
                      ))}
                      <button onClick={() => (document.querySelector(".chat-input") as HTMLInputElement)?.focus()} className="w-full rounded-2xl px-3.5 py-2.5 text-left text-sm text-orange-400 cursor-pointer border border-dashed border-orange-200 bg-orange-50/40 hover:bg-orange-50 transition-colors flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}>🎤</span>
                        <span>我有自己的想法</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2.5 anim-fade">
            <MomoOrbSmall speaking />
            <div className="card rounded-2xl rounded-tl-sm px-4 py-3 flex gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-300 dot-anim-1" />
              <span className="w-2 h-2 rounded-full bg-orange-400 dot-anim-2" />
              <span className="w-2 h-2 rounded-full bg-orange-500 dot-anim-3" />
            </div>
          </div>
        )}

        {msgs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center pt-20 anim-fade">
            <MomoOrb size={100} />
            <p className="text-sm text-gray-400 mt-5">Momo 正在准备...</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/85 backdrop-blur-md border-t border-gray-100 shrink-0">
        <input type="text" className="chat-input flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus:border-orange-200 focus:bg-white" placeholder="🎤 说说你的想法..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} disabled={loading} />
        <button onClick={handleSend} disabled={!input.trim() || loading} className="btn-primary w-10 h-10 flex items-center justify-center text-base disabled:opacity-25">↑</button>
      </div>
    </div>
  );
}
