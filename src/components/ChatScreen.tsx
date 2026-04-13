"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import MomoOrb, { MomoOrbSmall } from "./MomoOrb";
import { createStory, addChapter, getStory, updateStoryMeta } from "@/lib/store";

type Msg = { role: "momo" | "user"; text: string; choices?: string[]; preview?: { title: string; body: string } };

export default function ChatScreen({ initialSeed, storyId: initialStoryId, userId, onBack, onReadChapter }: {
  initialSeed: string; storyId?: string; userId: string; onBack: () => void; onReadChapter: (t: string, c: string) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hist, setHist] = useState<{ role: string; content: string }[]>([]);
  const [storyId, setStoryId] = useState<string | undefined>(initialStoryId);
  const [storyTitle, setStoryTitle] = useState("");
  const [chapterCount, setChapterCount] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; body: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const init = useRef(false);
  const msgCount = useRef(0);

  useEffect(() => {
    if (!init.current) {
      init.current = true;
      if (initialStoryId) {
        getStory(initialStoryId).then((story) => {
          if (story) { setStoryTitle(story.title); setChapterCount(story.chapters.length); send(`我要继续创作《${story.title}》，已写${story.chapters.length}章。帮我构思下一章。`, "pro"); }
        });
      } else if (initialSeed) {
        send(`我想写一个故事，灵感是：${initialSeed}`, "pro");
      }
    }
  }, [initialSeed, initialStoryId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  async function send(text: string, mode?: string) {
    setMsgs((p) => [...p, { role: "user", text }]);
    setLoading(true);
    msgCount.current++;

    // Use flash for first greeting and short responses, pro for creation
    const autoMode = mode || (msgCount.current <= 1 ? "flash" : "pro");

    const storyContext = storyId && storyTitle
      ? `\n\n当前创作：《${storyTitle}》，已完成${chapterCount}章。`
      : `\n\n用户还没创建作品。先聊清楚故事方向、世界观、人物，再建议创建。`;

    const h = [...hist, { role: "user", content: text }];
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: h, storyContext, mode: autoMode }) });
      const data = await res.json();
      const raw = data.content || "Momo走神了…再说一遍？";
      setHist([...h, { role: "assistant", content: raw }]);

      const createMatch = raw.match(/\[CREATE_STORY\]\s*书名[：:]\s*(.+?)\s*\n\s*简介[：:]\s*([\s\S]+?)\s*\[\/CREATE_STORY\]/);
      if (createMatch && !storyId) {
        const s = await createStory(createMatch[1].trim(), userId, createMatch[2].trim());
        setStoryId(s.id); setStoryTitle(s.title);
      }

      setMsgs((p) => [...p, ...parse(raw)]);
    } catch {
      setMsgs((p) => [...p, { role: "momo", text: "网络出了点问题，再试试？" }]);
    } finally { setLoading(false); }
  }

  // Extract settings & chapters from conversation and save to story
  async function extractToStory() {
    if (!storyId && !storyTitle) {
      setMsgs((p) => [...p, { role: "momo", text: "嗯？还没创建作品呢。先跟我聊聊你的故事，我来帮你整理。" }]);
      return;
    }
    setExtracting(true);
    setShowMenu(false);
    setMsgs((p) => [...p, { role: "momo", text: "让我整理一下我们聊的内容..." }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: hist, mode: "extract" }),
      });
      const data = await res.json();
      let content = data.content || "";
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const extracted = JSON.parse(match[0]);
        const sid = storyId!;

        const updates: Record<string, unknown> = {};
        if (extracted.world_building) updates.world_building = extracted.world_building;
        if (extracted.plot_summary) updates.plot_summary = extracted.plot_summary;
        if (extracted.characters?.length) updates.characters = extracted.characters;

        if (Object.keys(updates).length) await updateStoryMeta(sid, updates);

        if (extracted.chapter?.title && extracted.chapter?.content) {
          await addChapter(sid, extracted.chapter.title, extracted.chapter.content);
          setChapterCount((n) => n + 1);
        }

        const parts: string[] = [];
        if (updates.world_building) parts.push("世界观");
        if (updates.characters) parts.push(`${(extracted.characters as unknown[]).length}个角色`);
        if (updates.plot_summary) parts.push("剧情概要");
        if (extracted.chapter?.title) parts.push(`章节"${extracted.chapter.title}"`);

        setMsgs((p) => [...p, { role: "momo", text: parts.length ? `搞定。已更新到作品：${parts.join("、")}。去"我的作品"看看？` : "嗯，暂时没找到可以整理的新内容。我们继续聊吧。" }]);
      } else {
        setMsgs((p) => [...p, { role: "momo", text: "没整理出来...我们继续聊，内容丰富一些再试。" }]);
      }
    } catch {
      setMsgs((p) => [...p, { role: "momo", text: "整理失败了，稍后再试。" }]);
    } finally { setExtracting(false); }
  }

  function parse(raw: string): Msg[] {
    const out: Msg[] = [];
    let cleaned = raw.replace(/\[CREATE_STORY\][\s\S]*?\[\/CREATE_STORY\]/g, "").trim();

    const pm = cleaned.match(/\[CHAPTER_PREVIEW\]\s*章节标题[：:]\s*(.+?)\s*---\s*([\s\S]+?)\s*\[\/CHAPTER_PREVIEW\]/);
    if (pm) {
      const before = cleaned.slice(0, cleaned.indexOf("[CHAPTER_PREVIEW]")).trim();
      const after = cleaned.slice(cleaned.indexOf("[/CHAPTER_PREVIEW]") + 18).trim();
      if (before) out.push({ role: "momo", text: before });
      out.push({ role: "momo", text: "", preview: { title: pm[1], body: pm[2].trim() } });
      if (after) out.push(...parse(after));
      return out;
    }

    const cp = [/(?:^|\n)\s*[A-C][.、）)]\s*.+/g, /(?:^|\n)\s*[1-3][.、）)]\s*.+/g];
    let choices: string[] = [], text = cleaned;
    for (const p of cp) { const m = cleaned.match(p); if (m && m.length >= 2) { choices = m.map((x) => x.trim()); for (const x of m) text = text.replace(x, ""); break; } }
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    if (text) out.push({ role: "momo", text, choices: choices.length >= 2 ? choices : undefined });
    else if (choices.length >= 2) out.push({ role: "momo", text: "你觉得呢？", choices });
    return out.length ? out : [{ role: "momo", text: cleaned || raw }];
  }

  function handleSend() { if (!input.trim() || loading) return; send(input.trim()); setInput(""); }
  const CHOICE_BG = ["#8B5CF6", "#06B6D4", "#10B981"];

  return (
    <div className="flex flex-col h-full">
      {/* Confirm dialog */}
      {confirmDialog && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={() => setConfirmDialog(null)}>
          <Card className="w-full max-w-[340px]" onClick={(e) => e.stopPropagation()}>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-semibold text-center">确认发布这一章？</p>
              <div className="bg-muted rounded-lg p-3 text-xs leading-relaxed max-h-32 overflow-y-auto">
                <p className="font-medium mb-1">📖 {confirmDialog.title}</p>
                <p className="text-muted-foreground line-clamp-4">{confirmDialog.body}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmDialog(null)}>取消</Button>
                <Button className="flex-1 text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
                  onClick={async () => {
                    const t = confirmDialog.title, b = confirmDialog.body;
                    if (!storyId) { const s = await createStory(t, userId); setStoryId(s.id); setStoryTitle(s.title); await addChapter(s.id, t, b); }
                    else { await addChapter(storyId, t, b); }
                    setChapterCount((n) => n + 1); setConfirmDialog(null); onReadChapter(t, b);
                  }}>✅ 确认发布</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-14 bg-background/90 backdrop-blur-lg border-b shrink-0 z-10">
        <Button variant="outline" size="icon-sm" onClick={onBack}>←</Button>
        <MomoOrbSmall speaking={loading} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">{storyTitle ? `📖 ${storyTitle}` : "Momo"}</p>
          <p className="text-[10px] text-muted-foreground">{loading ? "构思中..." : storyTitle ? `已写${chapterCount}章` : "新故事"}</p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i}>
            {m.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[75%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed text-white" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}>{m.text}</div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <MomoOrbSmall />
                <div className="flex-1 space-y-2 min-w-0">
                  {m.preview && (
                    <Card className="max-w-[88%]" style={{ borderColor: "#FFD4A8", borderWidth: 1.5 }}>
                      <div className="px-3.5 py-2 bg-muted text-[11px] font-semibold text-[#FF6B6B] flex items-center gap-1.5 rounded-t-xl">📖 章节预览 · {m.preview.title}</div>
                      <CardContent className="text-sm leading-[1.85] whitespace-pre-wrap max-h-48 overflow-y-auto">{m.preview.body}</CardContent>
                      <div className="px-4 pb-3 flex gap-2">
                        <Button size="sm" className="flex-1 text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
                          onClick={() => setConfirmDialog({ title: m.preview!.title, body: m.preview!.body })}>✅ 发布这一章</Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => send("换个感觉", "pro")}>🔄 换一个</Button>
                      </div>
                    </Card>
                  )}
                  {m.text && <div className="max-w-[88%] bg-card rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed ring-1 ring-border whitespace-pre-wrap">{m.text}</div>}
                  {m.choices && (
                    <div className="space-y-1.5 max-w-[88%]">
                      {m.choices.map((c, j) => (
                        <button key={j} onClick={() => !loading && send(c)} className="w-full bg-card rounded-xl px-3.5 py-2.5 text-left text-sm ring-1 ring-border cursor-pointer hover:ring-[#FF6B6B]/40 hover:shadow-sm transition-all flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-md text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: CHOICE_BG[j] || CHOICE_BG[0] }}>{String.fromCharCode(65 + j)}</span>
                          <span className="flex-1">{c.replace(/^[A-C1-3][.、）)]\s*/, "")}</span>
                        </button>
                      ))}
                      <button onClick={() => (document.querySelector(".chat-input") as HTMLInputElement)?.focus()} className="w-full rounded-xl px-3.5 py-2.5 text-left text-sm text-[#FF6B6B] cursor-pointer border border-dashed border-[#FF6B6B]/30 bg-[#FF6B6B]/5 hover:bg-[#FF6B6B]/10 transition-colors flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md text-white text-[10px] flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}>🎤</span>
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
          <div className="flex items-start gap-2.5">
            <MomoOrbSmall speaking />
            <div className="bg-card rounded-2xl rounded-tl-sm px-4 py-3 ring-1 ring-border flex gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF6B6B] dot-anim-1" /><span className="w-2 h-2 rounded-full bg-[#FF9A5C] dot-anim-2" /><span className="w-2 h-2 rounded-full bg-[#FFD06B] dot-anim-3" />
            </div>
          </div>
        )}
        {msgs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center pt-20">
            <MomoOrb size={100} /><p className="text-sm text-muted-foreground mt-5">Momo 正在准备...</p>
          </div>
        )}
      </div>

      {/* Input bar with + menu */}
      <div className="relative shrink-0">
        {/* + Menu popup */}
        {showMenu && (
          <div className="absolute bottom-full left-4 mb-2 bg-card rounded-xl ring-1 ring-border shadow-lg p-1 z-20 min-w-[180px]">
            <button onClick={extractToStory} disabled={extracting} className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5 disabled:opacity-50">
              <span className="text-base">📝</span>
              <span>{extracting ? "整理中..." : "插入作品"}</span>
            </button>
            <button className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5 opacity-50" disabled>
              <span className="text-base">🖼️</span>
              <span>上传参考图片</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-3 bg-background/90 backdrop-blur-lg border-t">
          {/* + button */}
          <Button variant="outline" size="icon-sm" onClick={() => setShowMenu(!showMenu)} className="shrink-0">
            <span className={`text-base transition-transform ${showMenu ? "rotate-45" : ""}`}>+</span>
          </Button>
          <Input className="chat-input h-10 flex-1" placeholder="🎤 说说你的想法..." value={input} onChange={(e) => { setInput(e.target.value); setShowMenu(false); }} onKeyDown={(e) => e.key === "Enter" && handleSend()} disabled={loading || extracting} />
          <Button size="icon" className="h-10 w-10 shrink-0 text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }} onClick={handleSend} disabled={!input.trim() || loading || extracting}>↑</Button>
        </div>
      </div>
    </div>
  );
}
