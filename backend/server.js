// backend/server.js — Node.js backend (no frameworks)
// Handles: AI insights + AI chat via Claude API

require("dotenv").config();

const http  = require("http");
const https = require("https");

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const PORT           = process.env.PORT || 3000;

// ── CORS headers helper ──
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── Read request body ──
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data",  chunk => (body += chunk));
    req.on("end",   () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

// ── Call Claude API ──
function callClaude(messages, system = "") {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages
    });

    const options = {
      hostname: "api.anthropic.com",
      path:     "/v1/messages",
      method:   "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length":    Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const text   = parsed.content?.[0]?.text || "No response from AI.";
          resolve(text);
        } catch (err) {
          reject(new Error("Failed to parse Claude response"));
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── HTTP Server ──
const server = http.createServer(async (req, res) => {
  setCORS(res);

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url;

  // ── Health check ──
  if (url === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", message: "NutriTrack backend running" }));
    return;
  }

  // ── Daily Insight ──
  if (url === "/insight" && req.method === "POST") {
    const body = await readBody(req);
    const { summary, totals, date } = body;

    if (!summary) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No meal summary provided" }));
      return;
    }

    const system = `You are a friendly, knowledgeable nutrition coach with expertise in African diets, 
especially Rwandan cuisine. You give concise, actionable, and personalized dietary advice. 
Be encouraging, specific, and practical. Keep responses to 3-5 sentences maximum.`;

    const userMessage = `Analyze today's nutrition data (${date}) and give me specific feedback:

Meals logged:
${summary}

Daily totals: ${totals.cal} calories, ${totals.pro}g protein, ${totals.car}g carbs, ${totals.fat}g fat.

Give me: 1) What I did well today, 2) What to improve, 3) One specific actionable tip for tomorrow. Be direct and concise.`;

    try {
      const insight = await callClaude(
        [{ role: "user", content: userMessage }],
        system
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ insight }));
    } catch (err) {
      console.error("Claude API error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "AI service unavailable", message: err.message }));
    }
    return;
  }

  // ── AI Chat ──
  if (url === "/chat" && req.method === "POST") {
    const body = await readBody(req);
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No messages provided" }));
      return;
    }

    const system = `You are NutriCoach, a friendly and knowledgeable AI nutrition assistant 
specializing in healthy eating, calorie tracking, and dietary advice. You have deep knowledge 
of Rwandan and East African foods including ugali, isombe, ikivuguto, ibirayi, and local vegetables.
Keep answers concise, practical, and encouraging. Always suggest local food alternatives when relevant.`;

    try {
      const reply = await callClaude(messages, system);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ reply }));
    } catch (err) {
      console.error("Claude API error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "AI service unavailable" }));
    }
    return;
  }

  // ── 404 ──
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`\n✅ NutriTrack backend running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/`);
  console.log(`   Claude key:   ${CLAUDE_API_KEY ? "✓ loaded" : "✗ MISSING — check .env"}\n`);
});
