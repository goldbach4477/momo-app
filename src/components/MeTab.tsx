"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import MomoOrb from "./MomoOrb";
import type { User } from "@/lib/auth";

export default function MeTab({ user, onLogin, onSignup, onLogout }: {
  user: User | null;
  onLogin: (u: string, p: string) => Promise<void>;
  onSignup: (u: string, p: string) => Promise<void>;
  onLogout: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) return;
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") await onSignup(username.trim(), password);
      else await onLogin(username.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Logged in view
  if (user) {
    return (
      <div className="px-4 pt-8 pb-6 space-y-6">
        <div className="flex flex-col items-center">
          <MomoOrb size={72} />
          <h2 className="text-lg font-bold mt-3">{user.username}</h2>
          <p className="text-xs text-muted-foreground mt-1">🌱 种子作者</p>
        </div>

        <Card>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">用户ID</span>
              <span className="font-mono text-xs">{user.id.slice(0, 8)}...</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">创作者等级</span>
              <span>🌱 种子作者</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">创作印记</span>
              <span>0 ✨</span>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={onLogout}>
          退出登录
        </Button>
      </div>
    );
  }

  // Login / Signup view
  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <div className="flex flex-col items-center">
        <MomoOrb size={80} />
        <h2 className="text-lg font-bold mt-3 gradient-text">
          {mode === "login" ? "欢迎回来" : "加入Momo"}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {mode === "login" ? "登录后继续你的创作" : "开始你的写作之旅"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {mode === "login" ? "登录" : "注册"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">用户名</label>
            <Input
              placeholder="给自己起个笔名..."
              className="h-10"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">密码</label>
            <Input
              type="password"
              placeholder="至少6位"
              className="h-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            className="w-full h-10 text-white border-0"
            style={{ background: "linear-gradient(135deg, #FF6B6B, #FF9A5C)" }}
            onClick={handleSubmit}
            disabled={loading || !username.trim() || !password.trim()}
          >
            {loading ? "请稍候..." : mode === "login" ? "登录" : "注册"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {mode === "login" ? "还没有账号？" : "已有账号？"}
            <button
              className="text-[#FF6B6B] font-medium ml-1 bg-transparent border-none cursor-pointer"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            >
              {mode === "login" ? "注册" : "登录"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
