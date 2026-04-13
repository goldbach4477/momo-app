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
  const scrollRef = useRef<HTMLDivElement>(null);
  const init = useRef(false);

  useEffect(() => {
    if (!init.current) {
      init.current = true;
      if (initialStoryId) {
        getStory(initialStoryId).then((story) => {
          if (story) {
            setStoryTitle(story.title);
            setChapterCount(story.chapters.length);
            send(`我要继续创作《${story.title}》，已经写了${story.chapters.length}章。请帮我构思下一章的内容。`);
          }
        });
      } else if (initialSeed) {
        send(`我想写一个故事，灵感是：${initialSeed}`);
      }
    }
  }, [initialSeed, initialStoryId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  async function send(text: string) {
    setMsgs((p) => [...p, { role: "user", text }]);
    setLoading(true);

    const storyContext = storyId && storyTitle
      ? `\n\n当前正在创作的小说：《${storyTitle}》，已完成${chapterCount}章。继续引导下一章创作。`
      : `\n\n用户还没有创建作品。请先跟用户聊清楚故事的世界观、主要人物、大致剧情方向，然后再建议创建作品和开始写章节。不要急着生成章节。`;

    const h = [...hist, { role: "user", content: text }];
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: h, storyContext }) });
      const data = await res.json();
      const raw = data.content || "Momo走神了…再说一遍？";
      setHist([...h, { role: "assistant", content: raw }]);

      // Handle story creation
      const createMatch = raw.match(/\[CREATE_STORY\]\s*书名[：:]\s*(.+?)\s*\n\s*简介[：:]\s*([\s\S]+?)\s*\[\/CREATE_STORY\]/);
      if (createMatch && !storyId) {
        const newStory = await createStory(createMatch[1].trim(), userId, createMatch[2].trim());
        setStoryId(newStory.id);
        setStoryTitle(newStory.title);
      }

      // Handle story metadata updates
      const worldMatch = raw.match(/\[WORLD\]([\s\S]+?)\[\/WORLD\]/);
      const plotMatch = raw.match(/\[PLOT\]([\s\S]+?)\[\/PLOT\]/);
      const charMatch = raw.match(/\[CHARACTER\]\s*姓名[：:]\s*(.+?)\s*\n\s*身份[：:]\s*(.+?)\s*\n\s*描述[：:]\s*([\s\S]+?)\s*\[\/CHARACTER\]/g);

      if (storyId && (worldMatch || plotMatch || charMatch)) {
        const updates: Record<string, unknown> = {};
        if (worldMatch) updates.world_building = worldMatch[1].trim();
        if (plotMatch) updates.plot_summary = plotMatch[1].trim();
        if (charMatch) {
          const chars = charMatch.map((cm: string) => {
            const cmMatch = cm.match(/姓名[：:]\s*(.+?)\s*\n\s*身份[：:]\s*(.+?)\s*\n\s*描述[：:]\s*([\s\S]+?)\s*\[\/CHARACTER\]/);
            return cmMatch ? { name: cmMatch[1], role: cmMatch[2], description: cmMatch[3].trim() } : null;
          }).filter(Boolean);
          if (chars.length) updates.characters = chars;
        }
        await updateStoryMeta(storyId, updates);
      }

      setMsgs((p) => [...p, ...parse(raw)]);
    } catch {
      setMsgs((p) => [...p, { role: "momo", text: "网络出了点问题，再试试？" }]);
    } finally { setLoading(false); }
  }

  async function handleConfirmChapter() {
    if (!confirmDialog) return;
    if (!storyId) {
      const newStory = await createStory(confirmDialog.title, userId);
      setStoryId(newStory.id);
      setStoryTitle(newStory.title);
      await addChapter(newStory.id, confirmDialog.title, confirmDialog.body);
      setChapterCount(1);
    } else {
      await addChapter(storyId, confirmDialog.title, confirmDialog.body);
      setChapterCount((n) => n + 1);
    }
    const t = confirmDialog.title, b = confirmDialog.body;
    setConfirmDialog(null);
    onReadChapter(t, b);
  }

  function parse(raw: string): Msg[] {
    const out: Msg[] = [];
    let cleaned = raw.replace(/\[CREATE_STORY\][\s\S]*?\[\/CREATE_STORY\]/g, "")
      .replace(/\[WORLD\][\s\S]*?\[\/WORLD\]/g, "")
      .replace(/\[PLOT\][\s\S]*?\[\/PLOT\]/g, "")
      .replace(/\[CHARACTER\][\s\S]*?\[\/CHARACTER\]/g, "")
      .trim();

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
      {/* Confirmation dialog */}
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
                <Button className="flex-1 text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }} onClick={handleConfirmChapter}>
                  ✅ 确认发布
                </Button>
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
                <div className="max-w-[75%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed text-white" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}>
                  {m.text}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <MomoOrbSmall />
                <div className="flex-1 space-y-2 min-w-0">
                  {m.preview && (
                    <Card className="max-w-[88%]" style={{ borderColor: "#FFD4A8", borderWidth: 1.5 }}>
                      <div className="px-3.5 py-2 bg-muted text-[11px] font-semibold text-[#FF6B6B] flex items-center gap-1.5 rounded-t-xl">
                        📖 章节预览 · {m.preview.title}
                      </div>
                      <CardContent className="text-sm leading-[1.85] whitespace-pre-wrap max-h-48 overflow-y-auto">{m.preview.body}</CardContent>
                      <div className="px-4 pb-3 flex gap-2">
                        <Button size="sm" className="flex-1 text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
                          onClick={() => setConfirmDialog({ title: m.preview!.title, body: m.preview!.body })}>
                          ✅ 发布这一章
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => send("换个感觉")}>
                          🔄 换一个
                        </Button>
                      </div>
                    </Card>
                  )}
                  {m.text && (
                    <div className="max-w-[88%] bg-card rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed ring-1 ring-border whitespace-pre-wrap">{m.text}</div>
                  )}
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

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 bg-background/90 backdrop-blur-lg border-t shrink-0">
        <Input className="chat-input h-10 flex-1" placeholder="🎤 说说你的想法..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} disabled={loading} />
        <Button size="icon" className="h-10 w-10 shrink-0 text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }} onClick={handleSend} disabled={!input.trim() || loading}>↑</Button>
      </div>
    </div>
  );
}
