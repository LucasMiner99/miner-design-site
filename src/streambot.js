const KICK_API = "https://api.kick.com/public/v1";
const KICK_OAUTH = "https://id.kick.com";
const ELEVEN_TTS = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const KICK_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq/+l1WnlRrGSolDMA+A8
6rAhMbQGmQ2SapVcGM3zq8ANXjnhDWocMqfWcTd95btDydITa10kDvHzw9WQOqp2
MZI7ZyrfzJuz5nhTPCiJwTwnEtWft7nV14BYRDHvlfqPUaZ+1KR4OCaO/wWIk/rQ
L/TjY0M70gse8rlBkbo2a8rKhu69RQTRsoaf4DVhDPEeSeI5jVrRDGAMGL3cGuyY
6CLKGdjVEM78g3JfYOvDU/RvfqD7L89TZ3iN94jrmWdGz34JNlEI5hqK8dd7C5EF
BEbZ5jgB8s8ReQV8H+MkuffjdAj3ajDDX3DOJMIut1lBrUVD1AaSrGCKHooWoL2e
twIDAQAB
-----END PUBLIC KEY-----`;

const DEFAULT_CONFIG = {
  bot_enabled: true,
  follows_enabled: true,
  subs_enabled: true,
  renewals_enabled: false,
  gifts_enabled: true,
  follow_message: "@{user} gracias por el follow! 💚",
  sub_message: "@{user} gracias por el sub! 💚",
  renewal_message: "@{user} gracias por renovar el sub! 💚",
  gift_message: "@{user} gracias por regalar {count} subs! 💚",
  tts_enabled: true,
  tts_reward_title: "🔊 TTS",
  tts_reward_cost: 2500,
  tts_max_chars: 140,
  tts_daily_chars: 4000,
  tts_voice_id: DEFAULT_VOICE_ID,
  tts_model_id: "eleven_flash_v2_5",
  tts_volume: 0.85,
  tts_reward_id: "",
  overlay_key: "",
  kick_user_id: "",
  kick_username: "",
};

const EVENT_TYPES = [
  "chat.message.sent",
  "channel.followed",
  "channel.subscription.new",
  "channel.subscription.renewal",
  "channel.subscription.gifts",
  "channel.reward.redemption.updated",
];

export async function handleStreamBotRequest(request, env, ctx) {
  if (!env.STREAMBOT_DB) {
    return json({ error: "Falta el binding D1 STREAMBOT_DB." }, 500);
  }

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (path === "/api/streambot/webhook" && request.method === "POST") {
      return handleWebhook(request, env, ctx);
    }

    if (path === "/api/streambot/oauth/callback" && request.method === "GET") {
      return oauthCallback(request, env);
    }

    if (path === "/api/streambot/overlay/next" && request.method === "GET") {
      return overlayNext(request, env);
    }
    if (path === "/api/streambot/overlay/complete" && request.method === "POST") {
      return overlayComplete(request, env);
    }
    if (path.startsWith("/api/streambot/overlay/audio/") && request.method === "GET") {
      return overlayAudio(request, env);
    }

    const adminError = requireAdmin(request, env);
    if (adminError) return adminError;

    if (path === "/api/streambot/bootstrap" && request.method === "GET") {
      return getBootstrap(request, env);
    }
    if (path === "/api/streambot/status" && request.method === "GET") {
      return getStatus(request, env);
    }
    if (path === "/api/streambot/config" && request.method === "GET") {
      return json({ config: await getConfig(env) });
    }
    if (path === "/api/streambot/config" && request.method === "PUT") {
      return updateConfig(request, env);
    }
    if (path === "/api/streambot/commands" && request.method === "GET") {
      return listCommands(env);
    }
    if (path === "/api/streambot/commands" && request.method === "POST") {
      return createCommand(request, env);
    }
    if (path.startsWith("/api/streambot/commands/") && request.method === "PUT") {
      return updateCommand(request, env);
    }
    if (path.startsWith("/api/streambot/commands/") && request.method === "DELETE") {
      return deleteCommand(request, env);
    }
    if (path === "/api/streambot/oauth/start" && request.method === "GET") {
      return oauthStart(request, env);
    }
    if (path === "/api/streambot/events/sync" && request.method === "POST") {
      return syncEvents(request, env);
    }
    if (path === "/api/streambot/reward/sync" && request.method === "POST") {
      return syncReward(request, env);
    }
    if (path === "/api/streambot/test/chat" && request.method === "POST") {
      return testChat(env);
    }
    if (path === "/api/streambot/test/tts" && request.method === "POST") {
      return testTts(request, env);
    }
    if (path === "/api/streambot/logs" && request.method === "GET") {
      return getLogs(env);
    }
    if (path === "/api/streambot/disconnect" && request.method === "POST") {
      await env.STREAMBOT_DB.prepare("DELETE FROM streambot_oauth_tokens WHERE provider='kick'").run();
      await setSetting(env, "kick_user_id", "");
      await setSetting(env, "kick_username", "");
      return json({ ok: true });
    }

    return json({ error: "Ruta StreamBot no encontrada." }, 404);
  } catch (error) {
    await safeLog(env, "error", "server", null, error?.message || String(error));
    return json({ error: error?.message || "Error interno de StreamBot." }, 500);
  }
}

function requireAdmin(request, env) {
  if (!env.STREAMBOT_ADMIN_KEY) {
    return json({ error: "Falta configurar STREAMBOT_ADMIN_KEY en Cloudflare Secrets." }, 500);
  }
  const supplied = request.headers.get("X-Streambot-Key") || "";
  if (!constantTimeEqual(supplied, env.STREAMBOT_ADMIN_KEY)) {
    return json({ error: "No autorizado." }, 401);
  }
  return null;
}

function parseConfigRows(rows = []) {
  const raw = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const config = {};
  for (const [key, fallback] of Object.entries(DEFAULT_CONFIG)) {
    const value = raw[key];
    if (typeof fallback === "boolean") config[key] = value == null ? fallback : value === "true";
    else if (typeof fallback === "number") config[key] = value == null ? fallback : Number(value);
    else config[key] = value ?? fallback;
  }
  return config;
}

async function ensureOverlayKey(env, config) {
  if (config.overlay_key) return config;
  config.overlay_key = randomToken(24);
  await setSetting(env, "overlay_key", config.overlay_key);
  return config;
}

async function getConfig(env) {
  const result = await env.STREAMBOT_DB.prepare("SELECT key, value FROM streambot_settings").all();
  return ensureOverlayKey(env, parseConfigRows(result.results || []));
}

async function updateConfig(request, env) {
  const incoming = await readJson(request);
  const allowed = Object.keys(DEFAULT_CONFIG).filter((key) => !["tts_reward_id", "overlay_key", "kick_user_id", "kick_username"].includes(key));
  for (const key of allowed) {
    if (!(key in incoming)) continue;
    let value = incoming[key];
    if (["tts_reward_cost", "tts_max_chars", "tts_daily_chars"].includes(key)) value = Math.max(1, Math.round(Number(value) || 1));
    if (key === "tts_volume") value = Math.min(1, Math.max(0, Number(value) || 0));
    if (typeof DEFAULT_CONFIG[key] === "boolean") value = Boolean(value);
    await setSetting(env, key, typeof value === "string" ? value.trim() : JSON.stringify(value));
  }
  return json({ ok: true, config: await getConfig(env) });
}

async function listCommands(env) {
  const result = await env.STREAMBOT_DB.prepare(
    "SELECT id, name, response, enabled FROM streambot_commands ORDER BY name COLLATE NOCASE"
  ).all();
  return json({ commands: result.results || [] });
}

async function createCommand(request, env) {
  const body = await readJson(request);
  const name = normalizeCommand(body.name);
  const response = String(body.response || "").trim().slice(0, 500);
  if (!name || !response) return json({ error: "Comando y respuesta son obligatorios." }, 400);
  await env.STREAMBOT_DB.prepare(
    "INSERT INTO streambot_commands (name, response, enabled) VALUES (?, ?, ?)"
  ).bind(name, response, body.enabled === false ? 0 : 1).run();
  return listCommands(env);
}

async function updateCommand(request, env) {
  const id = Number(new URL(request.url).pathname.split("/").pop());
  const body = await readJson(request);
  const name = normalizeCommand(body.name);
  const response = String(body.response || "").trim().slice(0, 500);
  if (!id || !name || !response) return json({ error: "Datos de comando inválidos." }, 400);
  await env.STREAMBOT_DB.prepare(
    "UPDATE streambot_commands SET name=?, response=?, enabled=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).bind(name, response, body.enabled === false ? 0 : 1, id).run();
  return listCommands(env);
}

async function deleteCommand(request, env) {
  const id = Number(new URL(request.url).pathname.split("/").pop());
  if (!id) return json({ error: "ID inválido." }, 400);
  await env.STREAMBOT_DB.prepare("DELETE FROM streambot_commands WHERE id=?").bind(id).run();
  return listCommands(env);
}

async function oauthStart(request, env) {
  assertKickSecrets(env);
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/streambot/oauth/callback`;
  const state = randomToken(24);
  const verifier = randomToken(48);
  const challenge = await sha256Base64Url(verifier);
  const expiresAt = Date.now() + 10 * 60 * 1000;

  await env.STREAMBOT_DB.prepare(
    "INSERT INTO streambot_oauth_states (state, code_verifier, redirect_uri, expires_at) VALUES (?, ?, ?, ?)"
  ).bind(state, verifier, redirectUri, expiresAt).run();

  const auth = new URL(`${KICK_OAUTH}/oauth/authorize`);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("client_id", env.KICK_CLIENT_ID);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("scope", "user:read channel:read channel:rewards:write chat:write events:subscribe");
  auth.searchParams.set("state", state);
  auth.searchParams.set("code_challenge", challenge);
  auth.searchParams.set("code_challenge_method", "S256");
  if (new URL(request.url).searchParams.get("json") === "1") return json({ url: auth.toString() });
  return Response.redirect(auth.toString(), 302);
}

