import fs from "node:fs";

const path = ".output/server/wrangler.json";

const config = JSON.parse(fs.readFileSync(path, "utf8"));

config.ai = {
  binding: "AI",
};

fs.writeFileSync(path, JSON.stringify(config, null, 2) + "\n");

console.log("✓ Added Cloudflare Workers AI binding: AI");