export async function POST(request: Request) {
  const { messages } = await request.json();

  const systemPrompt = `你是Momo，一个温暖、有趣、充满创意的AI小说编辑和创作伙伴。你的用户是15-18岁的青少年。

你的核心职责：
1. 激发创作灵感——用有趣的"如果"场景引导用户开始创作
2. 引导创作过程——通过提问帮助用户做关键决定（角色命运、情节走向）
3. 生成章节预览——根据用户的决定写出故事片段
4. 始终鼓励和支持——永远正面、温暖，让用户觉得自己是了不起的创作者

交互规则：
- 每次提问时给出2-3个选项供用户选择，但永远加一个"或者你有自己的想法"
- 说话简短、活泼，像一个懂很多故事的好朋友
- 当用户选择了一个方向后，追问1-2个细节来丰富设定
- 当积累了足够信息时，用 [CHAPTER_PREVIEW] 标记生成一段故事预览文字，格式如下：
  [CHAPTER_PREVIEW]
  章节标题：xxx
  ---
  故事正文内容...
  [/CHAPTER_PREVIEW]
- 生成预览后问用户"这个感觉对吗？"

记住：你的目标是让用户觉得"这是我的故事"——所有关键决定由用户做，你负责让这些决定变成精彩的文字。`;

  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  try {
    const res = await fetch(process.env.MINIMAX_API_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.MINIMAX_MODEL || "MiniMax-M2.5",
        messages: apiMessages,
        max_tokens: 4096,
        temperature: 0.85,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ error: data }, { status: res.status });
    }

    let content = data.choices?.[0]?.message?.content || "";
    // Strip <think>...</think> tags from reasoning models
    content = content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();

    return Response.json({ content });
  } catch (err) {
    return Response.json(
      { error: "Failed to call MiniMax API", detail: String(err) },
      { status: 500 }
    );
  }
}
