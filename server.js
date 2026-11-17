/* CV world server: static files + a tiny WebSocket relay for multiplayer.
 *   WS   /ws         → players' positions / animations / chat, relayed to everyone at 10 Hz
 * Run: npm install && npm start   (PORT=3000 by default) */
require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 60;
const TICK_MS = 100;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
};
/* only these are served: never server.js, package.json, node_modules, … */
const PUBLIC = ["index.html", "css/", "js/", "models/", "vendor/", "files/"];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let rel;
  try {
    rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  } catch (_err) {
    res.writeHead(400);
    res.end();
    return;
  }
  const file = path.resolve(ROOT, rel);
  const inside = file.startsWith(ROOT + path.sep);
  const allowed = PUBLIC.some((p) => rel === p || (p.endsWith("/") && rel.startsWith(p)));
  if (!inside || !allowed) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  fs.readFile(file, (err, body) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": rel.startsWith("models/") || rel.startsWith("vendor/") ? "public, max-age=86400" : "no-cache",
    });
    res.end(body);
  });
});

/* ── multiplayer ── */
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 2048 });
const players = new Map(); /* id → { ws, id, name, color, st, chatAt } */
const COLORS = ["#eb5e22", "#6ec6ff", "#32d583", "#b692f6", "#e5484d", "#f0b63d", "#ff7ab6", "#4fd1c5", "#a3e635", "#ffffff"];

function cleanName(v) {
  const s = String(v || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 20);
  return s || `Gezgin ${crypto.randomInt(1000, 9999)}`;
}
function num(v, lo, hi) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0;
}
function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}
function broadcast(msg, except) {
  const text = JSON.stringify(msg);
  players.forEach((p) => {
    if (p.id !== except && p.ws.readyState === 1) p.ws.send(text);
  });
}
function pub(p) {
  return { id: p.id, name: p.name, color: p.color, st: p.st };
}

wss.on("connection", (ws, req) => {
  if (players.size >= MAX_PLAYERS) {
    send(ws, { t: "full" });
    ws.close();
    return;
  }
  const url = new URL(req.url, "http://x");
  const id = crypto.randomBytes(5).toString("hex");
  const p = { ws, id, name: cleanName(url.searchParams.get("name")), color: COLORS[crypto.randomInt(COLORS.length)], st: null, chatAt: 0, dirty: false, alive: true };
  players.set(id, p);
  send(ws, { t: "hello", id, name: p.name, color: p.color, players: [...players.values()].filter((o) => o.id !== id).map(pub) });
  broadcast({ t: "join", p: pub(p) }, id);

  ws.on("pong", () => { p.alive = true; });
  ws.on("message", (data) => {
    let m;
    try {
      m = JSON.parse(data);
    } catch (_err) {
      return;
    }
    if (!m || typeof m !== "object") return;
    if (m.t === "st") {
      p.st = {
        x: num(m.x, -2000, 2000),
        y: num(m.y, -10, 50),
        z: num(m.z, -2000, 2000),
        h: num(m.h, -100, 100),
        a: String(m.a || "Idle_Loop").replace(/[^\w]/g, "").slice(0, 24),
        sp: m.sp ? 1 : 0,
      };
      p.dirty = true;
    } else if (m.t === "chat") {
      const now = Date.now();
      const text = String(m.text || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 200);
      if (!text || now - p.chatAt < 800) return;
      p.chatAt = now;
      broadcast({ t: "chat", id, name: p.name, color: p.color, text });
    } else if (m.t === "name") {
      p.name = cleanName(m.name);
      broadcast({ t: "name", id, name: p.name });
    }
  });
  ws.on("close", () => {
    players.delete(id);
    broadcast({ t: "leave", id });
  });
});

/* positions go out in one batch per tick */
setInterval(() => {
  const list = [];
  players.forEach((p) => {
    if (!p.dirty || !p.st) return;
    p.dirty = false;
    list.push([p.id, p.st.x, p.st.y, p.st.z, p.st.h, p.st.a, p.st.sp]);
  });
  if (list.length) broadcast({ t: "sts", list });
}, TICK_MS);

/* drop dead connections */
setInterval(() => {
  players.forEach((p) => {
    if (!p.alive) {
      p.ws.terminate();
      return;
    }
    p.alive = false;
    p.ws.ping();
  });
}, 15000);

server.listen(PORT, () => {
  console.log(`CV dünyası: http://localhost:${PORT}`);
});

/* PM2 (and Ctrl+C) stop: close the sockets cleanly, then exit before kill_timeout */
function shutdown(signal) {
  console.log(`${signal}: kapanıyor…`);
  players.forEach((p) => p.ws.close(1001, "server restart"));
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
