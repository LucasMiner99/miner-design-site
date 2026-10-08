// MinerBot · limpieza del piso: estado autoritativo y persistente en D1.
// Nunca se confía en parámetros de la URL para modificar el contador.
const CREATE_SQL = `CREATE TABLE IF NOT EXISTS streambot_cleaning_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  progress REAL NOT NULL DEFAULT 0,
  floors INTEGER NOT NULL DEFAULT 0,
  updated_ms INTEGER NOT NULL DEFAULT 0,
  boost_until_ms INTEGER NOT NULL DEFAULT 0,
  celebration_until_ms INTEGER NOT NULL DEFAULT 0,
  viewers INTEGER NOT NULL DEFAULT -1,
  viewers_updated_ms INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 0
)`;
const sane = (v, min, max, fallback) => Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : fallback;
export function cleaningOptions(config = {}) {
  return {
    enabled: !!config.cleaning_enabled,
    floorMinutes: sane(config.cleaning_floor_minutes, 1, 240, 20),
    bonusPer100: sane(config.cleaning_bonus_per_100, 0, 300, 15),
    boostMultiplier: sane(config.cleaning_boost_multiplier, 1, 20, 5),
    boostMs: sane(config.cleaning_boost_seconds, 5, 600, 60) * 1000,
    celebrationMs: sane(config.cleaning_celebration_seconds, 1, 60, 10) * 1000,
    normalFps: sane(config.cleaning_normal_fps, 3, 50, 25),
    boostFps: sane(config.cleaning_boost_fps, 5, 500, 60),
    mode: config.cleaning_viewers_mode === 'manual' ? 'manual' : 'auto',
    manualViewers: sane(config.cleaning_manual_viewers, 0, 1000000, 0),
  };
}
export function advanceCleaning(row, now, cfg) {
  const s = { ...row };
  const options = cleaningOptions(cfg);
  const target = Math.max(Number(s.updated_ms) || now, now);
  let t = Number(s.updated_ms) || now;
  s.progress = sane(s.progress, 0, 100, 0);
  s.floors = Math.max(0, Math.trunc(Number(s.floors) || 0));
  s.boost_until_ms = Number(s.boost_until_ms) || 0;
  s.celebration_until_ms = Number(s.celebration_until_ms) || 0;
  const currentViewers = options.mode === 'manual' ? options.manualViewers : Math.max(0, Number(s.viewers) || 0);
  const rate = 100 / (options.floorMinutes * 60000) * (1 + currentViewers / 100 * options.bonusPer100 / 100);
  if (!options.enabled) { s.updated_ms = target; return s; }
  // Avanzar del último instante persistido al actual. Respeta boosts que caducaron
  // en el medio, los ciclos múltiples y la pausa de 10 s del baile.
  let guard = 0;
  while (t < target && ++guard < 100000) {
    if (s.celebration_until_ms > 0) {
      if (s.celebration_until_ms <= t) {
        s.celebration_until_ms = 0;
        s.progress = 0;
        continue;
      }
      t = Math.min(target, s.celebration_until_ms);
      if (t >= s.celebration_until_ms) {
        s.progress = 0;
        s.celebration_until_ms = 0;
      }
      continue;
    }
    const boosted = t < s.boost_until_ms;
    const effectiveRate = rate * (boosted ? options.boostMultiplier : 1);
    const nextTime = boosted ? Math.min(target, s.boost_until_ms) : target;
    const finishAt = t + (100 - s.progress) / effectiveRate;
    if (finishAt <= nextTime + 0.00001) {
      t = Math.min(target, Math.max(t, finishAt));
      s.progress = 100;
      s.floors += 1;
      s.celebration_until_ms = t + options.celebrationMs;
    } else {
      s.progress = Math.min(100, s.progress + effectiveRate * (nextTime - t));
      t = nextTime;
    }
  }
  s.updated_ms = target;
  return s;
}
export async function ensureCleaningTable(env) {
  await env.STREAMBOT_DB.prepare(CREATE_SQL).run();
  await env.STREAMBOT_DB.prepare(`INSERT OR IGNORE INTO streambot_cleaning_state
    (id, updated_ms) VALUES (1, ?)`).bind(Date.now()).run();
}
async function readCleaningRow(env) {
  await ensureCleaningTable(env);
  return env.STREAMBOT_DB.prepare('SELECT * FROM streambot_cleaning_state WHERE id=1').first();
}
// CAS para proteger los follows y los controles frente a varias fuentes OBS simultáneas.
export async function mutateCleaning(env, cfg, mutation = null, at = Date.now()) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const row = await readCleaningRow(env);
    let next = advanceCleaning(row, at, cfg);
    if (mutation) next = mutation(next) || next;
    const updated = await env.STREAMBOT_DB.prepare(`UPDATE streambot_cleaning_state
      SET progress=?, floors=?, updated_ms=?, boost_until_ms=?, celebration_until_ms=?,
          viewers=?, viewers_updated_ms=?, revision=revision+1 WHERE id=1 AND revision=?`)
      .bind(next.progress, next.floors, next.updated_ms, next.boost_until_ms, next.celebration_until_ms,
        next.viewers, next.viewers_updated_ms, row.revision).run();
    if (updated.meta?.changes) return { ...next, revision: Number(row.revision) + 1 };
  }
  throw new Error('Hay demasiados cambios simultáneos en el minijuego. Reintentá.');
}
export function cleaningSnapshot(row, cfg, now = Date.now()) {
  const opts = cleaningOptions(cfg);
  const s = advanceCleaning(row, now, cfg);
  return {
    enabled: opts.enabled,
    progress: Math.min(100, Math.max(0, Number(s.progress) || 0)),
    floors: s.floors,
    viewers: opts.mode === 'manual' ? opts.manualViewers : Number(s.viewers) >= 0 ? Number(s.viewers) : null,
    viewersMode: opts.mode,
    viewersUpdatedMs: opts.mode === 'manual' ? now : Number(s.viewers_updated_ms) || 0,
    now,
    updatedMs: now,
    boostUntilMs: Number(s.boost_until_ms) || 0,
    celebrationUntilMs: Number(s.celebration_until_ms) || 0,
    floorMinutes: opts.floorMinutes,
    bonusPer100: opts.bonusPer100,
    boostMultiplier: opts.boostMultiplier,
    celebrationMs: opts.celebrationMs,
    normalFps: opts.normalFps,
    boostFps: opts.boostFps,
  };
}
export async function getCleaningSnapshot(env, cfg, now = Date.now()) {
  const row = await mutateCleaning(env, cfg, null, now);
  return cleaningSnapshot(row, cfg, now);
}
export async function applyCleaningFollow(env, cfg) {
  if (!cleaningOptions(cfg).enabled) return;
  const now = Date.now();
  await mutateCleaning(env, cfg, s => {
    s.boost_until_ms = now + cleaningOptions(cfg).boostMs; // nuevo follow reinicia el minuto
    return s;
  }, now);
}
export async function changeCleaningState(env, cfg, body = {}) {
  const now = Date.now();
  const opts = cleaningOptions(cfg);
  const action = String(body.action || '');
  const allowed = ['reset-all','reset-progress','reset-floors','set-progress','set-floors','follow-test','finish-test','set-viewers'];
  if (!allowed.includes(action)) throw Object.assign(new Error('Acción de limpieza inválida.'), { status: 400 });
  const row = await mutateCleaning(env, cfg, s => {
    if (action === 'reset-all') {
      s.progress = 0; s.floors = 0; s.boost_until_ms = 0; s.celebration_until_ms = 0;
    } else if (action === 'reset-progress') {
      s.progress = 0; s.boost_until_ms = 0; s.celebration_until_ms = 0;
    } else if (action === 'reset-floors' || action === 'set-floors') {
      s.floors = action === 'reset-floors' ? 0 : Math.trunc(sane(body.value, 0, 1000000000, 0));
    } else if (action === 'set-progress') {
      s.progress = sane(body.value, 0, 99.99, 0); s.celebration_until_ms = 0;
    } else if (action === 'follow-test') {
      s.boost_until_ms = now + opts.boostMs;
    } else if (action === 'finish-test') {
      s.progress = 100;
      s.floors++;
      s.celebration_until_ms = now + opts.celebrationMs;
    } else if (action === 'set-viewers') {
      s.viewers = Math.trunc(sane(body.value, 0, 1000000, 0));
      s.viewers_updated_ms = now;
    }
    return s;
  }, now);
  return cleaningSnapshot(row, cfg, now);
}
