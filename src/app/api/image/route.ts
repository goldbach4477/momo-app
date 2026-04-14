export async function POST(request: Request) {
  const { prompt } = await request.json();

  try {
    const res = await fetch("https://api.minimaxi.com/v1/image_generation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: "image-01",
        prompt: `Anime illustration style, vivid colors, cinematic lighting. Scene: ${prompt}`,
        aspect_ratio: "16:9",
        n: 1,
      }),
    });

    const data = await res.json();

    // MiniMax returns image_urls in data object
    if (data.data?.image_urls?.[0]) {
      return Response.json({ image: data.data.image_urls[0] });
    }

    if (data.data?.image_base64?.[0]) {
      return Response.json({ image: `data:image/jpeg;base64,${data.data.image_base64[0]}` });
    }

    if (data.data?.[0]?.url) {
      return Response.json({ image: data.data[0].url });
    }

    return Response.json({ error: "No image generated", detail: data }, { status: 500 });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