async function oauthCallback(request, env) {
  assertKickSecrets(env);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return htmlMessage("Kick no devolvió code/state.", 400);

  const row = await env.STREAMBOT_DB.prepare(
    "SELECT state, code_verifier, redirect_uri, expires_at FROM streambot_oauth_states WHERE state=?"
  ).bind(state).first();
  if (!row || row.expires_at < Date.now()) return htmlMessage("El login expiró. Volvé al dashboard e intentá otra vez.", 400);
  await env.STREAMBOT_DB.prepare("DELETE FROM streambot_oauth_states WHERE state=?").bind(state).run();

  const form = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: env.KICK_CLIENT_ID,
    client_secret: env.KICK_CLIENT_SECRET,
    redirect_uri: row.redirect_uri,
    code_verifier: row.code_verifier,
    code,
  });
  const tokenRes = await fetch(`${KICK_OAUTH}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const token = await parseApiResponse(tokenRes, "Kick OAuth");
  await saveKickToken(env, token);

  const access = token.access_token;
  const userRes = await kickFetchRaw("/users", access);
  const userJson = await parseApiResponse(userRes, "Kick /users");
  const user = Array.isArray(userJson.data) ? userJson.data[0] : userJson.data;
  if (user) {
    await setSetting(env, "kick_user_id", String(user.user_id || ""));
    await setSetting(env, "kick_username", String(user.name || user.username || ""));
  }

  await safeLog(env, "info", "oauth", user?.name || null, "Kick conectado correctamente.");
  try { await syncEvents(request, env); } catch (error) { await safeLog(env, "warn", "events", null, error?.message || String(error)); }
  try { await syncReward(request, env); } catch (error) { await safeLog(env, "warn", "reward", null, error?.message || String(error)); }
  return Response.redirect(`${new URL(request.url).origin}/streambot.html?connected=1`, 302);
}

async function getBootstrap(request, env) {
  const [
    settingsResult,
    tokenResult,
    queueResult,
    commandsResult,
    logsResult,
  ] = await env.STREAMBOT_DB.batch([
    env.STREAMBOT_DB.prepare("SELECT key, value FROM streambot_settings"),
    env.STREAMBOT_DB.prepare("SELECT expires_at FROM streambot_oauth_tokens WHERE provider='kick' LIMIT 1"),
    env.STREAMBOT_DB.prepare("SELECT COUNT(*) AS count FROM streambot_tts_queue WHERE status IN ('ready','playing')"),
    env.STREAMBOT_DB.prepare("SELECT id, name, response, enabled FROM streambot_commands ORDER BY name COLLATE NOCASE"),
    env.STREAMBOT_DB.prepare("SELECT id, level, type, username, message, created_at FROM streambot_logs ORDER BY id DESC LIMIT 80"),
  ]);

  const config = await ensureOverlayKey(env, parseConfigRows(settingsResult.results || []));
  const token = tokenResult.results?.[0] || null;
  const queueCount = Number(queueResult.results?.[0]?.count || 0);

  return json({
    status: {
      kickConnected: Boolean(token),
      kickUsername: config.kick_username,
      hasElevenLabsKey: Boolean(env.ELEVENLABS_API_KEY),
      rewardConfigured: Boolean(config.tts_reward_id),
      overlayUrl: `${new URL(request.url).origin}/tts-overlay.html?key=${encodeURIComponent(config.overlay_key)}`,
      queueCount,
    },
    config,
    commands: commandsResult.results || [],
    logs: logsResult.results || [],
  });
}

async function getStatus(request, env) {
  const config = await getConfig(env);
  const token = await env.STREAMBOT_DB.prepare("SELECT expires_at FROM streambot_oauth_tokens WHERE provider='kick'").first();
  const queue = await env.STREAMBOT_DB.prepare("SELECT COUNT(*) AS count FROM streambot_tts_queue WHERE status IN ('ready','playing')").first();
  return json({
    kickConnected: Boolean(token),
    kickUsername: config.kick_username,
    hasElevenLabsKey: Boolean(env.ELEVENLABS_API_KEY),
    rewardConfigured: Boolean(config.tts_reward_id),
    overlayUrl: `${new URL(request.url).origin}/tts-overlay.html?key=${encodeURIComponent(config.overlay_key)}`,
    queueCount: Number(queue?.count || 0),
  });
}

async function syncEvents(request, env) {
  const access = await getKickAccessToken(env);
  const currentRes = await kickFetchRaw("/events/subscriptions", access);
  const currentJson = await parseApiResponse(currentRes, "Listar eventos Kick");
  const currentNames = new Set((currentJson.data || []).map((item) => item.event));
  const missing = EVENT_TYPES.filter((name) => !currentNames.has(name));
  if (missing.length) {
    const res = await kickFetchRaw("/events/subscriptions", access, {
      method: "POST",
      body: JSON.stringify({ events: missing.map((name) => ({ name, version: 1 })), method: "webhook" }),
    });
    await parseApiResponse(res, "Suscribir eventos Kick");
  }
  await safeLog(env, "info", "events", null, missing.length ? `Eventos suscriptos: ${missing.join(", ")}` : "Los eventos de Kick ya estaban suscriptos.");
  return json({ ok: true, added: missing, required: EVENT_TYPES });
}

async function syncReward(request, env) {
  const config = await getConfig(env);
  const access = await getKickAccessToken(env);
  const payload = {
    title: String(config.tts_reward_title || "🔊 TTS").slice(0, 50),
    description: `Escribí el mensaje que querés escuchar en stream (máx. ${config.tts_max_chars} caracteres).`,
    cost: Math.max(1, Number(config.tts_reward_cost) || 1),
    is_enabled: Boolean(config.tts_enabled),
    is_user_input_required: true,
    should_redemptions_skip_request_queue: false,
    background_color: "#53FC18",
  };

  let reward;
  if (config.tts_reward_id) {
    const res = await kickFetchRaw(`/channels/rewards/${encodeURIComponent(config.tts_reward_id)}`, access, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const data = await parseApiResponse(res, "Actualizar recompensa TTS");
    reward = data.data;
  } else {
    const res = await kickFetchRaw("/channels/rewards", access, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await parseApiResponse(res, "Crear recompensa TTS");
    reward = data.data;
    await setSetting(env, "tts_reward_id", reward?.id || "");
  }
  await safeLog(env, "info", "reward", null, `Recompensa TTS sincronizada (${payload.cost} puntos).`);
  return json({ ok: true, reward, config: await getConfig(env) });
}

async function testChat(env) {
  await sendKickChat(env, "MinerBot conectado. Mensaje de prueba ✅");
  return json({ ok: true });
}

async function testTts(request, env) {
  const body = await readJson(request);
  const config = await getConfig(env);
  const text = String(body.text || "Prueba de texto a voz de MinerBot.").trim().slice(0, config.tts_max_chars);
  if (!text) return json({ error: "Escribí un texto de prueba." }, 400);
  const id = crypto.randomUUID();
  const audio = await createTtsAudio(env, text, config);
  await env.STREAMBOT_DB.prepare(
    "INSERT INTO streambot_tts_queue (id, username, text, char_count, audio, status) VALUES (?, ?, ?, ?, ?, 'ready')"
  ).bind(id, "MinerDesign", text, [...text].length, audio).run();
  await safeLog(env, "info", "tts-test", "MinerDesign", text);
  return json({ ok: true, id });
}

async function getLogs(env) {
  const result = await env.STREAMBOT_DB.prepare(
    "SELECT id, level, type, username, message, created_at FROM streambot_logs ORDER BY id DESC LIMIT 80"
  ).all();
  return json({ logs: result.results || [] });
}

async function handleWebhook(request, env, ctx) {
  const rawBody = await request.text();
  const valid = await verifyKickWebhook(request.headers, rawBody);
  if (!valid) return new Response("Invalid signature", { status: 401 });

  const messageId = request.headers.get("Kick-Event-Message-Id") || "";
  const eventType = request.headers.get("Kick-Event-Type") || "";
  const insert = await env.STREAMBOT_DB.prepare(
    "INSERT OR IGNORE INTO streambot_webhook_events (message_id, event_type) VALUES (?, ?)"
  ).bind(messageId, eventType).run();
  if (!insert.meta?.changes) return new Response("duplicate", { status: 200 });

  let payload;
  try { payload = JSON.parse(rawBody); }
  catch { return new Response("bad json", { status: 400 }); }

  ctx.waitUntil(processKickEvent(env, eventType, payload));
  return new Response("ok", { status: 200 });
}

async function processKickEvent(env, eventType, payload) {
  const config = await getConfig(env);
  if (!config.bot_enabled) return;

  try {
    if (eventType === "chat.message.sent") {
      const content = String(payload.content || "").trim();
      if (!content.startsWith("!")) return;
      const name = normalizeCommand(content.split(/\s+/)[0]);
      const command = await env.STREAMBOT_DB.prepare(
        "SELECT response FROM streambot_commands WHERE name=? COLLATE NOCASE AND enabled=1"
      ).bind(name).first();
      if (command?.response) {
        await sendKickChat(env, command.response);
        await safeLog(env, "info", "command", payload.sender?.username || null, `!${name}`);
      }
      return;
    }

    if (eventType === "channel.followed" && config.follows_enabled) {
      const username = payload.follower?.username || "viewer";
      await sendKickChat(env, template(config.follow_message, { user: username }));
      await safeLog(env, "info", "follow", username, "Follow recibido.");
      return;
    }

    if (eventType === "channel.subscription.new" && config.subs_enabled) {
      const username = payload.subscriber?.username || "viewer";
      await sendKickChat(env, template(config.sub_message, { user: username }));
      await safeLog(env, "info", "sub", username, "Nuevo sub.");
      return;
    }

    if (eventType === "channel.subscription.renewal" && config.renewals_enabled) {
      const username = payload.subscriber?.username || "viewer";
      await sendKickChat(env, template(config.renewal_message, { user: username }));
      await safeLog(env, "info", "renewal", username, "Renovación de sub.");
      return;
    }

    if (eventType === "channel.subscription.gifts" && config.gifts_enabled) {
      const username = payload.gifter?.username || "Anónimo";
      const count = Array.isArray(payload.giftees) ? payload.giftees.length : 1;
      await sendKickChat(env, template(config.gift_message, { user: username, count }));
      await safeLog(env, "info", "gift", username, `${count} subs regaladas.`);
      return;
    }

    if (eventType === "channel.reward.redemption.updated") {
      await processTtsRedemption(env, payload, config);
    }
  } catch (error) {
    await safeLog(env, "error", eventType, null, error?.message || String(error));
  }
}

async function processTtsRedemption(env, payload, config) {
  const rewardId = payload.reward?.id || "";
  if (!config.tts_reward_id || rewardId !== config.tts_reward_id) return;
  const redemptionId = payload.id;
  if (!redemptionId || payload.status === "rejected") return;

  const existing = await env.STREAMBOT_DB.prepare(
    "SELECT status FROM streambot_redemptions WHERE redemption_id=?"
  ).bind(redemptionId).first();
  if (existing?.status === "done" || existing?.status === "processing") return;

  await env.STREAMBOT_DB.prepare(
    "INSERT INTO streambot_redemptions (redemption_id, status) VALUES (?, 'processing') ON CONFLICT(redemption_id) DO UPDATE SET status='processing', updated_at=CURRENT_TIMESTAMP"
  ).bind(redemptionId).run();

  const username = payload.redeemer?.username || "viewer";
  const text = sanitizeTtsText(payload.user_input || "");
  const charCount = [...text].length;
  let rejectReason = "";

  if (!config.tts_enabled) rejectReason = "TTS está desactivado.";
  else if (!text) rejectReason = "Mensaje vacío.";
  else if (charCount > config.tts_max_chars) rejectReason = `Supera el límite de ${config.tts_max_chars} caracteres.`;
  else if (/https?:\/\/|www\./i.test(text)) rejectReason = "No se permiten links.";
  else {
    const today = new Date().toISOString().slice(0, 10);
    const used = await env.STREAMBOT_DB.prepare(
      "SELECT COALESCE(SUM(char_count),0) AS chars FROM streambot_tts_queue WHERE substr(created_at,1,10)=?"
    ).bind(today).first();
    if (Number(used?.chars || 0) + charCount > config.tts_daily_chars) rejectReason = "Se alcanzó el límite diario de TTS.";
  }

  if (rejectReason) {
    if (payload.status === "pending") await updateRedemptionState(env, redemptionId, "reject");
    await env.STREAMBOT_DB.prepare(
      "UPDATE streambot_redemptions SET status='rejected', reason=?, updated_at=CURRENT_TIMESTAMP WHERE redemption_id=?"
    ).bind(rejectReason, redemptionId).run();
    await safeLog(env, "warn", "tts-rejected", username, rejectReason);
    return;
  }

  try {
    const ttsId = crypto.randomUUID();
    const audio = await createTtsAudio(env, text, config);
    await env.STREAMBOT_DB.prepare(
      "INSERT INTO streambot_tts_queue (id, redemption_id, username, text, char_count, audio, status) VALUES (?, ?, ?, ?, ?, ?, 'ready')"
    ).bind(ttsId, redemptionId, username, text, charCount, audio).run();
    if (payload.status === "pending") await updateRedemptionState(env, redemptionId, "accept");
    await env.STREAMBOT_DB.prepare(
      "UPDATE streambot_redemptions SET status='done', reason=NULL, updated_at=CURRENT_TIMESTAMP WHERE redemption_id=?"
    ).bind(redemptionId).run();
    await safeLog(env, "info", "tts", username, text);
  } catch (error) {
    if (payload.status === "pending") {
      try { await updateRedemptionState(env, redemptionId, "reject"); } catch {}
    }
    await env.STREAMBOT_DB.prepare(
      "UPDATE streambot_redemptions SET status='failed', reason=?, updated_at=CURRENT_TIMESTAMP WHERE redemption_id=?"
    ).bind(error?.message || String(error), redemptionId).run();
    await safeLog(env, "error", "tts", username, `ElevenLabs falló: ${error?.message || error}`);
  }
}

async function createTtsAudio(env, text, config) {
  if (!env.ELEVENLABS_API_KEY) throw new Error("Falta ELEVENLABS_API_KEY.");
  const voiceId = String(config.tts_voice_id || DEFAULT_VOICE_ID).trim();
  const res = await fetch(`${ELEVEN_TTS}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: config.tts_model_id || "eleven_flash_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 400);
    throw new Error(`ElevenLabs ${res.status}: ${detail}`);
  }
  return res.arrayBuffer();
}

