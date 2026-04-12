"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import HomeTab from "@/components/HomeTab";
import ChatScreen from "@/components/ChatScreen";
import DiscoverTab from "@/components/DiscoverTab";
import ReadingScreen from "@/components/ReadingScreen";
import WorksTab from "@/components/WorksTab";

type Tab = "home" | "discover" | "works" | "me";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeed, setChatSeed] = useState("");
  const [chatStoryId, setChatStoryId] = useState<string | undefined>();
  const [readingOpen, setReadingOpen] = useState(false);
  const [readChap, setReadChap] = useState({ title: "", content: "" });
  const [worksRefresh, setWorksRefresh] = useState(0);

  const openChat = (seed: string, storyId?: string) => {
    setChatSeed(seed);
    setChatStoryId(storyId);
    setChatOpen(true);
  };

  const openReading = (t: string, c: string) => {
    setReadChap({ title: t, content: c });
    setReadingOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setChatStoryId(undefined);
    setWorksRefresh((n) => n + 1);
  };

  if (chatOpen) {
    return (
      <Shell>
        <ChatScreen
          initialSeed={chatSeed}
          storyId={chatStoryId}
          onBack={closeChat}
          onReadChapter={openReading}
        />
      </Shell>
    );
  }

  if (readingOpen) {
    return (
      <Shell>
        <ReadingScreen title={readChap.title} content={readChap.content} onBack={() => setReadingOpen(false)} />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex-1 overflow-y-auto pb-14">
        {tab === "home" && <HomeTab onStartChat={openChat} />}
        {tab === "discover" && <DiscoverTab />}
        {tab === "works" && <WorksTab key={worksRefresh} onContinue={(id) => openChat("", id)} onRead={openReading} />}
        {tab === "me" && <EmptyState icon="👤" title="未登录" sub="登录后可以保存你的创作" />}
      </div>
      <nav className="absolute bottom-0 inset-x-0 h-14 bg-background/90 backdrop-blur-lg border-t flex justify-around items-center z-50">
        {([
          { key: "home" as Tab, icon: "✨", label: "创作" },
          { key: "discover" as Tab, icon: "📖", label: "发现" },
          { key: "works" as Tab, icon: "✏️", label: "我的作品" },
          { key: "me" as Tab, icon: "👤", label: "我" },
        ]).map((t) => (
          <Button key={t.key} variant="ghost" size="sm" onClick={() => setTab(t.key)}
            className={`flex-col gap-0.5 h-auto py-1.5 px-3 ${tab === t.key ? "text-[#FF6B6B]" : "text-muted-foreground"}`}>
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="text-[10px]" style={{ fontWeight: tab === t.key ? 600 : 400 }}>{t.label}</span>
          </Button>
        ))}
      </nav>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center bg-muted" style={{ minHeight: "100dvh" }}>
      <div className="w-full max-w-[420px] bg-background relative flex flex-col shadow-xl" style={{ height: "100dvh" }}>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8" style={{ height: "calc(100dvh - 120px)" }}>
      <span className="text-5xl">{icon}</span>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground text-center">{sub}</p>
    </div>
  );
}
