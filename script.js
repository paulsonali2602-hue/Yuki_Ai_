/* ======================================================
   YUKI — Personal AI Assistant
   Frontend chat logic. Talks ONLY to our own backend
   (server.js) — never to Gemini directly, so the API
   key is never exposed to the browser.
   ====================================================== */

const messagesEl = document.getElementById("messages");
const composerEl = document.getElementById("composer");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const rulesToggle = document.getElementById("rulesToggle");
const rulesPanel = document.getElementById("rulesPanel");

rulesToggle.addEventListener("click", () => {
  const isHidden = rulesPanel.hasAttribute("hidden");
  if (isHidden) {
    rulesPanel.removeAttribute("hidden");
    rulesToggle.setAttribute("aria-expanded", "true");
  } else {
    rulesPanel.setAttribute("hidden", "");
    rulesToggle.setAttribute("aria-expanded", "false");
  }
});

// conversation history sent to the backend each turn
let history = [];

function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  const label = document.createElement("span");
  label.className = "who";
  label.textContent = who === "yuki" ? "Yuki" : "Sensei";
  div.appendChild(label);
  div.appendChild(document.createTextNode(text));
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function showTyping() {
  const div = document.createElement("div");
  div.className = "typing";
  div.id = "typingIndicator";
  div.innerHTML = "<span></span><span></span><span></span>";
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById("typingIndicator");
  if (t) t.remove();
}

// ---------- Talk to our own backend ----------
async function sendMessage(message) {
  history.push({ role: "user", parts: [{ text: message }] });

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history })
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    console.error("Server error:", errBody);
    throw new Error(errBody.error || `Request failed (${response.status})`);
  }

  const data = await response.json();
  const reply = data.reply ?? "Sorry Sensei, I couldn't quite process that. Could you try again?";

  history.push({ role: "model", parts: [{ text: reply }] });
  return reply;
}

// ---------- Form submit ----------
composerEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  addMessage(text, "user");
  inputEl.value = "";
  inputEl.style.height = "auto";
  sendBtn.disabled = true;
  showTyping();

  try {
    const reply = await sendMessage(text);
    hideTyping();
    addMessage(reply, "yuki");
  } catch (err) {
    hideTyping();
    addMessage("Something went wrong reaching the server, Sensei. Please check that server.js is running and try again.", "yuki");
    console.error(err);
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
});

// enter to send, shift+enter for newline
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    composerEl.requestSubmit();
  }
});
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
});

// ---------- Ambient snowfall (signature visual) ----------
(function snow() {
  const canvas = document.getElementById("snow");
  const ctx = canvas.getContext("2d");
  let w, h, flakes;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function initFlakes() {
    const count = Math.floor((w * h) / 22000);
    flakes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 0.6,
      speed: Math.random() * 0.6 + 0.2,
      drift: Math.random() * 0.6 - 0.3,
      opacity: Math.random() * 0.5 + 0.3
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(223,243,255,${f.opacity})`;
      ctx.fill();
      f.y += f.speed;
      f.x += f.drift;
      if (f.y > h) { f.y = -4; f.x = Math.random() * w; }
      if (f.x > w) f.x = 0;
      if (f.x < 0) f.x = w;
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", () => { resize(); initFlakes(); });
  resize();
  initFlakes();
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    tick();
  }
})();