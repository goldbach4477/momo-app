export async function GET() {
  const prompt = `你是Momo，一个面向青少年的AI小说编辑。请生成3条有趣的小说灵感设定，每条都是一个"如果你突然..."的场景，能激发15-18岁青少年的创作欲望。

要求：
- 每条灵感30-50字
- 涵盖不同类型（奇幻/校园/科幻/悬疑/穿越等）
- 有悬念感，让人想知道"然后呢？"
- 用第二人称"你"

严格按以下JSON格式输出，不要输出其他内容：
[
  {"emoji":"适合的emoji","text":"灵感内容"},
  {"emoji":"适合的emoji","text":"灵感内容"},
  {"emoji":"适合的emoji","text":"灵感内容"}
]`;

  try {
    const res = await fetch(process.env.MINIMAX_API_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: "MiniMax-M2.7",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8192,
        temperature: 0.95,
      }),
    });

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();

    // Extract JSON — might be wrapped in ```json ... ```
    const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      const seeds = JSON.parse(match[0]);
      return Response.json({ seeds });
    }

    // Try single object
    const singleMatch = cleaned.match(/\{[\s\S]*\}/);
    if (singleMatch) {
      const seed = JSON.parse(singleMatch[0]);
      return Response.json({ seeds: [seed] });
    }

    return Response.json({ seeds: null, raw: content });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
