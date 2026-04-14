"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { CodexEntry, CodexEntryType, OutlineChapter } from "@/lib/store";

const CODEX_TYPES: { type: CodexEntryType; icon: string; label: string }[] = [
  { type: "character", icon: "👥", label: "人物" },
  { type: "location", icon: "🗺️", label: "地点" },
  { type: "item", icon: "⚔️", label: "物品/道具" },
  { type: "lore", icon: "📜", label: "世界规则" },
  { type: "faction", icon: "🏴", label: "势力/阵营" },
  { type: "other", icon: "📌", label: "其他" },
];

type DraftTab = "settings" | "chapters";

export default function DraftMode({ codex, outline, currentChapter, chapterNumber, chapterParagraphs, onSaveSettings, onSaveChapter }: {
  codex: CodexEntry[];
  outline: { overall: string; chapters: OutlineChapter[] };
  currentChapter: string;
  chapterNumber: number;
  chapterParagraphs: string[];
  onSaveSettings: (codex: CodexEntry[], outline: { overall: string; chapters: OutlineChapter[] }) => void;
  onSaveChapter: (text: string) => void;
}) {
  const [tab, setTab] = useState<DraftTab>("settings");
  const [editCodex, setEditCodex] = useState<CodexEntry[]>(codex);
  const [editOutlineOverall, setEditOutlineOverall] = useState(outline.overall);
  const [editOutlineChapters, setEditOutlineChapters] = useState<OutlineChapter[]>(outline.chapters);
  const [editChapter, setEditChapter] = useState(currentChapter);
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const [addingType, setAddingType] = useState<CodexEntryType | null>(null);
  const [newEntry, setNewEntry] = useState({ name: "", description: "" });

  function addCodexEntry(type: CodexEntryType) {
    if (!newEntry.name.trim()) return;
    setEditCodex([...editCodex, { type, name: newEntry.name, description: newEntry.description }]);
    setNewEntry({ name: "", description: "" });
    setAddingType(null);
  }

  function removeCodexEntry(idx: number) {
    setEditCodex(editCodex.filter((_, i) => i !== idx));
  }

  function updateCodexEntry(idx: number, field: string, value: string) {
    const updated = [...editCodex];
    if (field === "name") updated[idx] = { ...updated[idx], name: value };
    else updated[idx] = { ...updated[idx], description: value };
    setEditCodex(updated);
  }

  const settingsChanged = JSON.stringify(editCodex) !== JSON.stringify(codex) ||
    editOutlineOverall !== outline.overall ||
    JSON.stringify(editOutlineChapters) !== JSON.stringify(outline.chapters);

  const chapterChanged = editChapter !== currentChapter;

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Tab switcher */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setTab("settings")} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${tab === "settings" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            📋 设定集
          </button>
          <button onClick={() => setTab("chapters")} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${tab === "chapters" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            📖 正文
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {tab === "settings" ? (
          <div className="space-y-4 pt-2">
            {/* Overall outline */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">📋 总体大纲</p>
              <textarea value={editOutlineOverall} onChange={(e) => setEditOutlineOverall(e.target.value)}
                placeholder="整个故事的剧情概要..."
                className="w-full bg-card rounded-xl ring-1 ring-border px-3.5 py-2.5 text-sm leading-relaxed resize-none outline-none focus:ring-[#FF6B6B]/40 min-h-[60px]"
                rows={Math.max(2, editOutlineOverall.split("\n").length)} />
            </div>

            {/* Chapter outlines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground">📑 分章大纲</p>
                <button onClick={() => setEditOutlineChapters([...editOutlineChapters, { number: editOutlineChapters.length + 1, title: "", synopsis: "" }])}
                  className="text-[10px] text-[#FF6B6B] bg-transparent border-none cursor-pointer">+ 添加</button>
              </div>
              {editOutlineChapters.length > 0 ? (
                <div className="space-y-2">
                  {editOutlineChapters.map((ch, i) => (
                    <Card key={i} size="sm">
                      <CardContent className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] shrink-0">第{ch.number}章</Badge>
                          <input value={ch.title} onChange={(e) => { const u = [...editOutlineChapters]; u[i] = { ...u[i], title: e.target.value }; setEditOutlineChapters(u); }}
                            placeholder="章节标题" className="flex-1 text-xs font-medium bg-transparent outline-none border-none" />
                        </div>
                        <textarea value={ch.synopsis} onChange={(e) => { const u = [...editOutlineChapters]; u[i] = { ...u[i], synopsis: e.target.value }; setEditOutlineChapters(u); }}
                          placeholder="本章概要..." className="w-full text-xs leading-relaxed bg-muted rounded-lg px-2.5 py-1.5 resize-none outline-none min-h-[36px]"
                          rows={Math.max(1, ch.synopsis.split("\n").length)} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3 text-center">还没有分章大纲</p>}
            </div>

            <Separator />

            {/* Codex entries by type */}
            {CODEX_TYPES.map(({ type, icon, label }) => {
              const entries = editCodex.filter((e) => e.type === type);
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">{icon} {label}</p>
                    <button onClick={() => setAddingType(addingType === type ? null : type)}
                      className="text-[10px] text-[#FF6B6B] bg-transparent border-none cursor-pointer">
                      {addingType === type ? "取消" : "+ 添加"}
                    </button>
                  </div>

                  {/* Add form */}
                  {addingType === type && (
                    <Card size="sm" className="mb-2" style={{ borderColor: "#FFD4A8" }}>
                      <CardContent className="space-y-2">
                        <input value={newEntry.name} onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                          placeholder="名称" className="w-full text-sm bg-muted rounded-lg px-2.5 py-1.5 outline-none" />
                        <textarea value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                          placeholder="描述..." className="w-full text-xs leading-relaxed bg-muted rounded-lg px-2.5 py-1.5 resize-none outline-none min-h-[36px]" />
                        <Button size="sm" className="w-full text-xs text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
                          onClick={() => addCodexEntry(type)} disabled={!newEntry.name.trim()}>添加</Button>
                      </CardContent>
                    </Card>
                  )}

                  {entries.length > 0 ? (
                    <div className="space-y-1.5">
                      {entries.map((entry, _) => {
                        const globalIdx = editCodex.indexOf(entry);
                        const isEditing = editingEntry === globalIdx;
                        return (
                          <Card key={globalIdx} size="sm">
                            <CardContent>
                              {isEditing ? (
                                <div className="space-y-1.5">
                                  <input value={entry.name} onChange={(e) => updateCodexEntry(globalIdx, "name", e.target.value)}
                                    className="w-full text-sm font-medium bg-muted rounded-lg px-2.5 py-1.5 outline-none" />
                                  <textarea value={entry.description} onChange={(e) => updateCodexEntry(globalIdx, "description", e.target.value)}
                                    className="w-full text-xs leading-relaxed bg-muted rounded-lg px-2.5 py-1.5 resize-none outline-none min-h-[36px]" />
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setEditingEntry(null)}>完成</Button>
                                    <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => { removeCodexEntry(globalIdx); setEditingEntry(null); }}>删除</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="cursor-pointer" onClick={() => setEditingEntry(globalIdx)}>
                                  <p className="text-sm font-medium">{entry.name}</p>
                                  {entry.details?.role && <Badge variant="outline" className="text-[10px] mt-0.5">{entry.details.role}</Badge>}
                                  {entry.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.description}</p>}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : addingType !== type && (
                    <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2.5 text-center mb-2">暂无</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Chapters tab */
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">📖 第{chapterNumber}章（编辑中）</p>
              {editChapter || chapterParagraphs.length > 0 ? (
                <textarea value={editChapter} onChange={(e) => setEditChapter(e.target.value)}
                  className="w-full bg-card rounded-xl ring-1 ring-border px-4 py-3 text-sm leading-[1.85] resize-none outline-none focus:ring-[#FF6B6B]/40 min-h-[250px]"
                  placeholder="章节正文..." />
              ) : (
                <div className="bg-muted rounded-xl px-4 py-8 text-center">
                  <p className="text-xs text-muted-foreground">还没有内容</p>
                  <p className="text-[10px] text-muted-foreground mt-1">切回聊天模式跟Momo一起写</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="sticky bottom-0 px-4 py-3 bg-background/90 backdrop-blur-lg border-t shrink-0">
        {tab === "settings" ? (
          <Button className="w-full h-10 text-white border-0"
            style={{ background: settingsChanged ? "linear-gradient(135deg, #FF6B6B, #FF9A5C)" : undefined }}
            variant={settingsChanged ? "default" : "outline"}
            disabled={!settingsChanged}
            onClick={() => onSaveSettings(editCodex, { overall: editOutlineOverall, chapters: editOutlineChapters })}>
            {settingsChanged ? "保存设定" : "没有改动"}
          </Button>
        ) : (
          <Button className="w-full h-10 text-white border-0"
            style={{ background: chapterChanged ? "linear-gradient(135deg, #FF6B6B, #FF9A5C)" : undefined }}
            variant={chapterChanged ? "default" : "outline"}
            disabled={!chapterChanged}
            onClick={() => onSaveChapter(editChapter)}>
            {chapterChanged ? "保存正文" : "没有改动"}
          </Button>
        )}
      </div>
    </div>
  );
}
