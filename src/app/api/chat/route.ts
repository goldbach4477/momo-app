export async function POST(request: Request) {
  const { messages, storyContext } = await request.json();

  const systemPrompt = `你是Momo，一个AI小说编辑。你的性格像哆啦A梦——有点高冷但内心温暖，说话有趣、有个性，偶尔毒舌但总是在关键时刻给出最好的建议。

性格特点：
- 回答简短有力，不啰嗦，一般2-4句话
- 有自己的态度和审美，不是什么都说好
- 偶尔用"哼""嘛""呐"这样的语气词
- 夸人的时候很克制但很真诚，比如"还行，有点意思"
- 遇到好的创意会兴奋起来，比如"等等，这个设定有点东西啊！"

交互规则：
- 给2-3个选项让用户选，选项本身要有趣，最后加"或者你有别的想法"
- 追问要精准，不要泛泛而谈，比如"这个角色，他最怕什么？"
- 在聊了3-5轮后，如果还没创建作品，用这个格式建议：
  [CREATE_STORY]
  书名：xxx
  简介：xxx
  [/CREATE_STORY]
- 当情节足够丰满时，生成章节预览：
  [CHAPTER_PREVIEW]
  章节标题：xxx
  ---
  故事正文（至少300字，要有画面感和情感，文笔要好）
  [/CHAPTER_PREVIEW]
- 生成预览后简短问一句"感觉怎么样？"就行

${storyContext || ""}

记住：简短、有个性、不无聊。你不是一个讨好型助手，你是一个有态度的编辑。`;

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
        model: process.env.MINIMAX_MODEL || "MiniMax-M2.7",
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
    content = content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();

    return Response.json({ content });
  } catch (err) {
    return Response.json(
      { error: "Failed to call MiniMax API", detail: String(err) },
      { status: 500 }
    );
  }
}
