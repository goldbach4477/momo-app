"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import MomoOrb, { MomoOrbSmall } from "./MomoOrb";
import { createStory, addChapter, getStory, mergeCodex, mergeOutline, updateStoryMeta, type CodexEntry, type OutlineChapter } from "@/lib/store";
import { saveSession, getSession, type ChatSession } from "@/lib/chatCache";
import DraftMode from "./DraftMode";

type Msg = { role: "momo" | "user"; text: string; choices?: string[]; paragraph?: string };

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
  const [viewMode, setViewMode] = useState<"chat" | "draft">("chat");
  const [draftParagraphs, setDraftParagraphs] = useState<string[]>([]);
  const [codex, setCodex] = useState<CodexEntry[]>([]);
  const [outline, setOutline] = useState<{ overall: string; chapters: OutlineChapter[] }>({ overall: "", chapters: [] });
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; body: string } | null>(null);
  const [isWritingChapter, setIsWritingChapter] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const init = useRef(false);
  const msgCount = useRef(0);

  const sessionId = initialStoryId || `new-${initialSeed?.slice(0, 20) || "empty"}`;

  // Save session on every meaningful state change
  useEffect(() => {
    if (msgs.length > 0) {
      saveSession({
        id: sessionId,
        storyId,
        storyTitle,
        seed: initialSeed,
        messages: msgs,
        apiHistory: hist,
        draftParagraphs,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [msgs, storyId, storyTitle, draftParagraphs, hist, sessionId, initialSeed]);

  useEffect(() => {
    if (!init.current) {
      init.current = true;

      // Try to restore cached session
      const cached = getSession(sessionId);
      if (cached && cached.messages.length > 0) {
        setMsgs(cached.messages as Msg[]);
        setHist(cached.apiHistory);
        setDraftParagraphs(cached.draftParagraphs);
        if (cached.storyId) { setStoryId(cached.storyId); setStoryTitle(cached.storyTitle); }
        msgCount.current = cached.messages.filter((m) => m.role === "user").length;
        // Refresh story metadata from DB
        if (cached.storyId) {
          getStory(cached.storyId).then((story) => {
            if (story) { setChapterCount(story.chapters.length); setCodex(story.meta.codex); setOutline(story.meta.outline); }
          }).catch(() => {});
        }
        return; // Don't re-send initial message
      }

      if (initialStoryId) {
        getStory(initialStoryId).then((story) => {
          if (story) {
            setStoryTitle(story.title); setChapterCount(story.chapters.length);
            setCodex(story.meta.codex); setOutline(story.meta.outline);
            send(`继续创作《${story.title}》，已写${story.chapters.length}章。`, "pro");
          }
        });
      } else if (initialSeed) {
        setMsgs([{
          role: "momo", text: `嗯，这个灵感有点意思。你想先从哪里开始？`,
          choices: ["A. 直接写第一章，先找感觉", "B. 先聊设定——世界观、人物、大纲"],
        }]);
      }
    }
  }, [initialSeed, initialStoryId]);

  useEffect(() => {
    if (viewMode === "chat") scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading, viewMode]);

  async function send(text: string, mode?: string) {
    setMsgs((p) => [...p, { role: "user", text }]);
    setLoading(true);
    msgCount.current++;
    const autoMode = mode || (msgCount.current <= 1 ? "flash" : "pro");
    const writingInfo = isWritingChapter ? `正在写第${chapterCount + 1}章，已写${draftParagraphs.length}段。` : "";
    const storyCtx = storyId && storyTitle
      ? `\n\n当前创作：《${storyTitle}》，已完成${chapterCount}章。${writingInfo}\n已有设定：${codex.length}条，大纲：${outline.chapters.length}章`
      : `\n\n故事灵感：${initialSeed}\n用户还没创建作品。`;

    const h = [...hist, { role: "user", content: text }];
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: h, storyContext: storyCtx, mode: autoMode }) });
      const data = await res.json();
      const raw = data.content || "Momo走神了…再说一遍？";
      setHist([...h, { role: "assistant", content: raw }]);

      const createMatch = raw.match(/\[CREATE_STORY\]\s*书名[：:]\s*(.+?)\s*\n\s*简介[：:]\s*([\s\S]+?)\s*\[\/CREATE_STORY\]/);
      if (createMatch && !storyId) {
        const s = await createStory(createMatch[1].trim(), userId, createMatch[2].trim());
        setStoryId(s.id); setStoryTitle(s.title);
      }

      const parsed = parse(raw);
      for (const m of parsed) {
        if (m.paragraph) { setDraftParagraphs((p) => [...p, m.paragraph!]); setIsWritingChapter(true); }
      }
      setMsgs((p) => [...p, ...parsed]);
    } catch {
      setMsgs((p) => [...p, { role: "momo", text: "网络出了点问题，再试试？" }]);
    } finally { setLoading(false); }
  }

  // Generation: "extract" = only what was discussed, "full-generate" = fill in everything
  async function handleGenerate(genMode: "extract" | "full-generate") {
    setExtracting(true);
    const label = genMode === "extract" ? "整理对话内容" : "全量生成设定和大纲";
    setMsgs((p) => [...p, { role: "momo", text: `正在${label}，请稍等...这可能需要一点时间 ⏳` }]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: hist, storyContext: `故事灵感：${initialSeed}`, mode: genMode }) });
      const data = await res.json();
      let content = data.content || "";
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const ex = JSON.parse(match[0]);
        const parts: string[] = [];

        // Merge codex entries
        if (ex.codex?.length) {
          if (storyId) await mergeCodex(storyId, ex.codex);
          setCodex((prev) => {
            const merged = [...prev];
            for (const entry of ex.codex) {
              const idx = merged.findIndex((e) => e.type === entry.type && e.name === entry.name);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...entry };
              else merged.push(entry);
            }
            return merged;
          });
          const chars = ex.codex.filter((e: CodexEntry) => e.type === "character").length;
          const locs = ex.codex.filter((e: CodexEntry) => e.type === "location").length;
          if (chars) parts.push(`${chars}个角色`);
          if (locs) parts.push(`${locs}个地点`);
          const others = ex.codex.length - chars - locs;
          if (others > 0) parts.push(`${others}条其他设定`);
        }

        // Merge outline
        if (ex.outline?.overall || ex.outline?.chapters?.length) {
          if (storyId) await mergeOutline(storyId, ex.outline.overall, ex.outline.chapters);
          setOutline((prev) => ({
            overall: ex.outline.overall || prev.overall,
            chapters: ex.outline.chapters?.length ? ex.outline.chapters : prev.chapters,
          }));
          if (ex.outline.overall) parts.push("剧情大纲");
          if (ex.outline.chapters?.length) parts.push(`${ex.outline.chapters.length}章概要`);
        }

        // Handle chapter content
        if (ex.chapter?.content && storyId) {
          await addChapter(storyId, ex.chapter.title || `第${chapterCount + 1}章`, ex.chapter.content);
          setChapterCount((n) => n + 1);
          parts.push(`章节"${ex.chapter.title}"`);
        }

        setMsgs((p) => [...p, { role: "momo", text: parts.length ? `✅ 搞定！已更新：${parts.join("、")}。切到草稿页看看？` : "暂时没找到新的设定信息，继续聊吧。" }]);
      }
    } catch {
      setMsgs((p) => [...p, { role: "momo", text: "整理失败了，稍后再试。" }]);
    } finally { setExtracting(false); }
  }

  function parse(raw: string): Msg[] {
    const out: Msg[] = [];
    let cleaned = raw.replace(/\[CREATE_STORY\][\s\S]*?\[\/CREATE_STORY\]/g, "").trim();
    const paraMatch = cleaned.match(/\[PARAGRAPH\]\s*([\s\S]+?)\s*\[\/PARAGRAPH\]/);
    if (paraMatch) {
      const before = cleaned.slice(0, cleaned.indexOf("[PARAGRAPH]")).trim();
      const after = cleaned.slice(cleaned.indexOf("[/PARAGRAPH]") + 12).trim();
      if (before) out.push({ role: "momo", text: before });
      out.push({ role: "momo", text: "", paragraph: paraMatch[1].trim() });
      if (after) out.push({ role: "momo", text: after });
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

  async function handleFinishChapter() {
    if (draftParagraphs.length === 0) return;
    setConfirmDialog({ title: `第${chapterCount + 1}章`, body: draftParagraphs.join("\n\n") });
  }

  async function confirmSaveChapter() {
    if (!confirmDialog) return;
    if (!storyId) { const s = await createStory(confirmDialog.title, userId); setStoryId(s.id); setStoryTitle(s.title); await addChapter(s.id, confirmDialog.title, confirmDialog.body); }
    else await addChapter(storyId, confirmDialog.title, confirmDialog.body);
    setChapterCount((n) => n + 1); setDraftParagraphs([]); setIsWritingChapter(false); setConfirmDialog(null);
    setMsgs((p) => [...p, { role: "momo", text: `第${chapterCount + 1}章保存好了。继续？` }]);
  }

  async function handleDraftSaveSettings(newCodex: CodexEntry[], newOutline: { overall: string; chapters: OutlineChapter[] }) {
    setCodex(newCodex); setOutline(newOutline);
    if (storyId) await updateStoryMeta(storyId, { codex: newCodex, outline: newOutline });
    setViewMode("chat");
    setMsgs((p) => [...p, { role: "momo", text: "设定更新了，不错。" }]);
  }

  function handleDraftSaveChapter(text: string) {
    setDraftParagraphs(text.split("\n\n").filter(Boolean));
    setViewMode("chat");
  }

  function handleSend() { if (!input.trim() || loading) return; send(input.trim()); setInput(""); }
  const CHOICE_BG = ["#8B5CF6", "#06B6D4", "#10B981"];

  // Draft mode
  if (viewMode === "draft") {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center gap-3 px-4 h-14 bg-background/90 backdrop-blur-lg border-b shrink-0 z-10">
          <Button variant="outline" size="icon-sm" onClick={onBack}>←</Button>
          <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{storyTitle || "草稿"}</p></div>
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
            <button onClick={() => !extracting && setViewMode("chat")} className={`px-3 py-1 text-xs rounded-md ${extracting ? "opacity-40" : "text-muted-foreground"}`}>聊天</button>
            <button className="px-3 py-1 text-xs rounded-md bg-background shadow-sm font-medium">草稿</button>
          </div>
        </header>
        {extracting && (
          <div className="px-4 py-2 bg-[#FFF5F0] border-b flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#FF6B6B] dot-anim-1" />
            <span className="text-xs text-[#FF6B6B]">正在生成设定...</span>
          </div>
        )}
        <DraftMode codex={codex} outline={outline} currentChapter={draftParagraphs.join("\n\n")} chapterNumber={chapterCount + 1}
          chapterParagraphs={draftParagraphs} onSaveSettings={handleDraftSaveSettings} onSaveChapter={handleDraftSaveChapter} />
      </div>
    );
  }

  // Chat mode
  return (
    <div className="flex flex-col h-full">
      {confirmDialog && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={() => setConfirmDialog(null)}>
          <Card className="w-full max-w-[340px]" onClick={(e) => e.stopPropagation()}>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-semibold text-center">确认保存 {confirmDialog.title}？</p>
              <div className="bg-muted rounded-lg p-3 text-xs leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">{confirmDialog.body}</div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmDialog(null)}>取消</Button>
                <Button className="flex-1 text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }} onClick={confirmSaveChapter}>✅ 确认保存</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <header className="flex items-center gap-3 px-4 h-14 bg-background/90 backdrop-blur-lg border-b shrink-0 z-10">
        <Button variant="outline" size="icon-sm" onClick={onBack}>←</Button>
        <MomoOrbSmall speaking={loading} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">{storyTitle ? `📖 ${storyTitle}` : "Momo"}</p>
          <p className="text-[10px] text-muted-foreground">{loading ? "构思中..." : storyTitle ? `${chapterCount}章 · ${codex.length}条设定` : "新故事"}</p>
        </div>
        <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
          <button className="px-3 py-1 text-xs rounded-md bg-background shadow-sm font-medium">聊天</button>
          <button onClick={() => !extracting && setViewMode("draft")} className={`px-3 py-1 text-xs rounded-md ${extracting ? "opacity-40" : "text-muted-foreground"}`}>草稿</button>
        </div>
      </header>

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
                  {m.paragraph && (
                    <Card className="max-w-[88%]" style={{ borderColor: "#FFD4A8", borderWidth: 1.5 }}>
                      <div className="px-3.5 py-1.5 bg-muted text-[11px] font-semibold text-[#FF6B6B] rounded-t-xl">📖 故事段落</div>
                      <CardContent className="text-sm leading-[1.85] whitespace-pre-wrap">{m.paragraph}</CardContent>
                      <div className="px-3.5 pb-3">
                        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => send("继续写下一段", "pro")}>继续写下一段 →</Button>
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
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-2.5"><MomoOrbSmall speaking />
            <div className="bg-card rounded-2xl rounded-tl-sm px-4 py-3 ring-1 ring-border flex gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF6B6B] dot-anim-1" /><span className="w-2 h-2 rounded-full bg-[#FF9A5C] dot-anim-2" /><span className="w-2 h-2 rounded-full bg-[#FFD06B] dot-anim-3" />
            </div>
          </div>
        )}
        {msgs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center pt-20"><MomoOrb size={100} /><p className="text-sm text-muted-foreground mt-5">Momo 正在准备...</p></div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 bg-background/90 backdrop-blur-lg border-t">
        {/* Extracting indicator */}
        {extracting && (
          <div className="px-4 py-2 bg-[#FFF5F0] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF6B6B] dot-anim-1" />
            <span className="w-2 h-2 rounded-full bg-[#FF9A5C] dot-anim-2" />
            <span className="w-2 h-2 rounded-full bg-[#FFD06B] dot-anim-3" />
            <span className="text-xs text-[#FF6B6B] ml-1">正在生成设定...</span>
          </div>
        )}
        {/* Action buttons row */}
        <div className="flex gap-2 px-4 pt-2">
          {isWritingChapter && draftParagraphs.length > 0 && (
            <Button variant="outline" size="sm" className="flex-1 text-xs text-[#FF6B6B] border-[#FF6B6B]/30" onClick={handleFinishChapter} disabled={extracting}>
              ✓ 本章完成（{draftParagraphs.length}段）
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleGenerate("extract")} disabled={extracting || loading || hist.length === 0}>
            📝 按对话生成
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => handleGenerate("full-generate")} disabled={extracting || loading || hist.length === 0}>
            🚀 全量生成
          </Button>
        </div>
        {/* Input row */}
        <div className="flex items-center gap-2 px-4 py-3">
          <Input className="chat-input h-10 flex-1" placeholder="🎤 说说你的想法..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} disabled={loading || extracting} />
          <Button size="icon" className="h-10 w-10 shrink-0 text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }} onClick={handleSend} disabled={!input.trim() || loading || extracting}>↑</Button>
        </div>
      </div>
    </div>
  );
}
