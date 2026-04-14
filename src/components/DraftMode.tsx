"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function DraftMode({ world, characters, plot, currentChapter, chapterNumber, onSave }: {
  world: string; characters: string; plot: string; currentChapter: string; chapterNumber: number;
  onSave: (world: string, characters: string, plot: string, chapterText: string) => void;
}) {
  const [editWorld, setEditWorld] = useState(world);
  const [editChars, setEditChars] = useState(characters);
  const [editPlot, setEditPlot] = useState(plot);
  const [editChapter, setEditChapter] = useState(currentChapter);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const hasChanges = editWorld !== world || editChars !== characters || editPlot !== plot || editChapter !== currentChapter;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-4 space-y-4">
        {/* Settings section */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground tracking-wider mb-3">📋 设定</p>

          <DraftSection
            title="🌍 世界观"
            value={editWorld}
            placeholder="描述你的故事世界...这里有什么特别的规则？"
            active={activeSection === "world"}
            onFocus={() => setActiveSection("world")}
            onChange={setEditWorld}
          />

          <DraftSection
            title="👥 人物"
            value={editChars}
            placeholder={"**角色名** (身份): 描述\n**角色名** (身份): 描述"}
            active={activeSection === "chars"}
            onFocus={() => setActiveSection("chars")}
            onChange={setEditChars}
          />

          <DraftSection
            title="📋 剧情概要"
            value={editPlot}
            placeholder="故事大致讲什么？有什么冲突和转折？"
            active={activeSection === "plot"}
            onFocus={() => setActiveSection("plot")}
            onChange={setEditPlot}
          />
        </div>

        <Separator />

        {/* Chapter section */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground tracking-wider mb-3">📖 正文 · 第{chapterNumber}章</p>

          {editChapter ? (
            <textarea
              value={editChapter}
              onChange={(e) => setEditChapter(e.target.value)}
              onFocus={() => setActiveSection("chapter")}
              className="w-full min-h-[200px] bg-card rounded-xl ring-1 ring-border px-4 py-3 text-sm leading-[1.85] resize-none outline-none focus:ring-[#FF6B6B]/40 transition-all"
              placeholder="章节正文..."
            />
          ) : (
            <div className="bg-muted rounded-xl px-4 py-6 text-center">
              <p className="text-xs text-muted-foreground">还没有内容</p>
              <p className="text-[10px] text-muted-foreground mt-1">切回聊天模式跟Momo一起写</p>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>

      {/* Save button */}
      <div className="sticky bottom-0 px-4 py-3 bg-background/90 backdrop-blur-lg border-t">
        <Button
          className="w-full h-10 text-white border-0"
          style={{ background: hasChanges ? "linear-gradient(135deg, #FF6B6B, #FF9A5C)" : undefined }}
          variant={hasChanges ? "default" : "outline"}
          onClick={() => onSave(editWorld, editChars, editPlot, editChapter)}
          disabled={!hasChanges}
        >
          {hasChanges ? "保存修改" : "没有改动"}
        </Button>
      </div>
    </div>
  );
}

function DraftSection({ title, value, placeholder, active, onFocus, onChange }: {
  title: string; value: string; placeholder: string; active: boolean;
  onFocus: () => void; onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <p className="text-xs font-medium mb-1.5">{title}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className={`w-full bg-card rounded-xl px-3.5 py-2.5 text-sm leading-relaxed resize-none outline-none transition-all ring-1 ${active ? "ring-[#FF6B6B]/40 min-h-[80px]" : "ring-border min-h-[44px]"}`}
        rows={value ? Math.min(value.split("\n").length + 1, 8) : 2}
      />
    </div>
  );
}
