const BACKEND_URL = ""; 

async function getDailyInsight() {
  const user = await getCurrentUser();
  if (!user) return;

  const btn    = document.getElementById("insightBtn");
  const output = document.getElementById("insightOutput");

  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Thinking...'; }
  if (output) output.innerHTML = `<div class="alert alert-info">Analyzing your meals...</div>`;

  const today = new Date().toISOString().split("T")[0];

  const { data: meals } = await _supabase
    .from("meals")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today);

  if (!meals || meals.length === 0) {
    if (output) output.innerHTML = `<div class="alert alert-info">📋 No meals logged today. Add some meals first!</div>`;
    if (btn) { btn.disabled = false; btn.innerHTML = "Get AI Insight"; }
    return;
  }

  const summary = meals.map(m =>
    `- ${m.food_name}: ${m.calories} kcal, ${m.protein}g protein, ${m.carbs}g carbs, ${m.fats}g fat`
  ).join("\n");

  const totals = meals.reduce((acc, m) => ({
    cal: acc.cal + m.calories,
    pro: acc.pro + m.protein,
    car: acc.car + m.carbs,
    fat: acc.fat + m.fats,
  }), { cal: 0, pro: 0, car: 0, fat: 0 });

  try {
    const res = await fetch(`${BACKEND_URL}/insight`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary, totals, date: today })
    });

    const data = await res.json();
    const msg  = data.insight || data.message || "Could not generate insight.";

    if (output) output.innerHTML = `
      <div class="card fade-up" style="border-color: rgba(124,108,252,0.3);">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
          <span style="font-size:1.4rem">🤖</span>
          <span style="font-family:'Syne',sans-serif; font-weight:700;">AI Nutrition Coach</span>
          <span class="badge badge-accent">Today</span>
        </div>
        <p style="color: var(--text); line-height: 1.8; white-space: pre-wrap;">${escHtml(msg)}</p>
      </div>`;

  } catch (err) {
    if (output) output.innerHTML = `<div class="alert alert-error">Backend not reachable. Make sure the server is running.</div>`;
    console.error(err);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = "Get AI Insight"; }
  }
}

// ── AI Chat (ai-chat.html) ──
let chatHistory = [];

async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const msg   = input?.value.trim();
  if (!msg) return;

  input.value = "";
  appendMessage("user", msg);
  chatHistory.push({ role: "user", content: msg });

  const typingId = appendTyping();

  try {
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory })
    });

    const data   = await res.json();
    const reply  = data.reply || "Sorry, I couldn't process that.";

    removeTyping(typingId);
    appendMessage("ai", reply);
    chatHistory.push({ role: "assistant", content: reply });

  } catch (err) {
    removeTyping(typingId);
    appendMessage("ai", "Backend not reachable. Make sure the server is running on port 3000.");
  }
}

function appendMessage(role, text) {
  const container = document.getElementById("chatMessages");
  if (!container) return;

  const isUser = role === "user";
  const div = document.createElement("div");
  div.className = `msg ${isUser ? "msg-user" : "msg-ai"}`;
  div.innerHTML = `
    <div class="msg-avatar">${isUser ? "👤" : "🤖"}</div>
    <div class="msg-bubble">${escHtml(text)}</div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendTyping() {
  const container = document.getElementById("chatMessages");
  if (!container) return null;

  const id  = "typing-" + Date.now();
  const div = document.createElement("div");
  div.id        = id;
  div.className = "msg msg-ai";
  div.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble" style="animation: pulse 1s infinite;">Thinking...</div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

// Enter to send
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("chatInput")?.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });
});
