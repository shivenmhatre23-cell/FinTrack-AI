export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      status: "healthy",
      service: "FinTrack AI Cloudflare Pages",
      models: {
        insights: "@cf/meta/llama-3.1-8b-instruct",
        vision: "@cf/meta/llama-3.2-11b-vision-instruct",
      },
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
