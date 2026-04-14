"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getStories, updateStoryMeta, type Story } from "@/lib/store";

export default function WorksTab({ userId, onContinue, onRead }: {
  userId: string; onContinue: (storyId: string) => void; onRead: (title: string, content: string) => void;
}) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"settings" | "chapters">("chapters");
  const [editing, setEditing] = useState<string | null>(null); // which field is being edited
  const [editValue, setEditValue] = useState("");

  useEffect(() => { getStories(userId).then(setStories).finally(() => setLoading(false)); }, [userId]);

  if (loading) return <div className="flex items-center justify-center" style={{ height: "calc(100dvh - 120px)" }}><span className="w-2 h-2 rounded-full bg-[#FF6B6B] dot-anim-1" /></div>;

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-8" style={{ height: "calc(100dvh - 120px)" }}>
        <span className="text-5xl">✏️</span>
        <p className="text-sm font-medium">还没有作品</p>
        <p className="text-xs text-muted-foreground text-center">去&quot;创作&quot;页面跟Momo聊聊</p>
      </div>
    );
  }

  async function saveEdit(storyId: string, field: string, value: string) {
    const updates: Record<string, unknown> = {};
    if (field === "world") updates.world_building = value;
    if (field === "plot") updates.plot_summary = value;
    if (field === "characters") {
      updates.characters = value.split("\n").filter(Boolean).map((line) => {
        const m = line.match(/(.+?)[（(](.+?)[）)][：:]\s*(.*)/);
        return m ? { name: m[1].replace(/\*\*/g,"").trim(), role: m[2], description: m[3] } : { name: line.replace(/\*\*/g,"").trim(), role: "", description: "" };
      });
    }
    await updateStoryMeta(storyId, updates);
    setStories(await getStories(userId));
    setEditing(null);
  }

  return (
    <div className="px-4 pt-5 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">我的作品</h2>
        <Badge variant="outline">{stories.length} 部</Badge>
      </div>

      {stories.map((story) => {
        const isOpen = expanded === story.id;
        const meta = story.meta;

        return (
          <Card key={story.id}>
            <CardHeader className="cursor-pointer" onClick={() => { setExpanded(isOpen ? null : story.id); setEditing(null); }}>
              <div className="flex items-center justify-between">
                <CardTitle>{story.title}</CardTitle>
                <span className="text-muted-foreground text-xs">{isOpen ? "▲" : "▼"}</span>
              </div>
              <CardDescription>{meta.display_description}</CardDescription>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="secondary">{story.chapters.length} 章</Badge>
                {meta.characters.length > 0 && <Badge variant="outline">{meta.characters.length} 角色</Badge>}
              </div>
            </CardHeader>

            {isOpen && (
              <CardContent className="space-y-3">
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  <button onClick={() => setTab("settings")} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tab === "settings" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>📋 设定</button>
                  <button onClick={() => setTab("chapters")} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${tab === "chapters" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>📖 正文</button>
                </div>

                {tab === "settings" ? (
                  <div className="space-y-3">
                    <EditableField
                      icon="🌍" title="世界观" value={meta.world_building} empty="点击编辑添加世界观"
                      isEditing={editing === `${story.id}-world`}
                      onEdit={() => { setEditing(`${story.id}-world`); setEditValue(meta.world_building); }}
                      editValue={editValue} onEditChange={setEditValue}
                      onSave={() => saveEdit(story.id, "world", editValue)}
                      onCancel={() => setEditing(null)}
                    />
                    <EditableField
                      icon="📋" title="剧情概要" value={meta.plot_summary} empty="点击编辑添加剧情概要"
                      isEditing={editing === `${story.id}-plot`}
                      onEdit={() => { setEditing(`${story.id}-plot`); setEditValue(meta.plot_summary); }}
                      editValue={editValue} onEditChange={setEditValue}
                      onSave={() => saveEdit(story.id, "plot", editValue)}
                      onCancel={() => setEditing(null)}
                    />
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground">👥 人物</p>
                        {editing !== `${story.id}-chars` && (
                          <button onClick={() => { setEditing(`${story.id}-chars`); setEditValue(meta.characters.map((c) => `${c.name}（${c.role}）：${c.description}`).join("\n")); }} className="text-[10px] text-[#FF6B6B] bg-transparent border-none cursor-pointer">编辑</button>
                        )}
                      </div>
                      {editing === `${story.id}-chars` ? (
                        <div className="space-y-2">
                          <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full bg-card rounded-lg ring-1 ring-[#FF6B6B]/40 px-3 py-2 text-xs leading-relaxed resize-none outline-none min-h-[80px]" placeholder={"角色名（身份）：描述\n角色名（身份）：描述"} />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setEditing(null)}>取消</Button>
                            <Button size="sm" className="flex-1 text-xs text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }} onClick={() => saveEdit(story.id, "characters", editValue)}>保存</Button>
                          </div>
                        </div>
                      ) : meta.characters.length > 0 ? (
                        <div className="space-y-1.5">
                          {meta.characters.map((c, i) => (
                            <div key={i} className="bg-muted rounded-lg p-2.5">
                              <span className="text-sm font-semibold">{c.name}</span>
                              {c.role && <Badge variant="outline" className="text-[10px] ml-2">{c.role}</Badge>}
                              {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2.5 cursor-pointer" onClick={() => { setEditing(`${story.id}-chars`); setEditValue(""); }}>点击添加人物设定</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {story.chapters.length > 0 ? story.chapters.map((ch) => (
                      <button key={ch.id} onClick={() => onRead(ch.title, ch.content)} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm flex items-center justify-between group">
                        <span><span className="text-muted-foreground mr-2">第{ch.number}章</span>{ch.title}</span>
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">阅读 →</span>
                      </button>
                    )) : <p className="text-xs text-muted-foreground text-center py-4">还没写任何章节</p>}
                  </div>
                )}

                <Separator />
                <Button className="w-full text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }} onClick={() => onContinue(story.id)}>继续创作</Button>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function EditableField({ icon, title, value, empty, isEditing, onEdit, editValue, onEditChange, onSave, onCancel }: {
  icon: string; title: string; value: string; empty: string;
  isEditing: boolean; onEdit: () => void;
  editValue: string; onEditChange: (v: string) => void;
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-muted-foreground">{icon} {title}</p>
        {!isEditing && <button onClick={onEdit} className="text-[10px] text-[#FF6B6B] bg-transparent border-none cursor-pointer">编辑</button>}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <textarea value={editValue} onChange={(e) => onEditChange(e.target.value)} className="w-full bg-card rounded-lg ring-1 ring-[#FF6B6B]/40 px-3 py-2 text-xs leading-relaxed resize-none outline-none min-h-[60px]" />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={onCancel}>取消</Button>
            <Button size="sm" className="flex-1 text-xs text-white border-0" style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }} onClick={onSave}>保存</Button>
          </div>
        </div>
      ) : (
        <div className="bg-muted rounded-lg p-2.5 cursor-pointer" onClick={onEdit}>
          <p className="text-xs leading-relaxed">{value || <span className="text-muted-foreground">{empty}</span>}</p>
        </div>
      )}
    </div>
  );
}
