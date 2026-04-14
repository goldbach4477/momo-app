export async function POST(request: Request) {
  const { content, type } = await request.json();
  // type: "summary" (compress chapter) or "title" (generate chapter title)

  const prompt = type === "title"
    ? `为以下小说章节生成一个好听的章节标题，4-8个字，有意境。只输出标题，不要引号。\n\n${content.slice(0, 500)}`
    : `将以下小说章节压缩为200字以内的摘要，保留关键情节、角色行为和重要转折。只输出摘要。\n\n${content}`;

  const apiUrl = process.env.MIMO_API_URL || "https://api.xiaomimimo.com/v1/chat/completions";
  const apiKey = process.env.MIMO_API_KEY;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "mimo-v2-flash", messages: [{ role: "user", content: prompt }], max_tokens: 500, temperature: 0.5 }),
    });
    const data = await res.json();
    let result = data.choices?.[0]?.message?.content || "";
    result = result.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
    return Response.json({ result });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
