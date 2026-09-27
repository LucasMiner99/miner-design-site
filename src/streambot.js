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
  title_command_enabled: true,
  title_command_name: "titulo",
  title_command_mods_allowed: true,
  game_command_enabled: true,
  game_command_name: "juego",
  game_command_mods_allowed: true,
  stream_command_confirm: true,
  tts_enabled: true,
  tts_max_chars: 140,
  tts_daily_chars: 4000,
  tts_model_id: "eleven_flash_v2_5",
  tts_volume: 0.85,
  mod_control_enabled: true,

  // Voz 1 conserva las keys originales para migrar sin tocar D1 ni perder
  // la recompensa que ya existe en Kick.
  tts_voice_1_enabled: true,
  tts_reward_title: "🔊 TTS",
  tts_reward_cost: 2500,
  tts_voice_id: DEFAULT_VOICE_ID,
  tts_reward_id: "",

  // Voces 2-4 se guardan como settings normales en la misma tabla existente.
  tts_voice_2_enabled: false,
  tts_voice_2_title: "🔊 TTS Voz 2",
  tts_voice_2_cost: 3000,
  tts_voice_2_voice_id: DEFAULT_VOICE_ID,
  tts_voice_2_reward_id: "",
  tts_voice_3_enabled: false,
  tts_voice_3_title: "🔊 TTS Voz 3",
  tts_voice_3_cost: 3500,
  tts_voice_3_voice_id: DEFAULT_VOICE_ID,
  tts_voice_3_reward_id: "",
  tts_voice_4_enabled: false,
  tts_voice_4_title: "🔊 TTS Voz 4",
  tts_voice_4_cost: 4000,
  tts_voice_4_voice_id: DEFAULT_VOICE_ID,
  tts_voice_4_reward_id: "",
  overlay_key: "",
  kick_user_id: "",
  kick_username: "",
};

const TTS_VOICE_SLOTS = [1, 2, 3, 4];

function getTtsVoice(config, slot) {
  const n = Number(slot);
  if (n === 1) {
    return {
      slot: 1,
      enabled: Boolean(config.tts_voice_1_enabled),
      title: String(config.tts_reward_title || "🔊 TTS"),
      cost: Math.max(1, Number(config.tts_reward_cost) || 1),
      voiceId: String(config.tts_voice_id ?? DEFAULT_VOICE_ID).trim(),
      rewardId: String(config.tts_reward_id || "").trim(),
      rewardSettingKey: "tts_reward_id",
    };
  }
  const prefix = `tts_voice_${n}_`;
  return {
    slot: n,
    enabled: Boolean(config[`${prefix}enabled`]),
    title: String(config[`${prefix}title`] || `🔊 TTS Voz ${n}`),
    cost: Math.max(1, Number(config[`${prefix}cost`]) || 1),
    voiceId: String(config[`${prefix}voice_id`] ?? DEFAULT_VOICE_ID).trim(),
    rewardId: String(config[`${prefix}reward_id`] || "").trim(),
    rewardSettingKey: `${prefix}reward_id`,
  };
}

