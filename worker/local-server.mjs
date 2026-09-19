import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import worker from "./index.js";

const PORT = 8787;
const ROOT_DIR = path.resolve(".");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  let pathname = parsedUrl.pathname;

  // Serve static root files if not an API or health check route
  if (!pathname.startsWith("/api/") && pathname !== "/health") {
    if (pathname === "/") pathname = "/index.html";
    const filePath = path.join(ROOT_DIR, pathname);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.statusCode = 200;
      res.setHeader("Content-Type", MIME_TYPES[ext] || "text/plain");
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // Collect request body for API calls
  let bodyChunks = [];
  for await (const chunk of req) {
    bodyChunks.push(chunk);
  }
  const bodyBuffer = Buffer.concat(bodyChunks);

  const request = new Request(parsedUrl.toString(), {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : bodyBuffer,
  });

  try {
    const env = {
      AI: null,
    };

    const response = await worker.fetch(request, env);

    res.statusCode = response.status;
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }

    const responseBody = await response.arrayBuffer();
    res.end(Buffer.from(responseBody));
  } catch (err) {
    console.error("Local proxy error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify({ error: err.message || "Internal Server Error" }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`✓ FinTrack AI App & Proxy running at http://127.0.0.1:${PORT}`);
  console.log(`  - Web App:      http://127.0.0.1:${PORT}`);
  console.log(`  - Health Check: http://127.0.0.1:${PORT}/health`);
  console.log(`  - AI Insights:  POST http://127.0.0.1:${PORT}/api/insights`);
  console.log(`  - Receipt Scan: POST http://127.0.0.1:${PORT}/api/scan-receipt`);
});
