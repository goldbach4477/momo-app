"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import MomoOrb, { MomoOrbSmall } from "./MomoOrb";
import { createStory, addChapter, getStory, updateStoryMeta } from "@/lib/store";
import DraftMode from "./DraftMode";

type Msg = {
  role: "momo" | "user";
  text: string;
  choices?: string[];
  paragraph?: string; // a generated story paragraph
};

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
  const [showMenu, setShowMenu] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [viewMode, setViewMode] = useState<"chat" | "draft">("chat");
  // Draft content - accumulated paragraphs for current chapter
  const [draftParagraphs, setDraftParagraphs] = useState<string[]>([]);
  const [draftMeta, setDraftMeta] = useState({ world: "", characters: "", plot: "" });
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; body: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const init = useRef(false);
  const msgCount = useRef(0);

  useEffect(() => {
    if (!init.current) {
      init.current = true;
      if (initialStoryId) {
        getStory(initialStoryId).then((story) => {
          if (story) {
            setStoryTitle(story.title);
            setChapterCount(story.chapters.length);
            setDraftMeta({
              world: story.meta.world_building,
              characters: story.meta.characters.map((c) => `**${c.name}** (${c.role}): ${c.description}`).join("\n"),
              plot: story.meta.plot_summary,
            });
            send(`我要继续创作《${story.title}》，已写${story.chapters.length}章。帮我构思下一章。`, "pro");
          }
        });
      } else if (initialSeed) {
        send(`我想写一个故事，灵感是：${initialSeed}`, "pro");
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
    const storyCtx = storyId && storyTitle
      ? `\n\n当前创作：《${storyTitle}》，已完成${chapterCount}章。${draftParagraphs.length > 0 ? `当前章节已写${draftParagraphs.length}段。` : ""}`
      : `\n\n用户还没创建作品。先聊清楚故事方向、世界观、人物。`;

    const h = [...hist, { role: "user", content: text }];
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: h, storyContext: storyCtx, mode: autoMode }) });
      const data = await res.json();
      const raw = data.content || "Momo走神了…再说一遍？";
      setHist([...h, { role: "assistant", content: raw }]);

      // Handle story creation
      const createMatch = raw.match(/\[CREATE_STORY\]\s*书名[：:]\s*(.+?)\s*\n\s*简介[：:]\s*([\s\S]+?)\s*\[\/CREATE_STORY\]/);
      if (createMatch && !storyId) {
        const s = await createStory(createMatch[1].trim(), userId, createMatch[2].trim());
        setStoryId(s.id);
        setStoryTitle(s.title);
      }

      // Parse response
      const parsed = parse(raw);

      // If there's a paragraph, add to draft
      for (const m of parsed) {
        if (m.paragraph) {
          setDraftParagraphs((p) => [...p, m.paragraph!]);
        }
      }

      setMsgs((p) => [...p, ...parsed]);
    } catch {
      setMsgs((p) => [...p, { role: "momo", text: "网络出了点问题，再试试？" }]);
    } finally { setLoading(false); }
  }

  function parse(raw: string): Msg[] {
    const out: Msg[] = [];
    let cleaned = raw.replace(/\[CREATE_STORY\][\s\S]*?\[\/CREATE_STORY\]/g, "").trim();

    // Check for paragraph blocks
    const paraMatch = cleaned.match(/\[PARAGRAPH\]\s*([\s\S]+?)\s*\[\/PARAGRAPH\]/);
    if (paraMatch) {
      const before = cleaned.slice(0, cleaned.indexOf("[PARAGRAPH]")).trim();
      const after = cleaned.slice(cleaned.indexOf("[/PARAGRAPH]") + 12).trim();
      if (before) out.push({ role: "momo", text: before });
      out.push({ role: "momo", text: "", paragraph: paraMatch[1].trim() });
      if (after) out.push({ role: "momo", text: after });
      return out;
    }

    // Check for choice patterns
    const cp = [/(?:^|\n)\s*[A-C][.、）)]\s*.+/g, /(?:^|\n)\s*[1-3][.、）)]\s*.+/g];
    let choices: string[] = [], text = cleaned;
    for (const p of cp) {
      const m = cleaned.match(p);
      if (m && m.length >= 2) { choices = m.map((x) => x.trim()); for (const x of m) text = text.replace(x, ""); break; }
    }
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    if (text) out.push({ role: "momo", text, choices: choices.length >= 2 ? choices : undefined });
    else if (choices.length >= 2) out.push({ role: "momo", text: "你觉得呢？", choices });
    return out.length ? out : [{ role: "momo", text: cleaned || raw }];
  }

  async function handleFinishChapter() {
    if (draftParagraphs.length === 0) {
      setMsgs((p) => [...p, { role: "momo", text: "还没写任何段落呢，先继续聊吧。" }]);
      return;
    }
    const body = draftParagraphs.join("\n\n");
    const title = `第${chapterCount + 1}章`;
    setConfirmDialog({ title, body });
  }

  async function confirmSaveChapter() {
    if (!confirmDialog) return;
    const { title, body } = confirmDialog;
    if (!storyId) {
      const s = await createStory(title, userId);
      setStoryId(s.id);
      setStoryTitle(s.title);
      await addChapter(s.id, title, body);
    } else {
      await addChapter(storyId, title, body);
    }
    setChapterCount((n) => n + 1);
    setDraftParagraphs([]);
    setConfirmDialog(null);
    setMsgs((p) => [...p, { role: "momo", text: `第${chapterCount + 1}章保存好了。要继续写下一章吗？` }]);
  }

  async function extractToStory() {
    if (!storyId) { setMsgs((p) => [...p, { role: "momo", text: "还没创建作品呢。先跟我聊聊。" }]); return; }
    setExtracting(true); setShowMenu(false);
    setMsgs((p) => [...p, { role: "momo", text: "让我整理一下..." }]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: hist, mode: "extract" }) });
      const data = await res.json();
      let content = data.content || "";
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const ex = JSON.parse(match[0]);
        const updates: Record<string, unknown> = {};
        if (ex.world_building) { updates.world_building = ex.world_building; setDraftMeta((d) => ({ ...d, world: ex.world_building })); }
        if (ex.plot_summary) { updates.plot_summary = ex.plot_summary; setDraftMeta((d) => ({ ...d, plot: ex.plot_summary })); }
        if (ex.characters?.length) {
          updates.characters = ex.characters;
          setDraftMeta((d) => ({ ...d, characters: ex.characters.map((c: {name:string;role:string;description:string}) => `**${c.name}** (${c.role}): ${c.description}`).join("\n") }));
        }
        if (Object.keys(updates).length) await updateStoryMeta(storyId, updates);
        if (ex.chapter?.content) { await addChapter(storyId, ex.chapter.title || `第${chapterCount+1}章`, ex.chapter.content); setChapterCount((n) => n + 1); }
        const parts: string[] = [];
        if (updates.world_building) parts.push("世界观");
        if (updates.characters) parts.push(`${(ex.characters as unknown[]).length}个角色`);
        if (ex.chapter?.title) parts.push(`章节"${ex.chapter.title}"`);
        setMsgs((p) => [...p, { role: "momo", text: parts.length ? `搞定。已更新：${parts.join("、")}。` : "暂时没找到新内容。" }]);
      }
    } catch { setMsgs((p) => [...p, { role: "momo", text: "整理失败了，稍后再试。" }]); }
    finally { setExtracting(false); }
  }

  function handleSend() { if (!input.trim() || loading) return; send(input.trim()); setInput(""); setShowMenu(false); }

  // Handle draft save
  async function handleDraftSave(world: string, characters: string, plot: string, chapterText: string) {
    setDraftMeta({ world, characters, plot });
    if (storyId) {
      const charList = characters.split("\n").filter(Boolean).map((line) => {
        const m = line.match(/\*\*(.+?)\*\*\s*\((.+?)\)[：:]\s*(.*)/);
        return m ? { name: m[1], role: m[2], description: m[3] } : { name: line, role: "", description: "" };
      });
      await updateStoryMeta(storyId, { world_building: world, plot_summary: plot, characters: charList });
    }
    if (chapterText) setDraftParagraphs(chapterText.split("\n\n").filter(Boolean));
    setViewMode("chat");
    setMsgs((p) => [...p, { role: "momo", text: "看到你改了草稿。不错，继续？" }]);
  }

  const CHOICE_BG = ["#8B5CF6", "#06B6D4", "#10B981"];

  // Draft mode
  if (viewMode === "draft") {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center gap-3 px-4 h-14 bg-background/90 backdrop-blur-lg border-b shrink-0 z-10">
          <Button variant="outline" size="icon-sm" onClick={onBack}>←</Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{storyTitle ? `📖 ${storyTitle}` : "草稿"}</p>
          </div>
          <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
            <button onClick={() => setViewMode("chat")} className="px-3 py-1 text-xs rounded-md text-muted-foreground">聊天</button>
            <button className="px-3 py-1 text-xs rounded-md bg-background shadow-sm font-medium">草稿</button>
          </div>
        </header>
        <DraftMode
          world={draftMeta.world}
          characters={draftMeta.characters}
          plot={draftMeta.plot}
          currentChapter={draftParagraphs.join("\n\n")}
          chapterNumber={chapterCount + 1}
          onSave={handleDraftSave}
        />
      </div>
    );
  }

  // Chat mode
  return (
    <div className="flex flex-col h-full">
      {/* Confirm dialog */}
      {confirmDialog && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={() => setConfirmDialog(null)}>
          <Card className="w-full max-w-[340px]" onClick={(e) => e.stopPropagation()}>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-semibold text-center">确认保存这一章？</p>
              <div className="bg-muted rounded-lg p-3 text-xs leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                {confirmDialog.body}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmDialog(null)}>取消</Button>
                <Button className="flex-1 text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }} onClick={confirmSaveChapter}>✅ 确认保存</Button>
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
        <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
          <button className="px-3 py-1 text-xs rounded-md bg-background shadow-sm font-medium">聊天</button>
          <button onClick={() => setViewMode("draft")} className="px-3 py-1 text-xs rounded-md text-muted-foreground">草稿</button>
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
                  {/* Story paragraph */}
                  {m.paragraph && (
                    <Card className="max-w-[88%]" style={{ borderColor: "#FFD4A8", borderWidth: 1.5 }}>
                      <div className="px-3.5 py-1.5 bg-muted text-[11px] font-semibold text-[#FF6B6B] rounded-t-xl">📖 故事段落</div>
                      <CardContent className="text-sm leading-[1.85] whitespace-pre-wrap">{m.paragraph}</CardContent>
                      <div className="px-3.5 pb-3 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => send("继续写下一段", "pro")}>继续写 →</Button>
                        <Button size="sm" variant="outline" className="text-xs text-[#FF6B6B]" onClick={handleFinishChapter}>✓ 本章完成</Button>
                      </div>
                    </Card>
                  )}

                  {/* Normal text */}
                  {m.text && <div className="max-w-[88%] bg-card rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed ring-1 ring-border whitespace-pre-wrap">{m.text}</div>}

                  {/* Choices */}
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
          <div className="flex items-start gap-2.5">
            <MomoOrbSmall speaking />
            <div className="bg-card rounded-2xl rounded-tl-sm px-4 py-3 ring-1 ring-border flex gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF6B6B] dot-anim-1" /><span className="w-2 h-2 rounded-full bg-[#FF9A5C] dot-anim-2" /><span className="w-2 h-2 rounded-full bg-[#FFD06B] dot-anim-3" />
            </div>
          </div>
        )}
        {msgs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center pt-20"><MomoOrb size={100} /><p className="text-sm text-muted-foreground mt-5">Momo 正在准备...</p></div>
        )}
      </div>

      {/* Input bar */}
      <div className="relative shrink-0">
        {showMenu && (
          <div className="absolute bottom-full left-4 mb-2 bg-card rounded-xl ring-1 ring-border shadow-lg p-1 z-20 min-w-[180px]">
            <button onClick={extractToStory} disabled={extracting} className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5 disabled:opacity-50">
              📝 {extracting ? "整理中..." : "插入作品"}
            </button>
            <button className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5 opacity-40" disabled>
              🖼️ 上传参考图片
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-3 bg-background/90 backdrop-blur-lg border-t">
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
