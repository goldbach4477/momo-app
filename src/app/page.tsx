"use client";

import { useState } from "react";
import HomeTab from "@/components/HomeTab";
import ChatScreen from "@/components/ChatScreen";
import DiscoverTab from "@/components/DiscoverTab";
import ReadingScreen from "@/components/ReadingScreen";

type Tab = "home" | "discover" | "works" | "me";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeed, setChatSeed] = useState("");
  const [readingOpen, setReadingOpen] = useState(false);
  const [readingChapter, setReadingChapter] = useState({ title: "", content: "" });

  const openChat = (seed: string) => { setChatSeed(seed); setChatOpen(true); };
  const openReading = (t: string, c: string) => { setReadingChapter({ title: t, content: c }); setReadingOpen(true); };

  if (chatOpen) return <Shell><ChatScreen initialSeed={chatSeed} onBack={() => setChatOpen(false)} onReadChapter={openReading} /></Shell>;
  if (readingOpen) return <Shell><ReadingScreen title={readingChapter.title} content={readingChapter.content} onBack={() => setReadingOpen(false)} /></Shell>;

  return (
    <Shell>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 64 }}>
          {tab === "home" && <HomeTab onStartChat={openChat} />}
          {tab === "discover" && <DiscoverTab />}
          {tab === "works" && <Placeholder emoji="✏️" title="你的作品将出现在这里" sub="开始创作你的第一个故事吧" />}
          {tab === "me" && <Placeholder emoji="👤" title="未登录" sub="登录后可以保存你的创作" />}
        </div>
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-around items-center h-14 z-50">
          {([
            { key: "home" as Tab, icon: "✨", label: "创作" },
            { key: "discover" as Tab, icon: "📖", label: "发现" },
            { key: "works" as Tab, icon: "✏️", label: "我的作品" },
            { key: "me" as Tab, icon: "👤", label: "我" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex flex-col items-center gap-0.5 bg-transparent border-none cursor-pointer transition-colors"
              style={{ color: tab === t.key ? "#FF6B6B" : "#aaa", fontSize: 10 }}
            >
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ fontWeight: tab === t.key ? 600 : 400 }}>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center" style={{ background: "#EDEBE8", minHeight: "100dvh" }}>
      <div className="app-shell">{children}</div>
    </div>
  );
}

function Placeholder({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8" style={{ height: "calc(100dvh - 120px)" }}>
      <span className="text-5xl">{emoji}</span>
      <p className="text-sm font-medium text-gray-800">{title}</p>
      <p className="text-xs text-gray-400 text-center">{sub}</p>
    </div>
  );
}
