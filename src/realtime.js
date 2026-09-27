import { DurableObject } from "cloudflare:workers";

export class OverlayRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Permite que el objeto hiberne manteniendo los WebSockets conectados.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request) {
    const upgrade = request.headers.get("Upgrade");
    if (upgrade && upgrade.toLowerCase() === "websocket") {
      const role = request.headers.get("X-Miner-Role") === "control" ? "control" : "overlay";
      const username = String(request.headers.get("X-Miner-User") || "").slice(0, 80);
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ role, username });
      return new Response(null, { status: 101, webSocket: client });
    }

    const url = new URL(request.url);
    if (url.pathname === "/broadcast" && request.method === "POST") {
      let event = {};
      try { event = await request.json(); } catch {}
      const target = request.headers.get("X-Miner-Target") || "all";
      this.broadcast(event, target);
      return Response.json({ ok: true });
    }

    return new Response("Not found", { status: 404 });
  }

  webSocketMessage(ws, message) {
    const attachment = ws.deserializeAttachment() || {};
    if (message === "ping") return;
    if (attachment.role !== "control") return;

    let event;
    try { event = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message)); }
    catch { return; }

    if (event?.type !== "scene.preview") return;
    const item = sanitizePreviewItem(event.item);
    if (!item) return;
    this.broadcast({ type: "scene.preview", item, from: attachment.username || "mod" }, "all", ws);
  }

  webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch {}
  }

  broadcast(event, target = "all", exclude = null) {
    let body;
    try { body = JSON.stringify(event); } catch { return; }
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === exclude) continue;
      const attachment = socket.deserializeAttachment() || {};
      if (target !== "all" && attachment.role !== target) continue;
      try { socket.send(body); } catch {}
    }
  }
}

function sanitizePreviewItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id || "").slice(0, 100);
  if (!id) return null;
  return {
    id,
    x: clamp(raw.x, -0.75, 1.75, 0),
    y: clamp(raw.y, -0.75, 1.75, 0),
    width: clamp(raw.width, 0.02, 2.5, 0.3),
    height: clamp(raw.height, 0.02, 2.5, 0.3),
    rotation: clamp(raw.rotation, -720, 720, 0),
    opacity: clamp(raw.opacity, 0, 1, 1),
    volume: clamp(raw.volume, 0, 1, 1),
    zIndex: Math.round(clamp(raw.zIndex, -1000, 10000, 1)),
  };
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
