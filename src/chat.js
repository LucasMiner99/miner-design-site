// MinerBot Chat Overlay v16 — Kick webhook -> D1 history + realtime fan-out.
let lastPruneAt = 0;
let tableEnsured = false;
const TABLE = `CREATE TABLE IF NOT EXISTS streambot_chat_overlay_messages (
  message_id TEXT PRIMARY KEY,
  created_at_ms INTEGER NOT NULL,
  payload TEXT NOT NULL
)`;

export async function ensureChatTable(env) {
  if (tableEnsured) return;
  await env.STREAMBOT_DB.prepare(TABLE).run();
  tableEnsured = true;
}

export function normalizeKickChat(payload) {
  const sender = payload?.sender || {};
  const content = String(payload?.content || '').slice(0, 1000).trim();
  const username = String(sender.username || '').slice(0, 80);
  if (!username || !content) return null;
  const color = String(sender.identity?.username_color || '');
  const identityBadges = Array.isArray(sender.identity?.badges) ? sender.identity.badges : [];
  const badges = identityBadges.slice(0, 24).map(badge => ({
    type: String(badge.type || '').slice(0, 64),
    text: String(badge.text || badge.type || '').slice(0, 80),
    count: Number.isFinite(Number(badge.count)) && badge.count != null ? Math.max(0, Math.min(999999, Number(badge.count))) : null,
  })).filter(b => b.type || b.text);
  if (sender.is_verified && !badges.some(b => b.type === 'verified')) {
    badges.push({ type: 'verified', text: 'Verified', count: null });
  }
  return {
    id: String(payload.message_id || crypto.randomUUID()).slice(0, 140),
    username,
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : '#c9b4ff',
    badges,
    content,
    createdAt: Number.isFinite(Date.parse(payload.created_at)) ? Date.parse(payload.created_at) : Date.now(),
  };
}

export async function storeChatMessage(env, message) {
  if (!message) return;
  await ensureChatTable(env);
  await env.STREAMBOT_DB.prepare(
    'INSERT OR IGNORE INTO streambot_chat_overlay_messages (message_id, created_at_ms, payload) VALUES (?, ?, ?)'
  ).bind(message.id, message.createdAt, JSON.stringify(message)).run();
  // Only one housekeeping query per minute on a warm Worker, not per chat message.
  if (Date.now() - lastPruneAt > 60000) {
    lastPruneAt = Date.now();
    await env.STREAMBOT_DB.prepare(`DELETE FROM streambot_chat_overlay_messages
      WHERE message_id NOT IN (SELECT message_id FROM streambot_chat_overlay_messages ORDER BY created_at_ms DESC LIMIT 120)
      OR created_at_ms < ?`).bind(Date.now() - 3600_000).run();
  }
}

export async function recentChatMessages(env) {
  await ensureChatTable(env);
  const result = await env.STREAMBOT_DB.prepare(
    'SELECT payload FROM streambot_chat_overlay_messages WHERE created_at_ms >= ? ORDER BY created_at_ms DESC LIMIT 20'
  ).bind(Date.now() - 180_000).all();
  return (result.results || []).reverse().map(row => {
    try { return JSON.parse(row.payload); } catch { return null; }
  }).filter(Boolean);
}

function addEmotesToMap(map, value) {
  const emotes = value?.emote_set?.emotes || value?.emotes || [];
  for (const emote of emotes) {
    const id = String(emote.id || emote.data?.id || '');
    const name = String(emote.name || '');
    if (/^[a-zA-Z0-9_-]{4,40}$/.test(id) && name && name.length < 80) {
      map[name] = `https://cdn.7tv.app/emote/${id}/2x.webp`;
    }
  }
}

// This endpoint hides the upstream API details from OBS and caches upstream hiccups.
export async function sevenTvMap(env, config) {
  if (!config.chat_7tv_enabled) return {};
  const id = String(config.kick_user_id || '').replace(/[^0-9]/g, '');
  const endpoints = ['https://7tv.io/v3/emote-sets/global'];
  if (id) endpoints.push(`https://7tv.io/v3/users/kick/${id}`);
  const bodies = await Promise.all(endpoints.map(async url => {
    try {
      const resp = await fetch(url, { headers: { Accept: 'application/json' }, cf: { cacheTtl: 900, cacheEverything: true } });
      return resp.ok ? await resp.json() : null;
    } catch { return null; }
  }));
  const map = Object.create(null);
  for (const data of bodies) addEmotesToMap(map, data);
  return map;
}