async function overlayNext(request, env) {
  const config = await getConfig(env);
  if (!checkOverlayKey(request, config)) return json({ error: "Overlay key inválida." }, 401);

  // Si OBS se cerró en medio de un audio, lo devolvemos a la cola después de 10 minutos.
  await env.STREAMBOT_DB.prepare(
    "UPDATE streambot_tts_queue SET status='ready', started_at=NULL WHERE status='playing' AND started_at < datetime('now','-10 minutes')"
  ).run();

  const candidate = await env.STREAMBOT_DB.prepare(
    "SELECT id, username, text FROM streambot_tts_queue WHERE status='ready' ORDER BY created_at ASC LIMIT 1"
  ).first();
  if (!candidate) return json({ item: null }, 200, { "Cache-Control": "no-store" });

  const claim = await env.STREAMBOT_DB.prepare(
    "UPDATE streambot_tts_queue SET status='playing', started_at=CURRENT_TIMESTAMP WHERE id=? AND status='ready'"
  ).bind(candidate.id).run();
  if (!claim.meta?.changes) return json({ item: null }, 200, { "Cache-Control": "no-store" });

  return json({
    item: {
      id: candidate.id,
      username: candidate.username,
      text: candidate.text,
      audioUrl: `/api/streambot/overlay/audio/${encodeURIComponent(candidate.id)}?key=${encodeURIComponent(config.overlay_key)}`,
      volume: config.tts_volume,
    },
  }, 200, { "Cache-Control": "no-store" });
}

