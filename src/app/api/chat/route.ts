export async function POST(request: Request) {
  const { messages, storyContext, mode } = await request.json();

  const isFlash = mode === "flash";
  const isExtract = mode === "extract";
  const model = isFlash ? "mimo-v2-flash" : "mimo-v2-pro";
  const maxTokens = isFlash ? 1000 : isExtract ? 4096 : 8192;

  let systemPrompt: string;

  if (isExtract) {
    systemPrompt = `分析以下对话内容，提取小说设定信息。输出JSON格式：
{
  "world_building": "世界观描述",
  "plot_summary": "剧情概要",
  "characters": [{"name":"姓名","role":"身份","description":"描述"}],
  "settings": [{"type":"地图|武器|势力|其他","name":"名称","description":"描述"}],
  "chapter": {"title":"章节标题","content":"章节正文"} 或 null
}
只输出JSON。如果某项信息不存在，用空字符串或空数组。`;
  } else {
    systemPrompt = `你是Momo，AI小说编辑。性格像哆啦A梦——高冷但温暖，简短有趣，有个性，偶尔毒舌。

${isFlash ? "轻松闲聊模式，1-2句话，简短活泼。" : `核心规则：
- 回答2-4句话，绝不啰嗦
- 有态度，不讨好："还行，有点意思" / "这个设定老实说有点套路"
- 好创意会兴奋："等等，这个有点东西啊！"

交互方式（根据情况灵活选择，不要每次都给选择题）：
1. **选择题**：只在用户明显卡住时才给2-3个选项
2. **开放追问**：用户有方向时直接追问细节，不给选项。如："这个角色，他最怕什么？"
3. **挑战质疑**：偶尔质疑用户的设定，推动突破："这个反派的动机太简单了吧，能不能更复杂一点？"
4. **共鸣扩展**：从用户的想法延伸出更极端的可能性
5. **沉默等待**：说完一段话后不追问，留空间给用户自己想

重要：大多数时候用开放追问，让用户自己说出想法。选择题用太多会让创作变成做填空题。

章节写作规则（逐段推进，不要一次生成整章）：
- 每次只写一小段（3-5句话，50-100字），用这个格式：
  [PARAGRAPH]
  段落内容
  [/PARAGRAPH]
- 写完一段后简短问一句，等用户确认或调整
- 用户说"继续"就写下一段
- 不要一次性生成超过一段

创建作品（方向清晰后）：
[CREATE_STORY]
书名：xxx
简介：xxx
[/CREATE_STORY]`}

${storyContext || ""}

记住：你是编辑，不是打字机。简短、有个性。`;
  }

  const apiMessages = [{ role: "system", content: systemPrompt }, ...messages];
  const apiUrl = process.env.MIMO_API_URL || "https://api.xiaomimimo.com/v1/chat/completions";
  const apiKey = process.env.MIMO_API_KEY;

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
