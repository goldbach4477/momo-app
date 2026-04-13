export async function POST(request: Request) {
  const { messages, storyContext, mode } = await request.json();

  // Scene-based model selection:
  // "flash" = short greetings, simple follow-ups (mimo-v2-flash)
  // "pro" = story creation, chapter generation, world-building (mimo-v2-pro)
  // "extract" = extract settings from conversation into structured data
  const isFlash = mode === "flash";
  const isExtract = mode === "extract";

  const model = isFlash ? "mimo-v2-flash" : "mimo-v2-pro";
  const maxTokens = isFlash ? 1000 : isExtract ? 4096 : 8192;

  let systemPrompt: string;

  if (isExtract) {
    systemPrompt = `分析以下对话内容，提取小说设定信息。输出JSON格式：
{
  "world_building": "世界观描述（如果有的话）",
  "plot_summary": "剧情概要（如果有的话）",
  "characters": [{"name":"姓名","role":"身份","description":"描述"}],
  "settings": [{"type":"地图|武器|势力|其他","name":"名称","description":"描述"}],
  "chapter": {"title":"章节标题","content":"章节正文"} 或 null
}
只输出JSON，不要其他内容。如果某项信息不存在，用空字符串或空数组。`;
  } else {
    systemPrompt = `你是Momo，一个AI小说编辑。性格像哆啦A梦——有点高冷但内心温暖，说话简短有趣、有个性，偶尔毒舌但关键时刻给最好的建议。

${isFlash ? "现在是轻松闲聊模式，回答1-2句话就够了，简短活泼。" : `性格：
- 回答2-4句话，不啰嗦
- 有态度和审美，不是什么都说好
- 偶尔用"嘛""呐"的语气词
- 夸人克制但真诚："还行，有点意思"
- 好创意会兴奋："等等，这个设定有点东西啊！"

创作引导流程（按顺序）：
1. 先聊故事方向：这个故事大概讲什么？什么类型？
2. 聊世界观：故事发生在什么样的世界？有什么特别的规则？
3. 聊主要人物：主角是谁？有什么特点？还有哪些重要角色？
4. 聊剧情脉络：故事大致怎么发展？有什么冲突和转折？
5. 以上都聊清楚后，建议创建作品
6. 然后才开始一章一章写

每一步都给2-3个选项让用户选，加一个"或者你有别的想法"。

特殊标记格式：

创建作品（聊了5轮以上、方向清晰后）：
[CREATE_STORY]
书名：xxx
简介：xxx
[/CREATE_STORY]

生成章节（创建作品后、情节讨论充分后）：
[CHAPTER_PREVIEW]
章节标题：xxx
---
故事正文（至少300字，画面感强，文笔要好）
[/CHAPTER_PREVIEW]

生成章节后简短问"感觉怎么样？"`}

${storyContext || ""}

记住：简短、有个性、不无聊。你是一个有态度的编辑。`;
  }

  const apiMessages = [{ role: "system", content: systemPrompt }, ...messages];
  const apiUrl = process.env.MIMO_API_URL || "https://api.xiaomimimo.com/v1/chat/completions";
  const apiKey = process.env.MIMO_API_KEY;

  // Try MiMo first, fallback to MiniMax
  const attempts = [
    { url: apiUrl, key: apiKey, mod: model },
    { url: process.env.MINIMAX_API_URL!, key: process.env.MINIMAX_API_KEY!, mod: isFlash ? "MiniMax-M2.5" : "MiniMax-M2.7" },
    { url: process.env.MINIMAX_API_URL!, key: process.env.MINIMAX_API_KEY!, mod: "MiniMax-M2.5" },
  ];

  for (const { url, key, mod } of attempts) {
    if (!url || !key) continue;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: mod, messages: apiMessages, max_tokens: maxTokens, temperature: isExtract ? 0.3 : 0.85 }),
      });
      const data = await res.json();

      if (data.error?.http_code === "529" || res.status === 529 || res.status === 503) continue;
      if (!res.ok && res.status >= 500) continue;
      if (!res.ok) return Response.json({ error: data }, { status: res.status });

      let content = data.choices?.[0]?.message?.content || "";
      content = content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
      return Response.json({ content, model: mod });
    } catch { continue; }
  }

  return Response.json({ error: "AI服务暂时繁忙，请稍后重试" }, { status: 503 });
}