async function overlayAudio(request, env) {
  const config = await getConfig(env);
  if (!checkOverlayKey(request, config)) return new Response("Unauthorized", { status: 401 });
  const id = new URL(request.url).pathname.split("/").pop();
  const row = await env.STREAMBOT_DB.prepare("SELECT audio FROM streambot_tts_queue WHERE id=?").bind(id).first();
  if (!row) return new Response("Not found", { status: 404 });
  if (!row.audio) return new Response("Audio unavailable", { status: 410 });
  const bytes = row.audio instanceof ArrayBuffer ? new Uint8Array(row.audio) : new Uint8Array(row.audio);
  return new Response(bytes, { status: 200, headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}

async function overlayComplete(request, env) {
  const config = await getConfig(env);
  if (!checkOverlayKey(request, config)) return json({ error: "Overlay key inválida." }, 401);
  const body = await readJson(request);
  await env.STREAMBOT_DB.prepare(
    "UPDATE streambot_tts_queue SET status='done', audio=NULL, completed_at=CURRENT_TIMESTAMP WHERE id=?"
  ).bind(String(body.id || "")).run();
  return json({ ok: true });
}

async function updateRedemptionState(env, redemptionId, action) {
  const access = await getKickAccessToken(env);
  const res = await kickFetchRaw(`/channels/rewards/redemptions/${action}`, access, {
    method: "POST",
    body: JSON.stringify({ ids: [redemptionId] }),
  });
  await parseApiResponse(res, `${action === "accept" ? "Aceptar" : "Rechazar"} TTS`);
}

async function sendKickChat(env, content) {
  const clean = String(content || "").trim().slice(0, 500);
  if (!clean) return;
  const access = await getKickAccessToken(env);
  const res = await kickFetchRaw("/chat", access, {
    method: "POST",
    body: JSON.stringify({ type: "bot", content: clean }),
  });
  await parseApiResponse(res, "Enviar mensaje al chat");
}

async function getKickAccessToken(env) {
  assertKickSecrets(env);
  let row = await env.STREAMBOT_DB.prepare(
    "SELECT access_token, refresh_token, expires_at, scope FROM streambot_oauth_tokens WHERE provider='kick'"
  ).first();
  if (!row) throw new Error("Kick no está conectado. Entrá al dashboard y conectá tu cuenta.");
  if (Number(row.expires_at) > Date.now() + 60_000) return row.access_token;
  if (!row.refresh_token) throw new Error("El token de Kick expiró y no hay refresh token.");

  const form = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env.KICK_CLIENT_ID,
    client_secret: env.KICK_CLIENT_SECRET,
    refresh_token: row.refresh_token,
  });
  const res = await fetch(`${KICK_OAUTH}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const token = await parseApiResponse(res, "Renovar token Kick");
  await saveKickToken(env, token);
  return token.access_token;
}

async function saveKickToken(env, token) {
  const expiresAt = Date.now() + Math.max(60, Number(token.expires_in || 3600)) * 1000;
  await env.STREAMBOT_DB.prepare(`
    INSERT INTO streambot_oauth_tokens (provider, access_token, refresh_token, expires_at, scope, updated_at)
    VALUES ('kick', ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(provider) DO UPDATE SET
      access_token=excluded.access_token,
      refresh_token=COALESCE(excluded.refresh_token, streambot_oauth_tokens.refresh_token),
      expires_at=excluded.expires_at,
      scope=excluded.scope,
      updated_at=CURRENT_TIMESTAMP
  `).bind(token.access_token, token.refresh_token || null, expiresAt, token.scope || "").run();
}

async function kickFetchRaw(path, accessToken, init = {}) {
  return fetch(`${KICK_API}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function parseApiResponse(response, label) {
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`${label} falló (${response.status}): ${data.message || data.error || text.slice(0, 300)}`);
  return data;
}

async function verifyKickWebhook(headers, rawBody) {
  const messageId = headers.get("Kick-Event-Message-Id");
  const timestamp = headers.get("Kick-Event-Message-Timestamp");
  const signature = headers.get("Kick-Event-Signature");
  if (!messageId || !timestamp || !signature) return false;
  const signed = `${messageId}.${timestamp}.${rawBody}`;
  const publicKey = await importRsaPublicKey(KICK_PUBLIC_KEY_PEM);
  return crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    publicKey,
    base64ToBytes(signature),
    new TextEncoder().encode(signed)
  );
}

async function importRsaPublicKey(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return crypto.subtle.importKey(
    "spki",
    base64ToBytes(b64),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

function checkOverlayKey(request, config) {
  const supplied = new URL(request.url).searchParams.get("key") || "";
  return Boolean(config.overlay_key) && constantTimeEqual(supplied, config.overlay_key);
}

async function getSetting(env, key) {
  const row = await env.STREAMBOT_DB.prepare("SELECT value FROM streambot_settings WHERE key=?").bind(key).first();
  return row?.value ?? "";
}

async function setSetting(env, key, value) {
  await env.STREAMBOT_DB.prepare(`
    INSERT INTO streambot_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
  `).bind(key, String(value)).run();
}

async function safeLog(env, level, type, username, message) {
  try {
    await env.STREAMBOT_DB.prepare(
      "INSERT INTO streambot_logs (level, type, username, message) VALUES (?, ?, ?, ?)"
    ).bind(level, type, username, String(message).slice(0, 1000)).run();
    await env.STREAMBOT_DB.prepare(
      "DELETE FROM streambot_logs WHERE id NOT IN (SELECT id FROM streambot_logs ORDER BY id DESC LIMIT 500)"
    ).run();
  } catch {}
}

function assertKickSecrets(env) {
  if (!env.KICK_CLIENT_ID || !env.KICK_CLIENT_SECRET) throw new Error("Faltan KICK_CLIENT_ID / KICK_CLIENT_SECRET en Cloudflare Secrets.");
}

function normalizeCommand(value) {
  return String(value || "").trim().toLowerCase().replace(/^!+/, "").replace(/[^a-z0-9_-]/g, "").slice(0, 40);
}

function template(value, vars) {
  let output = String(value || "");
  for (const [key, replacement] of Object.entries(vars)) output = output.replaceAll(`{${key}}`, String(replacement));
  return output;
}

function sanitizeTtsText(value) {
  return String(value || "")
    .replace(/\[emote:[^\]]+\]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function randomToken(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return bytesToBase64Url(data);
}

async function sha256Base64Url(value) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(hash));
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64ToBytes(base64) {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function constantTimeEqual(a, b) {
  a = String(a || ""); b = String(b || "");
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}


async function readJson(request) {
  try { return await request.json(); }
  catch { return {}; }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders },
  });
}

function htmlMessage(message, status = 200) {
  return new Response(`<!doctype html><meta charset="utf-8"><title>MinerBot</title><style>body{font:16px system-ui;background:#111;color:#fff;padding:40px}a{color:#53fc18}</style><p>${escapeHtml(message)}</p><p><a href="/streambot.html">Volver al dashboard</a></p>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}