function getTtsVoices(config) {
  return TTS_VOICE_SLOTS.map((slot) => getTtsVoice(config, slot));
}

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
      return await handleWebhook(request, env, ctx);
    }

    if (path === "/api/streambot/oauth/callback" && request.method === "GET") {
      return await oauthCallback(request, env);
    }

    if (path === "/api/streambot/overlay/next" && request.method === "GET") {
      return await overlayNext(request, env);
    }
    if (path === "/api/streambot/overlay/complete" && request.method === "POST") {
      return await overlayComplete(request, env);
    }
    if (path.startsWith("/api/streambot/overlay/audio/") && request.method === "GET") {
      return await overlayAudio(request, env);
    }
    if (path === "/api/streambot/overlay/media-state" && request.method === "GET") {
      return await overlayMediaState(request, env);
    }
    if (path === "/api/streambot/overlay/media/complete" && request.method === "POST") {
      return await overlayMediaComplete(request, env);
    }
    if (path.startsWith("/api/streambot/overlay/media-file/") && request.method === "GET") {
      return await overlayMediaFile(request, env);
    }
    if (path === "/api/streambot/realtime/ws" && request.method === "GET") {
      return await handleRealtimeWebSocket(request, env);
    }

    if (path.startsWith("/api/streambot/mod/")) {
      return await handleModApi(request, env);
    }

    const adminError = requireAdmin(request, env);
    if (adminError) return adminError;

    if (path === "/api/streambot/bootstrap" && request.method === "GET") {
      return await getBootstrap(request, env);
    }
    if (path === "/api/streambot/status" && request.method === "GET") {
      return await getStatus(request, env);
    }
    if (path === "/api/streambot/config" && request.method === "GET") {
      return json({ config: await getConfig(env) });
    }
    if (path === "/api/streambot/config" && request.method === "PUT") {
      return await updateConfig(request, env);
    }
    if (path === "/api/streambot/commands" && request.method === "GET") {
      return await listCommands(env);
    }
    if (path === "/api/streambot/commands" && request.method === "POST") {
      return await createCommand(request, env);
    }
    if (path.startsWith("/api/streambot/commands/") && request.method === "PUT") {
      return await updateCommand(request, env);
    }
    if (path.startsWith("/api/streambot/commands/") && request.method === "DELETE") {
      return await deleteCommand(request, env);
    }
    if (path === "/api/streambot/oauth/start" && request.method === "GET") {
      return await oauthStart(request, env);
    }
    if (path === "/api/streambot/events/sync" && request.method === "POST") {
      return await syncEvents(request, env);
    }
    if (path === "/api/streambot/reward/sync" && request.method === "POST") {
      return await syncReward(request, env);
    }
    if (path === "/api/streambot/test/chat" && request.method === "POST") {
      return await testChat(env);
    }
    if (path === "/api/streambot/test/tts" && request.method === "POST") {
      return await testTts(request, env);
    }
    if (path === "/api/streambot/logs" && request.method === "GET") {
      return await getLogs(env);
    }
    if (path === "/api/streambot/mods" && request.method === "GET") {
      return await adminListMods(env);
    }
    if (path === "/api/streambot/mods" && request.method === "POST") {
      return await adminCreateMod(request, env);
    }
    if (path.startsWith("/api/streambot/mods/") && request.method === "PUT") {
      return await adminUpdateMod(request, env);
    }
    if (path.startsWith("/api/streambot/mods/") && request.method === "DELETE") {
      return await adminDeleteMod(request, env);
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
    const status = Number(error?.status);
    return json({ error: error?.message || "Error interno de StreamBot." }, Number.isInteger(status) && status >= 400 && status < 600 ? status : 500);
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
  const current = await getConfig(env);
  const nextTitleCommand = normalizeCommand(
    "title_command_name" in incoming ? incoming.title_command_name : current.title_command_name
  ) || "titulo";
  const nextGameCommand = normalizeCommand(
    "game_command_name" in incoming ? incoming.game_command_name : current.game_command_name
  ) || "juego";
  if (nextTitleCommand === nextGameCommand) {
    return json({ error: "!titulo y !juego no pueden tener el mismo nombre." }, 400);
  }

  incoming.title_command_name = nextTitleCommand;
  incoming.game_command_name = nextGameCommand;

  const protectedKeys = new Set([
    "tts_reward_id", "tts_voice_2_reward_id", "tts_voice_3_reward_id", "tts_voice_4_reward_id",
    "overlay_key", "kick_user_id", "kick_username"
  ]);
  const allowed = Object.keys(DEFAULT_CONFIG).filter((key) => !protectedKeys.has(key));
  const positiveIntegerKeys = new Set([
    "tts_reward_cost", "tts_voice_2_cost", "tts_voice_3_cost", "tts_voice_4_cost",
    "tts_max_chars", "tts_daily_chars"
  ]);
  for (const key of allowed) {
    if (!(key in incoming)) continue;
    let value = incoming[key];
    if (positiveIntegerKeys.has(key)) value = Math.max(1, Math.round(Number(value) || 1));
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
  auth.searchParams.set("scope", "user:read channel:read channel:write channel:rewards:write chat:write events:subscribe");
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

  const adminState = await env.STREAMBOT_DB.prepare(
    "SELECT state, code_verifier, redirect_uri, expires_at FROM streambot_oauth_states WHERE state=?"
  ).bind(state).first();

  if (adminState) {
    if (adminState.expires_at < Date.now()) return htmlMessage("El login expiró. Volvé al dashboard e intentá otra vez.", 400);
    await env.STREAMBOT_DB.prepare("DELETE FROM streambot_oauth_states WHERE state=?").bind(state).run();
    const token = await exchangeKickCode(env, code, adminState);
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

  let modState = null;
  try {
    modState = await env.STREAMBOT_DB.prepare(
      "SELECT state, code_verifier, redirect_uri, expires_at FROM streambot_mod_oauth_states WHERE state=?"
    ).bind(state).first();
  } catch {
    return htmlMessage("No encontré ese login. Si es el panel de mods, ejecutá primero la migración v9 de D1.", 400, "/control.html");
  }

  if (!modState) return htmlMessage("Login inválido o ya utilizado.", 400, "/control.html");
  if (modState.expires_at < Date.now()) return htmlMessage("El login expiró. Volvé al panel de control e intentá otra vez.", 400, "/control.html");
  await env.STREAMBOT_DB.prepare("DELETE FROM streambot_mod_oauth_states WHERE state=?").bind(state).run();

  const token = await exchangeKickCode(env, code, modState);
  return await finishModLogin(request, env, token.access_token);
}

async function exchangeKickCode(env, code, stateRow) {
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: env.KICK_CLIENT_ID,
    client_secret: env.KICK_CLIENT_SECRET,
    redirect_uri: stateRow.redirect_uri,
    code_verifier: stateRow.code_verifier,
    code,
  });
  const tokenRes = await fetch(`${KICK_OAUTH}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  return parseApiResponse(tokenRes, "Kick OAuth");
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
      rewardConfigured: getTtsVoices(config).some((voice) => Boolean(voice.rewardId)),
      rewardConfiguredCount: getTtsVoices(config).filter((voice) => Boolean(voice.rewardId)).length,
      overlayUrl: `${new URL(request.url).origin}/tts-overlay.html?key=${encodeURIComponent(config.overlay_key)}`,
      controlUrl: `${new URL(request.url).origin}/control.html`,
      mediaReady: Boolean(env.STREAMBOT_MEDIA),
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
    rewardConfigured: getTtsVoices(config).some((voice) => Boolean(voice.rewardId)),
    rewardConfiguredCount: getTtsVoices(config).filter((voice) => Boolean(voice.rewardId)).length,
    overlayUrl: `${new URL(request.url).origin}/tts-overlay.html?key=${encodeURIComponent(config.overlay_key)}`,
    controlUrl: `${new URL(request.url).origin}/control.html`,
    mediaReady: Boolean(env.STREAMBOT_MEDIA),
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
  const requestedSlot = Number(new URL(request.url).searchParams.get("slot") || 0);
  if (requestedSlot && !TTS_VOICE_SLOTS.includes(requestedSlot)) {
    return json({ error: "Voz TTS inválida." }, 400);
  }

  const slots = requestedSlot ? [requestedSlot] : TTS_VOICE_SLOTS;
  const synced = [];

  for (const slot of slots) {
    const voice = getTtsVoice(config, slot);

    // No creamos recompensas apagadas que todavía no existen. Si ya existe una,
    // sí la actualizamos para que Kick también la deje desactivada.
    if (!voice.enabled && !voice.rewardId) {
      synced.push({ slot, skipped: true, reason: "disabled" });
      continue;
    }

    const payload = {
      title: String(voice.title || `🔊 TTS Voz ${slot}`).slice(0, 50),
      description: `Escribí el mensaje que querés escuchar en stream (máx. ${config.tts_max_chars} caracteres).`,
      cost: voice.cost,
      is_enabled: Boolean(config.tts_enabled && voice.enabled),
      is_user_input_required: true,
      should_redemptions_skip_request_queue: false,
      background_color: "#53FC18",
    };

    let reward;
    if (voice.rewardId) {
      const res = await kickFetchRaw(`/channels/rewards/${encodeURIComponent(voice.rewardId)}`, access, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse(res, `Actualizar recompensa TTS voz ${slot}`);
      reward = data.data;
    } else {
      const res = await kickFetchRaw("/channels/rewards", access, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse(res, `Crear recompensa TTS voz ${slot}`);
      reward = data.data;
      await setSetting(env, voice.rewardSettingKey, reward?.id || "");
    }

    synced.push({ slot, reward });
    await safeLog(env, "info", "reward", null, `TTS voz ${slot} sincronizada (${payload.cost} puntos).`);
  }

  return json({ ok: true, synced, config: await getConfig(env) });
}

async function testChat(env) {
  await sendKickChat(env, "MinerBot conectado. Mensaje de prueba ✅");
  return json({ ok: true });
}

async function testTts(request, env) {
  const body = await readJson(request);
  const config = await getConfig(env);
  const slot = TTS_VOICE_SLOTS.includes(Number(body.slot)) ? Number(body.slot) : 1;
  const voice = getTtsVoice(config, slot);
  const text = String(body.text || "Prueba de texto a voz de MinerBot.").trim().slice(0, config.tts_max_chars);
  if (!text) return json({ error: "Escribí un texto de prueba." }, 400);
  if (!voice.voiceId) return json({ error: `Falta el ElevenLabs Voice ID de la voz ${slot}.` }, 400);
  const id = crypto.randomUUID();
  const audio = await createTtsAudio(env, text, config, voice.voiceId);
  await env.STREAMBOT_DB.prepare(
    "INSERT INTO streambot_tts_queue (id, username, text, char_count, audio, status) VALUES (?, ?, ?, ?, ?, 'ready')"
  ).bind(id, "MinerDesign", text, [...text].length, audio).run();
  await safeLog(env, "info", "tts-test", "MinerDesign", `Voz ${slot}: ${text}`);
  await realtimeBroadcast(env, { type: "tts.available" }, "overlay");
  return json({ ok: true, id, slot });
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

      // Comandos del stream configurables desde el dashboard.
      const commandMatch = content.match(/^!([^\s]+)(?:\s+([\s\S]+))?$/);
      if (commandMatch) {
        const invoked = normalizeCommand(commandMatch[1]);
        const titleCommand = normalizeCommand(config.title_command_name || "titulo");
        const gameCommand = normalizeCommand(config.game_command_name || "juego");

        let action = null;
        let modsAllowed = false;
        if (config.title_command_enabled && invoked === titleCommand) {
          action = "titulo";
          modsAllowed = Boolean(config.title_command_mods_allowed);
        } else if (config.game_command_enabled && invoked === gameCommand) {
          action = "juego";
          modsAllowed = Boolean(config.game_command_mods_allowed);
        }

        if (action) {
          const sender = payload.sender || {};
          if (!canUseStreamCommand(sender, config, modsAllowed)) {
            await safeLog(env, "warn", "admin-command-denied", sender.username || null, `!${invoked}`);
            return;
          }

          const value = String(commandMatch[2] || "").trim();
          if (!value) {
            await sendKickChat(env, action === "titulo"
              ? `Uso: !${titleCommand} <nuevo título>`
              : `Uso: !${gameCommand} <categoría>`);
            return;
          }

          if (action === "titulo") {
            await updateStreamTitle(env, value);
            if (config.stream_command_confirm) await sendKickChat(env, `✅ Título actualizado: ${value}`);
            await safeLog(env, "info", "stream-title", sender.username || null, value);
            return;
          }

          const category = await findKickCategory(env, value);
          if (!category) {
            await sendKickChat(env, `No encontré la categoría "${value}" en Kick.`);
            await safeLog(env, "warn", "stream-category-not-found", sender.username || null, value);
            return;
          }
          await updateStreamCategory(env, category.id);
          if (config.stream_command_confirm) await sendKickChat(env, `✅ Categoría actualizada: ${category.name}`);
          await safeLog(env, "info", "stream-category", sender.username || null, `${category.name} (${category.id})`);
          return;
        }
      }

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

function isBroadcaster(sender, config) {
  const senderId = Number(sender?.user_id || 0);
  const broadcasterId = Number(config?.kick_user_id || 0);
  return senderId > 0 && broadcasterId > 0 && senderId === broadcasterId;
}

function isModerator(sender) {
  const badges = Array.isArray(sender?.identity?.badges) ? sender.identity.badges : [];
  return badges.some((badge) => String(badge?.type || "").toLowerCase() === "moderator");
}

function canUseStreamCommand(sender, config, modsAllowed) {
  if (isBroadcaster(sender, config)) return true;
  return Boolean(modsAllowed) && isModerator(sender);
}

async function updateStreamTitle(env, title) {
  const clean = String(title || "").trim();
  if (!clean) throw new Error("El título no puede estar vacío.");

  const access = await getKickAccessToken(env);
  const res = await kickFetchRaw("/channels", access, {
    method: "PATCH",
    body: JSON.stringify({ stream_title: clean }),
  });
  await parseApiResponse(res, "Cambiar título");
}

async function updateStreamCategory(env, categoryId) {
  const id = Number(categoryId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Category ID inválido.");

  const access = await getKickAccessToken(env);
  const res = await kickFetchRaw("/channels", access, {
    method: "PATCH",
    body: JSON.stringify({ category_id: id }),
  });
  await parseApiResponse(res, "Cambiar categoría");
}

async function findKickCategory(env, query) {
  const clean = String(query || "").trim();
  if (!clean) return null;

  const access = await getKickAccessToken(env);

  // API V2 actual: primero intentamos buscar por nombre.
  const v2Url = new URL("https://api.kick.com/public/v2/categories");
  v2Url.searchParams.set("name", clean);
  v2Url.searchParams.set("limit", "25");
  let res = await fetch(v2Url.toString(), {
    headers: {
      "Authorization": `Bearer ${access}`,
      "Accept": "application/json",
    },
  });
  let data = await parseApiResponse(res, "Buscar categoría Kick");
  let categories = Array.isArray(data?.data) ? data.data : [];

  // V2 puede ser más estricto con el nombre. Como fallback usamos el buscador
  // V1 mientras siga disponible para aceptar búsquedas parciales como "mine".
  if (!categories.length) {
    const v1Url = new URL(`${KICK_API}/categories`);
    v1Url.searchParams.set("q", clean);
    res = await fetch(v1Url.toString(), {
      headers: {
        "Authorization": `Bearer ${access}`,
        "Accept": "application/json",
      },
    });
    data = await parseApiResponse(res, "Buscar categoría Kick");
    categories = Array.isArray(data?.data) ? data.data : [];
  }

  if (!categories.length) return null;

  const needle = clean.toLocaleLowerCase("es");
  const exact = categories.find((category) => String(category?.name || "").toLocaleLowerCase("es") === needle);
  if (exact) return exact;

  const starts = categories.find((category) => String(category?.name || "").toLocaleLowerCase("es").startsWith(needle));
  if (starts) return starts;

  return categories[0];
}

async function processTtsRedemption(env, payload, config) {
  const rewardId = String(payload.reward?.id || "");
  const voice = getTtsVoices(config).find((candidate) => candidate.rewardId && candidate.rewardId === rewardId);
  if (!voice) return;

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
  else if (!voice.enabled) rejectReason = "Esta voz TTS está desactivada.";
  else if (!voice.voiceId) rejectReason = "Esta voz TTS no tiene Voice ID configurado.";
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
    await safeLog(env, "warn", "tts-rejected", username, `Voz ${voice.slot}: ${rejectReason}`);
    return;
  }

  try {
    const ttsId = crypto.randomUUID();
    const audio = await createTtsAudio(env, text, config, voice.voiceId);
    await env.STREAMBOT_DB.prepare(
      "INSERT INTO streambot_tts_queue (id, redemption_id, username, text, char_count, audio, status) VALUES (?, ?, ?, ?, ?, ?, 'ready')"
    ).bind(ttsId, redemptionId, username, text, charCount, audio).run();
    if (payload.status === "pending") await updateRedemptionState(env, redemptionId, "accept");
    await env.STREAMBOT_DB.prepare(
      "UPDATE streambot_redemptions SET status='done', reason=NULL, updated_at=CURRENT_TIMESTAMP WHERE redemption_id=?"
    ).bind(redemptionId).run();
    await safeLog(env, "info", "tts", username, `${voice.title}: ${text}`);
    await realtimeBroadcast(env, { type: "tts.available" }, "overlay");
  } catch (error) {
    if (payload.status === "pending") {
      try { await updateRedemptionState(env, redemptionId, "reject"); } catch {}
    }
    await env.STREAMBOT_DB.prepare(
      "UPDATE streambot_redemptions SET status='failed', reason=?, updated_at=CURRENT_TIMESTAMP WHERE redemption_id=?"
    ).bind(error?.message || String(error), redemptionId).run();
    await safeLog(env, "error", "tts", username, `Voz ${voice.slot} / ElevenLabs falló: ${error?.message || error}`);
  }
}

async function createTtsAudio(env, text, config, voiceIdOverride = "") {
  if (!env.ELEVENLABS_API_KEY) throw new Error("Falta ELEVENLABS_API_KEY.");
  const voiceId = String(voiceIdOverride || config.tts_voice_id || DEFAULT_VOICE_ID).trim();
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
    const raw = await res.text();
    let detail = raw;
    let code = "";
    try {
      const parsed = JSON.parse(raw);
      const info = parsed?.detail || parsed;
      detail = info?.message || parsed?.message || raw;
      code = info?.code || info?.status || "";
    } catch {}

    if (res.status === 402 && (code === "paid_plan_required" || /paid plan|free users cannot use library voices/i.test(detail))) {
      throw new Error("La voz elegida es de ElevenLabs Voice Library y el plan Free no permite usar esas voces por API. Usá una voz creada con Voice Design o pasá a un plan pago.");
    }

    throw new Error(`ElevenLabs ${res.status}: ${String(detail).slice(0, 300)}`);
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


// -----------------------------------------------------------------------------
// Realtime overlay channel (Durable Object + WebSockets)
// -----------------------------------------------------------------------------

async function handleRealtimeWebSocket(request, env) {
  if (!env.OVERLAY_ROOM) return json({ error: "Falta el binding Durable Object OVERLAY_ROOM." }, 503);
  if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 426 });
  }

  const url = new URL(request.url);
  const role = url.searchParams.get("role") === "control" ? "control" : "overlay";
  let username = "";

  if (role === "overlay") {
    const config = await getConfig(env);
    if (!checkOverlayKey(request, config)) return new Response("Unauthorized", { status: 401 });
  } else {
    const session = await getModSession(request, env);
    if (!session) return new Response("Unauthorized", { status: 401 });
    const config = await getConfig(env);
    const allowed = session.isOwner || (config.mod_control_enabled && session.canControl);
    if (!allowed) return new Response("Forbidden", { status: 403 });
    username = session.username;
  }

  const headers = new Headers(request.headers);
  headers.set("X-Miner-Role", role);
  headers.set("X-Miner-User", username);
  const forwarded = new Request(request, { headers });
  return env.OVERLAY_ROOM.getByName("global").fetch(forwarded);
}

async function realtimeBroadcast(env, event, target = "all") {
  if (!env.OVERLAY_ROOM) return;
  try {
    const stub = env.OVERLAY_ROOM.getByName("global");
    await stub.fetch("https://overlay-room.internal/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Miner-Target": target },
      body: JSON.stringify(event),
    });
  } catch {}
}

// -----------------------------------------------------------------------------
// Remote overlay control (Kick login + allowlist + R2 media library)
// -----------------------------------------------------------------------------

async function handleModApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/streambot/mod/oauth/start" && request.method === "GET") {
    return modOauthStart(request, env);
  }
  if (path === "/api/streambot/mod/logout" && request.method === "POST") {
    return modLogout(request, env);
  }

  const session = await getModSession(request, env);
  if (!session) return json({ error: "Iniciá sesión con Kick." }, 401);

  const config = await getConfig(env);
  const controlAllowed = session.isOwner || config.mod_control_enabled;

  if (path === "/api/streambot/mod/me" && request.method === "GET") {
    return json({ me: publicModSession(session), controlEnabled: Boolean(config.mod_control_enabled), mediaReady: Boolean(env.STREAMBOT_MEDIA) });
  }

  if (!controlAllowed) return json({ error: "El control remoto de moderadores está pausado por MinerDesign." }, 423);

  if (path === "/api/streambot/mod/bootstrap" && request.method === "GET") {
    return modBootstrap(env, session, config);
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const originError = requireSameOrigin(request);
    if (originError) return originError;
  }

  if (path === "/api/streambot/mod/assets" && request.method === "POST") {
    requireModPermission(session, "upload");
    return modUploadAsset(request, env, session);
  }
  if (path.startsWith("/api/streambot/mod/assets/") && path.endsWith("/file") && request.method === "GET") {
    const id = path.split("/").at(-2);
    return modServeAsset(request, env, session, id);
  }
  if (path.startsWith("/api/streambot/mod/assets/") && request.method === "DELETE") {
    requireModPermission(session, "delete");
    const id = path.split("/").pop();
    return modDeleteAsset(env, session, id);
  }
  if (path === "/api/streambot/mod/items" && request.method === "POST") {
    requireModPermission(session, "control");
    return modCreateItem(request, env, session);
  }
  if (path.startsWith("/api/streambot/mod/items/") && path.endsWith("/show") && request.method === "POST") {
    requireModPermission(session, "control");
    const id = path.split("/").at(-2);
    return modShowItem(request, env, session, id);
  }
  if (path.startsWith("/api/streambot/mod/items/") && path.endsWith("/hide") && request.method === "POST") {
    requireModPermission(session, "control");
    const id = path.split("/").at(-2);
    return modHideItem(env, session, id);
  }
  if (path.startsWith("/api/streambot/mod/items/") && request.method === "PATCH") {
    requireModPermission(session, "control");
    const id = path.split("/").pop();
    return modUpdateItem(request, env, session, id);
  }
  if (path.startsWith("/api/streambot/mod/items/") && request.method === "DELETE") {
    requireModPermission(session, "control");
    const id = path.split("/").pop();
    return modDeleteItem(env, session, id);
  }
  if (path === "/api/streambot/mod/clear" && request.method === "POST") {
    requireModPermission(session, "control");
    await env.STREAMBOT_DB.prepare("UPDATE streambot_overlay_items SET visible=0, visible_until=NULL, updated_at=CURRENT_TIMESTAMP").run();
    await safeLog(env, "info", "overlay-clear", session.username, "Ocultó todos los elementos del overlay.");
    await realtimeBroadcast(env, { type: "scene.refresh" }, "all");
    return json({ ok: true });
  }

  return json({ error: "Ruta de control no encontrada." }, 404);
}

async function modOauthStart(request, env) {
  assertKickSecrets(env);
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/streambot/oauth/callback`;
  const state = randomToken(24);
  const verifier = randomToken(48);
  const challenge = await sha256Base64Url(verifier);
  const expiresAt = Date.now() + 10 * 60 * 1000;

  await env.STREAMBOT_DB.prepare("DELETE FROM streambot_mod_oauth_states WHERE expires_at < ?").bind(Date.now()).run();
  await env.STREAMBOT_DB.prepare(
    "INSERT INTO streambot_mod_oauth_states (state, code_verifier, redirect_uri, expires_at) VALUES (?, ?, ?, ?)"
  ).bind(state, verifier, redirectUri, expiresAt).run();

  const auth = new URL(`${KICK_OAUTH}/oauth/authorize`);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("client_id", env.KICK_CLIENT_ID);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("scope", "user:read");
  auth.searchParams.set("state", state);
  auth.searchParams.set("code_challenge", challenge);
  auth.searchParams.set("code_challenge_method", "S256");
  if (new URL(request.url).searchParams.get("json") === "1") return json({ url: auth.toString() });
  return Response.redirect(auth.toString(), 302);
}

async function finishModLogin(request, env, accessToken) {
  const userRes = await kickFetchRaw("/users", accessToken);
  const userJson = await parseApiResponse(userRes, "Kick /users");
  const user = Array.isArray(userJson.data) ? userJson.data[0] : userJson.data;
  const userId = String(user?.user_id || "");
  const username = String(user?.name || user?.username || "").trim();
  if (!userId || !username) return htmlMessage("Kick no devolvió tu usuario.", 400, "/control.html");

  const config = await getConfig(env);
  const isOwner = userId === String(config.kick_user_id || "");
  let mod = await env.STREAMBOT_DB.prepare(
    "SELECT * FROM streambot_mod_users WHERE kick_user_id=? OR username=? COLLATE NOCASE LIMIT 1"
  ).bind(userId, username).first();

  if (isOwner) {
    if (mod) {
      await env.STREAMBOT_DB.prepare(`
        UPDATE streambot_mod_users SET kick_user_id=?, username=?, active=1, can_control=1, can_upload=1, can_delete=1, is_owner=1, updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).bind(userId, username, mod.id).run();
    } else {
      await env.STREAMBOT_DB.prepare(`
        INSERT INTO streambot_mod_users (kick_user_id, username, active, can_control, can_upload, can_delete, is_owner)
        VALUES (?, ?, 1, 1, 1, 1, 1)
      `).bind(userId, username).run();
    }
    mod = await env.STREAMBOT_DB.prepare("SELECT * FROM streambot_mod_users WHERE kick_user_id=? LIMIT 1").bind(userId).first();
  } else {
    if (!mod || !Number(mod.active)) {
      await safeLog(env, "warn", "mod-login-denied", username, "Intentó entrar al control remoto sin estar autorizado.");
      return Response.redirect(`${new URL(request.url).origin}/control.html?denied=1`, 302);
    }
    if (mod.kick_user_id && String(mod.kick_user_id) !== userId) {
      await safeLog(env, "warn", "mod-login-denied", username, "El username coincide pero el Kick user ID no.");
      return Response.redirect(`${new URL(request.url).origin}/control.html?denied=1`, 302);
    }
    await env.STREAMBOT_DB.prepare(
      "UPDATE streambot_mod_users SET kick_user_id=?, username=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(userId, username, mod.id).run();
    mod = await env.STREAMBOT_DB.prepare("SELECT * FROM streambot_mod_users WHERE id=?").bind(mod.id).first();
  }

  const rawToken = randomToken(36);
  const tokenHash = await sha256Base64Url(rawToken);
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  await env.STREAMBOT_DB.prepare("DELETE FROM streambot_mod_sessions WHERE expires_at < ?").bind(Date.now()).run();
  await env.STREAMBOT_DB.prepare(
    "INSERT INTO streambot_mod_sessions (token_hash, mod_id, expires_at) VALUES (?, ?, ?)"
  ).bind(tokenHash, mod.id, expiresAt).run();

  await safeLog(env, "info", "mod-login", username, isOwner ? "Owner inició sesión en Overlay Control." : "Moderador inició sesión en Overlay Control.");
  return new Response(null, {
    status: 302,
    headers: {
      "Location": `${new URL(request.url).origin}/control.html?connected=1`,
      "Set-Cookie": modSessionCookie(rawToken, 7 * 24 * 60 * 60),
      "Cache-Control": "no-store",
    },
  });
}

async function getModSession(request, env) {
  const raw = getCookie(request, "minerbot_mod_session");
  if (!raw) return null;
  const hash = await sha256Base64Url(raw);
  const row = await env.STREAMBOT_DB.prepare(`
    SELECT s.token_hash, s.expires_at, m.id, m.kick_user_id, m.username, m.active,
           m.can_control, m.can_upload, m.can_delete, m.is_owner
    FROM streambot_mod_sessions s
    JOIN streambot_mod_users m ON m.id=s.mod_id
    WHERE s.token_hash=? LIMIT 1
  `).bind(hash).first();
  if (!row || Number(row.expires_at) < Date.now() || !Number(row.active)) {
    if (row) await env.STREAMBOT_DB.prepare("DELETE FROM streambot_mod_sessions WHERE token_hash=?").bind(hash).run();
    return null;
  }
  return {
    tokenHash: hash,
    id: Number(row.id),
    kickUserId: String(row.kick_user_id || ""),
    username: String(row.username || ""),
    canControl: Boolean(row.can_control),
    canUpload: Boolean(row.can_upload),
    canDelete: Boolean(row.can_delete),
    isOwner: Boolean(row.is_owner),
  };
}

function publicModSession(session) {
  return {
    id: session.id,
    username: session.username,
    isOwner: session.isOwner,
    permissions: {
      control: session.isOwner || session.canControl,
      upload: session.isOwner || session.canUpload,
      delete: session.isOwner || session.canDelete,
    },
  };
}

function requireModPermission(session, permission) {
  const allowed = session.isOwner || (
    permission === "control" ? session.canControl :
    permission === "upload" ? session.canUpload :
    permission === "delete" ? session.canDelete : false
  );
  if (!allowed) {
    const error = new Error("No tenés permiso para hacer eso.");
    error.status = 403;
    throw error;
  }
}

async function modLogout(request, env) {
  const raw = getCookie(request, "minerbot_mod_session");
  if (raw) {
    const hash = await sha256Base64Url(raw);
    try { await env.STREAMBOT_DB.prepare("DELETE FROM streambot_mod_sessions WHERE token_hash=?").bind(hash).run(); } catch {}
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": "minerbot_mod_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}

async function modBootstrap(env, session, config) {
  const [assetsResult, itemsResult] = await env.STREAMBOT_DB.batch([
    env.STREAMBOT_DB.prepare(`
      SELECT id, name, mime_type, media_type, size_bytes, uploaded_by, created_at
      FROM streambot_media_assets WHERE approved=1 ORDER BY created_at DESC
    `),
    env.STREAMBOT_DB.prepare(`
      SELECT i.id, i.asset_id, i.x, i.y, i.width, i.height, i.rotation, i.opacity, i.volume,
             i.z_index, i.visible, i.play_nonce, i.loop, i.duration_ms, i.visible_until, i.updated_by, i.updated_at,
             a.name AS asset_name, a.media_type, a.mime_type
      FROM streambot_overlay_items i
      JOIN streambot_media_assets a ON a.id=i.asset_id
      WHERE a.approved=1 ORDER BY i.z_index ASC, i.created_at ASC
    `),
  ]);

  return json({
    me: publicModSession(session),
    controlEnabled: Boolean(config.mod_control_enabled),
    mediaReady: Boolean(env.STREAMBOT_MEDIA),
    assets: (assetsResult.results || []).map((asset) => ({ ...asset, fileUrl: `/api/streambot/mod/assets/${encodeURIComponent(asset.id)}/file` })),
    items: (itemsResult.results || []).map(normalizeOverlayItem),
  });
}

async function modUploadAsset(request, env, session) {
  if (!env.STREAMBOT_MEDIA) return json({ error: "Falta el binding R2 STREAMBOT_MEDIA." }, 500);
  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file.stream !== "function") return json({ error: "Elegí un archivo." }, 400);
  if (Number(file.size || 0) <= 0) return json({ error: "El archivo está vacío." }, 400);
  if (Number(file.size || 0) > 25 * 1024 * 1024) return json({ error: "Máximo 25 MB por archivo." }, 413);

  const mime = String(file.type || "").toLowerCase();
  const allowed = new Map([
    ["image/png", "image"], ["image/jpeg", "image"], ["image/webp", "image"], ["image/gif", "image"],
    ["video/webm", "video"], ["video/mp4", "video"],
  ]);
  const mediaType = allowed.get(mime);
  if (!mediaType) return json({ error: "Formato no soportado. Usá PNG/JPG/WebP/GIF o WebM/MP4." }, 415);

  const id = crypto.randomUUID();
  const cleanName = sanitizeFileName(file.name || `${mediaType}-${id}`);
  const ext = cleanName.includes(".") ? `.${cleanName.split(".").pop().toLowerCase().slice(0, 8)}` : "";
  const objectKey = `overlay/${id}${ext}`;

  await env.STREAMBOT_MEDIA.put(objectKey, file.stream(), {
    httpMetadata: { contentType: mime, cacheControl: "private, max-age=31536000" },
    customMetadata: { originalName: cleanName, uploadedBy: session.username },
  });

  await env.STREAMBOT_DB.prepare(`
    INSERT INTO streambot_media_assets (id, name, object_key, mime_type, media_type, size_bytes, uploaded_by, approved)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).bind(id, cleanName, objectKey, mime, mediaType, Number(file.size || 0), session.username).run();
  await safeLog(env, "info", "media-upload", session.username, cleanName);
  await realtimeBroadcast(env, { type: "library.refresh" }, "control");
  return json({ ok: true, asset: { id, name: cleanName, mime_type: mime, media_type: mediaType, size_bytes: Number(file.size || 0), fileUrl: `/api/streambot/mod/assets/${id}/file` } });
}

async function modServeAsset(request, env, session, id) {
  const asset = await env.STREAMBOT_DB.prepare("SELECT * FROM streambot_media_assets WHERE id=? AND approved=1").bind(String(id || "")).first();
  if (!asset) return new Response("Not found", { status: 404 });
  return serveR2Object(request, env, asset);
}

async function modDeleteAsset(env, session, id) {
  if (!env.STREAMBOT_MEDIA) return json({ error: "Falta el binding R2 STREAMBOT_MEDIA." }, 500);
  const asset = await env.STREAMBOT_DB.prepare("SELECT * FROM streambot_media_assets WHERE id=?").bind(String(id || "")).first();
  if (!asset) return json({ error: "Asset no encontrado." }, 404);
  await env.STREAMBOT_DB.prepare("DELETE FROM streambot_overlay_items WHERE asset_id=?").bind(asset.id).run();
  await env.STREAMBOT_DB.prepare("DELETE FROM streambot_media_assets WHERE id=?").bind(asset.id).run();
  await env.STREAMBOT_MEDIA.delete(asset.object_key);
  await safeLog(env, "info", "media-delete", session.username, asset.name);
  await realtimeBroadcast(env, { type: "scene.refresh" }, "all");
  await realtimeBroadcast(env, { type: "library.refresh" }, "control");
  return json({ ok: true });
}

async function modCreateItem(request, env, session) {
  const body = await readJson(request);
  const assetId = String(body.assetId || "");
  const asset = await env.STREAMBOT_DB.prepare("SELECT id, name FROM streambot_media_assets WHERE id=? AND approved=1").bind(assetId).first();
  if (!asset) return json({ error: "Asset no encontrado." }, 404);
  const top = await env.STREAMBOT_DB.prepare("SELECT COALESCE(MAX(z_index),0) AS z FROM streambot_overlay_items").first();
  const id = crypto.randomUUID();
  await env.STREAMBOT_DB.prepare(`
    INSERT INTO streambot_overlay_items
      (id, asset_id, x, y, width, height, rotation, opacity, volume, z_index, visible, play_nonce, loop, duration_ms, updated_by)
    VALUES (?, ?, 0.35, 0.30, 0.30, 0.30, 0, 1, 1, ?, 0, 0, 0, 0, ?)
  `).bind(id, assetId, Number(top?.z || 0) + 1, session.username).run();
  await safeLog(env, "info", "overlay-add", session.username, asset.name);
  await realtimeBroadcast(env, { type: "scene.refresh" }, "control");
  return json({ ok: true, id });
}

async function modUpdateItem(request, env, session, id) {
  const body = await readJson(request);
  const current = await env.STREAMBOT_DB.prepare("SELECT * FROM streambot_overlay_items WHERE id=?").bind(String(id || "")).first();
  if (!current) return json({ error: "Elemento no encontrado." }, 404);
  const next = {
    x: clampNumber(body.x, -0.75, 1.75, current.x),
    y: clampNumber(body.y, -0.75, 1.75, current.y),
    width: clampNumber(body.width, 0.02, 2.5, current.width),
    height: clampNumber(body.height, 0.02, 2.5, current.height),
    rotation: clampNumber(body.rotation, -720, 720, current.rotation),
    opacity: clampNumber(body.opacity, 0, 1, current.opacity),
    volume: clampNumber(body.volume, 0, 1, current.volume),
    z: Math.round(clampNumber(body.zIndex, -1000, 10000, current.z_index)),
    loop: "loop" in body ? (body.loop ? 1 : 0) : Number(current.loop || 0),
    duration: Math.round(clampNumber(body.durationMs, 0, 600000, current.duration_ms)),
  };
  await env.STREAMBOT_DB.prepare(`
    UPDATE streambot_overlay_items SET x=?, y=?, width=?, height=?, rotation=?, opacity=?, volume=?, z_index=?, loop=?, duration_ms=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).bind(next.x, next.y, next.width, next.height, next.rotation, next.opacity, next.volume, next.z, next.loop, next.duration, session.username, current.id).run();
  await realtimeBroadcast(env, { type: "scene.refresh" }, "all");
  return json({ ok: true });
}

async function modShowItem(request, env, session, id) {
  const body = await readJson(request);
  const item = await env.STREAMBOT_DB.prepare(`
    SELECT i.*, a.name AS asset_name FROM streambot_overlay_items i JOIN streambot_media_assets a ON a.id=i.asset_id WHERE i.id=?
  `).bind(String(id || "")).first();
  if (!item) return json({ error: "Elemento no encontrado." }, 404);
  const duration = Math.round(clampNumber("durationMs" in body ? body.durationMs : item.duration_ms, 0, 600000, item.duration_ms));
  const until = duration > 0 ? Date.now() + duration : null;
  await env.STREAMBOT_DB.prepare(`
    UPDATE streambot_overlay_items SET visible=1, play_nonce=play_nonce+1, duration_ms=?, visible_until=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).bind(duration, until, session.username, item.id).run();
  await safeLog(env, "info", "overlay-show", session.username, item.asset_name);
  await realtimeBroadcast(env, { type: "scene.refresh" }, "all");
  return json({ ok: true });
}

async function modHideItem(env, session, id) {
  const item = await env.STREAMBOT_DB.prepare(`
    SELECT i.id, a.name AS asset_name FROM streambot_overlay_items i JOIN streambot_media_assets a ON a.id=i.asset_id WHERE i.id=?
  `).bind(String(id || "")).first();
  if (!item) return json({ error: "Elemento no encontrado." }, 404);
  await env.STREAMBOT_DB.prepare("UPDATE streambot_overlay_items SET visible=0, visible_until=NULL, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .bind(session.username, item.id).run();
  await safeLog(env, "info", "overlay-hide", session.username, item.asset_name);
  await realtimeBroadcast(env, { type: "scene.refresh" }, "all");
  return json({ ok: true });
}

async function modDeleteItem(env, session, id) {
  await env.STREAMBOT_DB.prepare("DELETE FROM streambot_overlay_items WHERE id=?").bind(String(id || "")).run();
  await safeLog(env, "info", "overlay-remove", session.username, `Elemento ${id}`);
  await realtimeBroadcast(env, { type: "scene.refresh" }, "all");
  return json({ ok: true });
}

async function overlayMediaState(request, env) {
  const config = await getConfig(env);
  if (!checkOverlayKey(request, config)) return json({ error: "Overlay key inválida." }, 401);
  const now = Date.now();
  try {
    await env.STREAMBOT_DB.prepare("UPDATE streambot_overlay_items SET visible=0, visible_until=NULL WHERE visible=1 AND visible_until IS NOT NULL AND visible_until<=?").bind(now).run();
    const result = await env.STREAMBOT_DB.prepare(`
      SELECT i.id, i.asset_id, i.x, i.y, i.width, i.height, i.rotation, i.opacity, i.volume,
             i.z_index, i.visible, i.play_nonce, i.loop, i.duration_ms, i.visible_until,
             a.name AS asset_name, a.media_type, a.mime_type
      FROM streambot_overlay_items i JOIN streambot_media_assets a ON a.id=i.asset_id
      WHERE i.visible=1 AND a.approved=1 ORDER BY i.z_index ASC, i.created_at ASC
    `).all();
    return json({ items: (result.results || []).map((item) => ({
      ...normalizeOverlayItem(item),
      fileUrl: `/api/streambot/overlay/media-file/${encodeURIComponent(item.asset_id)}?key=${encodeURIComponent(config.overlay_key)}`,
    })) }, 200, { "Cache-Control": "no-store" });
  } catch {
    // Mantiene el TTS funcionando aunque todavía no se haya aplicado la migración v9.
    return json({ items: [] }, 200, { "Cache-Control": "no-store" });
  }
}

async function overlayMediaComplete(request, env) {
  const config = await getConfig(env);
  if (!checkOverlayKey(request, config)) return json({ error: "Overlay key inválida." }, 401);
  const body = await readJson(request);
  const id = String(body.id || "");
  const nonce = Number(body.playNonce || 0);
  if (!id) return json({ error: "ID inválido." }, 400);
  if (nonce) {
    await env.STREAMBOT_DB.prepare("UPDATE streambot_overlay_items SET visible=0, visible_until=NULL WHERE id=? AND play_nonce=?").bind(id, nonce).run();
  } else {
    await env.STREAMBOT_DB.prepare("UPDATE streambot_overlay_items SET visible=0, visible_until=NULL WHERE id=?").bind(id).run();
  }
  await realtimeBroadcast(env, { type: "scene.refresh" }, "all");
  return json({ ok: true });
}

async function overlayMediaFile(request, env) {
  const config = await getConfig(env);
  if (!checkOverlayKey(request, config)) return new Response("Unauthorized", { status: 401 });
  if (!env.STREAMBOT_MEDIA) return new Response("R2 not configured", { status: 503 });
  const id = new URL(request.url).pathname.split("/").pop();
  const asset = await env.STREAMBOT_DB.prepare("SELECT * FROM streambot_media_assets WHERE id=? AND approved=1").bind(String(id || "")).first();
  if (!asset) return new Response("Not found", { status: 404 });
  return serveR2Object(request, env, asset);
}

async function serveR2Object(request, env, asset) {
  if (!env.STREAMBOT_MEDIA) return new Response("R2 not configured", { status: 503 });
  const object = await env.STREAMBOT_MEDIA.get(asset.object_key, { range: request.headers });
  if (!object || !("body" in object)) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", asset.mime_type || headers.get("Content-Type") || "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set("Accept-Ranges", "bytes");
  headers.set("ETag", object.httpEtag);
  let status = 200;
  if (object.range && typeof object.range.offset === "number" && typeof object.range.length === "number") {
    status = 206;
    const start = object.range.offset;
    const end = start + object.range.length - 1;
    headers.set("Content-Range", `bytes ${start}-${end}/${object.size}`);
    headers.set("Content-Length", String(object.range.length));
  } else {
    headers.set("Content-Length", String(object.size));
  }
  return new Response(object.body, { status, headers });
}

function normalizeOverlayItem(item) {
  return {
    id: String(item.id), assetId: String(item.asset_id), assetName: String(item.asset_name || ""),
    mediaType: String(item.media_type || "image"), mimeType: String(item.mime_type || ""),
    x: Number(item.x), y: Number(item.y), width: Number(item.width), height: Number(item.height),
    rotation: Number(item.rotation), opacity: Number(item.opacity), volume: Number(item.volume),
    zIndex: Number(item.z_index), visible: Boolean(item.visible), playNonce: Number(item.play_nonce || 0),
    loop: Boolean(item.loop), durationMs: Number(item.duration_ms || 0), visibleUntil: item.visible_until == null ? null : Number(item.visible_until),
    updatedBy: String(item.updated_by || ""), updatedAt: String(item.updated_at || ""),
  };
}

async function adminListMods(env) {
  const result = await env.STREAMBOT_DB.prepare(`
    SELECT id, kick_user_id, username, active, can_control, can_upload, can_delete, is_owner, created_at, updated_at
    FROM streambot_mod_users WHERE is_owner=0 ORDER BY username COLLATE NOCASE
  `).all();
  return json({ mods: result.results || [] });
}

async function adminCreateMod(request, env) {
  const body = await readJson(request);
  const username = normalizeKickUsername(body.username);
  if (!username) return json({ error: "Ingresá un username de Kick." }, 400);
  await env.STREAMBOT_DB.prepare(`
    INSERT INTO streambot_mod_users (username, active, can_control, can_upload, can_delete, is_owner)
    VALUES (?, 1, 1, 0, 0, 0)
    ON CONFLICT(username) DO UPDATE SET active=1, updated_at=CURRENT_TIMESTAMP
  `).bind(username).run();
  await safeLog(env, "info", "mod-allowlist", username, "Agregado a la allowlist del Overlay Control.");
  return adminListMods(env);
}

async function adminUpdateMod(request, env) {
  const id = Number(new URL(request.url).pathname.split("/").pop());
  const body = await readJson(request);
  if (!id) return json({ error: "ID inválido." }, 400);
  const row = await env.STREAMBOT_DB.prepare("SELECT is_owner, username FROM streambot_mod_users WHERE id=?").bind(id).first();
  if (!row || Number(row.is_owner)) return json({ error: "Moderador inválido." }, 400);
  await env.STREAMBOT_DB.prepare(`
    UPDATE streambot_mod_users SET active=?, can_control=?, can_upload=?, can_delete=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).bind(body.active === false ? 0 : 1, body.can_control === false ? 0 : 1, body.can_upload ? 1 : 0, body.can_delete ? 1 : 0, id).run();
  if (body.active === false) await env.STREAMBOT_DB.prepare("DELETE FROM streambot_mod_sessions WHERE mod_id=?").bind(id).run();
  await safeLog(env, "info", "mod-permissions", row.username, "Permisos de Overlay Control actualizados.");
  return adminListMods(env);
}

async function adminDeleteMod(request, env) {
  const id = Number(new URL(request.url).pathname.split("/").pop());
  if (!id) return json({ error: "ID inválido." }, 400);
  const row = await env.STREAMBOT_DB.prepare("SELECT is_owner, username FROM streambot_mod_users WHERE id=?").bind(id).first();
  if (!row || Number(row.is_owner)) return json({ error: "Moderador inválido." }, 400);
  await env.STREAMBOT_DB.prepare("DELETE FROM streambot_mod_sessions WHERE mod_id=?").bind(id).run();
  await env.STREAMBOT_DB.prepare("DELETE FROM streambot_mod_users WHERE id=?").bind(id).run();
  await safeLog(env, "info", "mod-allowlist", row.username, "Quitado de la allowlist del Overlay Control.");
  return adminListMods(env);
}

function normalizeKickUsername(value) {
  return String(value || "").trim().replace(/^@+/, "").replace(/\s+/g, "").slice(0, 64);
}

function clampNumber(value, min, max, fallback = 0) {
  const number = Number(value);
  const base = Number.isFinite(number) ? number : Number(fallback);
  return Math.min(max, Math.max(min, Number.isFinite(base) ? base : 0));
}

function sanitizeFileName(value) {
  return String(value || "archivo").replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_").trim().slice(0, 120) || "archivo";
}

function getCookie(request, name) {
  const cookies = String(request.headers.get("Cookie") || "").split(";");
  for (const part of cookies) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function modSessionCookie(value, maxAge) {
  return `minerbot_mod_session=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0, Math.floor(maxAge))}`;
}

function requireSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (origin !== new URL(request.url).origin) return json({ error: "Origen no permitido." }, 403);
  return null;
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

  // Kick documenta type="bot", pero actualmente ese modo puede fallar para
  // apps públicas/no verificadas. Como MinerBot está autorizado con la cuenta
  // del broadcaster, enviamos el mensaje como ese usuario al canal indicado.
  const broadcasterUserId = Number(await getSetting(env, "kick_user_id"));
  if (!Number.isFinite(broadcasterUserId) || broadcasterUserId <= 0) {
    throw new Error("No encuentro tu broadcaster_user_id de Kick. Reconectá Kick desde el dashboard.");
  }

  const access = await getKickAccessToken(env);
  const res = await kickFetchRaw("/chat", access, {
    method: "POST",
    body: JSON.stringify({
      type: "user",
      broadcaster_user_id: broadcasterUserId,
      content: clean,
    }),
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

function htmlMessage(message, status = 200, backHref = "/streambot.html") {
  return new Response(`<!doctype html><meta charset="utf-8"><title>MinerBot</title><style>body{font:16px system-ui;background:#111;color:#fff;padding:40px}a{color:#53fc18}</style><p>${escapeHtml(message)}</p><p><a href="${escapeHtml(backHref)}">Volver</a></p>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}
