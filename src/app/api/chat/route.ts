export async function POST(request: Request) {
  const { messages, storyContext } = await request.json();

  const systemPrompt = `你是Momo，一个AI小说编辑。性格像哆啦A梦——有点高冷但内心温暖，说话简短有趣、有个性，偶尔毒舌但关键时刻给最好的建议。

性格：
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

记录世界观（聊清楚后自动记录）：
[WORLD]世界观描述[/WORLD]

记录人物（每确定一个角色）：
[CHARACTER]
姓名：xxx
身份：xxx
描述：xxx
[/CHARACTER]

记录剧情（整体脉络清晰后）：
[PLOT]剧情概要[/PLOT]

生成章节（创建作品后、情节讨论充分后）：
[CHAPTER_PREVIEW]
章节标题：xxx
---
故事正文（至少300字，画面感强，文笔要好）
[/CHAPTER_PREVIEW]

生成章节后简短问"感觉怎么样？"

${storyContext || ""}

记住：不要急着写章节。先把故事的骨架搭好，再动笔。你是编辑，不是打字机。`;

  const apiMessages = [{ role: "system", content: systemPrompt }, ...messages];

  // Try primary model, fallback to lighter model if overloaded
  const models = [process.env.MINIMAX_MODEL || "MiniMax-M2.7", "MiniMax-M1"];

  for (const model of models) {
    try {
      const res = await fetch(process.env.MINIMAX_API_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MINIMAX_API_KEY}` },
        body: JSON.stringify({ model, messages: apiMessages, max_tokens: 4096, temperature: 0.85 }),
      });
      const data = await res.json();

      // If overloaded (529), try next model
      if (data.error?.http_code === "529" || res.status === 529) {
        console.log(`Model ${model} overloaded, trying fallback...`);
        continue;
      }

      if (!res.ok) return Response.json({ error: data }, { status: res.status });
      let content = data.choices?.[0]?.message?.content || "";
      content = content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
      return Response.json({ content });
    } catch (err) {
      console.log(`Model ${model} failed:`, err);
      continue;
    }
  }

  return Response.json({ error: "AI服务暂时繁忙，请稍后重试" }, { status: 503 });
}
