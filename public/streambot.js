const API = "/api/streambot";
let adminKey = localStorage.getItem("streambot_admin_key") || "";
let config = {};
let status = {};

const $ = (id) => document.getElementById(id);
const fields = [
  "bot_enabled","follows_enabled","subs_enabled","renewals_enabled","gifts_enabled",
  "follow_message","sub_message","renewal_message","gift_message",
  "title_command_enabled","title_command_name","title_command_mods_allowed",
  "game_command_enabled","game_command_name","game_command_mods_allowed","stream_command_confirm",
  "crown_enabled","crown_steal_command","crown_info_commands","crown_min_minutes","crown_max_minutes",
  "crown_open_seconds","crown_alert_seconds","crown_top_seconds",
  "crown_overlay_scale","crown_overlay_right","crown_overlay_bottom",
  "sub_goal_enabled","sub_goal_current","sub_goal_target",
  "sub_goal_overlay_scale","sub_goal_overlay_right","sub_goal_overlay_bottom",
  "tts_enabled","tts_max_chars","tts_daily_chars","tts_volume",
  "tts_voice_1_enabled","tts_reward_title","tts_reward_cost","tts_voice_id",
  "tts_voice_2_enabled","tts_voice_2_title","tts_voice_2_cost","tts_voice_2_voice_id",
  "tts_voice_3_enabled","tts_voice_3_title","tts_voice_3_cost","tts_voice_3_voice_id",
  "tts_voice_4_enabled","tts_voice_4_title","tts_voice_4_cost","tts_voice_4_voice_id",
  "mod_control_enabled"
];

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}), "X-Streambot-Key": adminKey };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}${path}`, { ...options, headers, cache: "no-store" });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const looksLikeCloudflareError = /<html|<!doctype/i.test(text) && /cloudflare/i.test(text);
    data = {
      error: looksLikeCloudflareError
        ? `Cloudflare Worker falló (HTTP ${res.status}). Revisá Logs del Worker para ver la excepción.`
        : (text || `Error ${res.status}`)
    };
  }
  if (!res.ok) {
    const error = new Error(data.error || `Error ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

function showNotice(message, isError = false) {
  const el = $("notice");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.classList.remove("hidden");
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => el.classList.add("hidden"), 4500);
}

async function unlock() {
  adminKey = $("adminKeyInput").value.trim();
  if (!adminKey) return;
  try {
    $("unlockButton").disabled = true;
    $("unlockError").textContent = "";
    await loadAll();
    localStorage.setItem("streambot_admin_key", adminKey);
    $("lockScreen").classList.add("hidden");
  } catch (err) {
    $("unlockError").textContent = err.message;
  } finally {
    $("unlockButton").disabled = false;
  }
}

async function loadAll() {
  const data = await api("/bootstrap");
  status = data.status || {};
  config = data.config || {};
  paintStatus();
  paintConfig();
  paintCommands(data.commands || []);
  paintLogs(data.logs || []);
}

function paintStatus() {
  $("kickStatus").textContent = status.kickConnected ? "Conectado" : "Desconectado";
  $("kickUser").textContent = status.kickUsername ? `@${status.kickUsername}` : "—";
  $("elevenStatus").textContent = status.hasElevenLabsKey ? "Listo" : "Sin API key";
  const rewardCount = Number(status.rewardConfiguredCount || 0);
  $("rewardStatus").textContent = rewardCount ? `${rewardCount}/4 configuradas` : "Sin crear";
  $("queueStatus").textContent = String(status.queueCount || 0);
  $("overlayUrl").value = status.overlayUrl || "";
  if ($("controlUrl")) $("controlUrl").value = status.controlUrl || `${location.origin}/control.html`;
  if ($("mediaStorageStatus")) {
    $("mediaStorageStatus").textContent = status.mediaReady ? "R2 conectado · listo" : "Falta binding R2 STREAMBOT_MEDIA";
    $("mediaStorageStatus").classList.toggle("ok", Boolean(status.mediaReady));
    $("mediaStorageStatus").classList.toggle("warn", !status.mediaReady);
  }
  $("sidebarStatus").textContent = status.kickConnected ? `Kick · @${status.kickUsername || "conectado"}` : "Kick sin conectar";
  $("sidebarStatus").classList.toggle("online", status.kickConnected);
  $("connectKick").textContent = status.kickConnected ? "Reconectar Kick" : "Conectar Kick";
}

function paintConfig() {
  for (const id of fields) {
    const el = $(id);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = Boolean(config[id]);
    else el.value = config[id] ?? "";
  }
  if (typeof syncOverlayEditors === "function") syncOverlayEditors();
}

function collectConfig() {
  const output = {};
  for (const id of fields) {
    const el = $(id);
    if (el.type === "checkbox") output[id] = el.checked;
    else if (el.type === "number") output[id] = Number(el.value);
    else output[id] = el.value;
  }
  return output;
}

async function saveConfig() {
  try {
    $("saveButton").disabled = true;
    const result = await api("/config", { method: "PUT", body: JSON.stringify(collectConfig()) });
    config = result.config;
    if (status.kickConnected) await api("/reward/sync", { method: "POST" });
    status = await api("/status");
    paintStatus();
    paintConfig();
    showNotice("Cambios guardados y recompensas TTS sincronizadas.");
  } catch (err) { showNotice(err.message, true); }
  finally { $("saveButton").disabled = false; }
}

async function connectKick() {
  try {
    const data = await api("/oauth/start?json=1");
    if (data.url) location.href = data.url;
  } catch (err) { showNotice(err.message, true); }
}

async function syncEvents() {
  try {
    const data = await api("/events/sync", { method: "POST" });
    showNotice(data.added?.length ? `Eventos agregados: ${data.added.length}` : "Eventos de Kick ya sincronizados.");
  } catch (err) { showNotice(err.message, true); }
}

async function syncReward(slot = 0) {
  try {
    await api("/config", { method: "PUT", body: JSON.stringify(collectConfig()) });
    const suffix = slot ? `?slot=${slot}` : "";
    await api(`/reward/sync${suffix}`, { method: "POST" });
    status = await api("/status");
    paintStatus();
    showNotice(slot ? `Voz ${slot} sincronizada con Kick.` : "Recompensas TTS sincronizadas con Kick.");
  } catch (err) { showNotice(err.message, true); }
}

async function testChat() {
  try { await api("/test/chat", { method: "POST" }); showNotice("Mensaje enviado al chat."); }
  catch (err) { showNotice(err.message, true); }
}

async function testTts(slot = 1) {
  try {
    // Guardamos primero para que la prueba use el Voice ID que está visible en pantalla.
    const result = await api("/config", { method: "PUT", body: JSON.stringify(collectConfig()) });
    config = result.config;
    const text = $("testTtsText").value.trim();
    await api("/test/tts", { method: "POST", body: JSON.stringify({ text, slot }) });
    showNotice(`TTS de la voz ${slot} enviado a la cola de OBS.`);
  } catch (err) { showNotice(err.message, true); }
}

function paintCommands(commands) {
  const host = $("commandsList");
  host.innerHTML = "";
  for (const command of commands) host.appendChild(commandRow(command));
  if (!commands.length) host.innerHTML = '<p class="hint">Todavía no hay comandos.</p>';
}

function commandRow(command = { id: null, name: "", response: "", enabled: 1 }) {
  const row = document.createElement("div");
  row.className = "command-row";
  row.innerHTML = `
    <input class="command-name" type="text" value="${esc(command.name)}" placeholder="instagram" />
    <input class="command-response" type="text" value="${esc(command.response)}" placeholder="Respuesta del bot" />
    <input class="mini-toggle command-enabled" type="checkbox" ${command.enabled ? "checked" : ""} title="Activado" />
    <button class="delete-button">Eliminar</button>`;
  const save = async () => {
    const payload = {
      name: row.querySelector(".command-name").value,
      response: row.querySelector(".command-response").value,
      enabled: row.querySelector(".command-enabled").checked,
    };
    try {
      const data = await api(command.id ? `/commands/${command.id}` : "/commands", {
        method: command.id ? "PUT" : "POST", body: JSON.stringify(payload)
      });
      paintCommands(data.commands || []);
      showNotice("Comando guardado.");
    } catch (err) { showNotice(err.message, true); }
  };
  row.querySelectorAll("input").forEach((el) => el.addEventListener("change", save));
  row.querySelector(".delete-button").addEventListener("click", async () => {
    if (!command.id) { row.remove(); return; }
    try { const data = await api(`/commands/${command.id}`, { method: "DELETE" }); paintCommands(data.commands || []); }
    catch (err) { showNotice(err.message, true); }
  });
  return row;
}


async function loadMods() {
  try {
    const data = await api("/mods");
    paintMods(data.mods || []);
  } catch (err) {
    const host = $("modsList");
    if (host) host.innerHTML = `<p class="hint">${esc(err.message)}. Si recién instalaste v9, ejecutá <code>streambot-v9-migration.sql</code> en D1.</p>`;
  }
}

function paintMods(mods = []) {
  const host = $("modsList");
  if (!host) return;
  host.innerHTML = "";
  for (const mod of mods) {
    const row = document.createElement("div");
    row.className = "mod-row";
    row.innerHTML = `
      <div class="mod-user"><b>@${esc(mod.username)}</b><small>${mod.kick_user_id ? `ID ${esc(mod.kick_user_id)}` : "Todavía no inició sesión"}</small></div>
      <input class="p-control" type="checkbox" ${Number(mod.can_control) ? "checked" : ""} title="Puede controlar" />
      <input class="p-upload" type="checkbox" ${Number(mod.can_upload) ? "checked" : ""} title="Puede subir" />
      <input class="p-delete" type="checkbox" ${Number(mod.can_delete) ? "checked" : ""} title="Puede borrar" />
      <input class="p-active" type="checkbox" ${Number(mod.active) ? "checked" : ""} title="Activo" />
      <button class="delete-button">Quitar</button>`;
    const save = async () => {
      try {
        const data = await api(`/mods/${mod.id}`, {
          method: "PUT",
          body: JSON.stringify({
            can_control: row.querySelector(".p-control").checked,
            can_upload: row.querySelector(".p-upload").checked,
            can_delete: row.querySelector(".p-delete").checked,
            active: row.querySelector(".p-active").checked,
          }),
        });
        paintMods(data.mods || []);
        showNotice(`Permisos de @${mod.username} actualizados.`);
      } catch (err) { showNotice(err.message, true); }
    };
    row.querySelectorAll("input").forEach((el) => el.addEventListener("change", save));
    row.querySelector(".delete-button").addEventListener("click", async () => {
      if (!confirm(`¿Quitar a @${mod.username} del Overlay Control?`)) return;
      try {
        const data = await api(`/mods/${mod.id}`, { method: "DELETE" });
        paintMods(data.mods || []);
        showNotice(`@${mod.username} ya no tiene acceso.`);
      } catch (err) { showNotice(err.message, true); }
    });
    host.appendChild(row);
  }
  if (!mods.length) host.innerHTML = '<p class="hint">Todavía no autorizaste a ningún mod. Vos podés entrar al panel con tu propia cuenta de Kick sin agregarte.</p>';
}

async function addMod() {
  const username = $("newModUsername").value.trim();
  if (!username) return;
  try {
    $("addMod").disabled = true;
    const data = await api("/mods", { method: "POST", body: JSON.stringify({ username }) });
    $("newModUsername").value = "";
    paintMods(data.mods || []);
    showNotice("Mod autorizado.");
  } catch (err) { showNotice(err.message, true); }
  finally { $("addMod").disabled = false; }
}


function formatCrownTime(ms) {
  const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return [h, m, sec].map(n => String(n).padStart(2, "0")).join(":");
}

async function loadCrown() {
  const stateHost = $("crownAdminState");
  const topHost = $("crownAdminTop");
  if (!stateHost || !topHost) return;
  try {
    const data = await api("/crown/admin");
    const st = data.state || {};
    const now = Number(data.serverNow || Date.now());
    const held = st.crownedAt ? Math.max(0, now - Number(st.crownedAt)) : 0;
    const username = st.currentUsername || "Sin rey";
    let nextText = "Corona libre";
    if (st.currentUsername && st.stealOpenAt && st.stealCloseAt) {
      if (now < Number(st.stealOpenAt)) nextText = `Se abre en ${formatCrownTime(Number(st.stealOpenAt) - now)}`;
      else if (now < Number(st.stealCloseAt)) nextText = `ABIERTA · quedan ${formatCrownTime(Number(st.stealCloseAt) - now)}`;
      else nextText = "Programando próxima ventana…";
    }
    stateHost.innerHTML = `<div><span>Rey actual</span><b>👑 ${esc(username)}</b></div><div><span>Tiempo</span><b>${formatCrownTime(held)}</b></div><div><span>Estado</span><b>${esc(nextText)}</b></div>`;
    topHost.innerHTML = (data.top || []).length ? `<h3>Top 5 · tiempo total</h3>${(data.top || []).map((row, i) => `<div class="crown-top-row"><span>${i + 1}. ${esc(row.username)}${row.isCurrent ? " 👑" : ""}</span><b>${formatCrownTime(row.totalMs)}</b></div>`).join("")}` : '<p class="hint">Todavía no hay historial de la corona.</p>';
  } catch (err) {
    stateHost.textContent = err.message;
    topHost.innerHTML = '<p class="hint">Si acabás de instalar esta función, ejecutá <code>streambot-v12-crown-migration.sql</code> en D1.</p>';
  }
}

async function crownShowTop() {
  try { await api("/crown/show-top", { method: "POST" }); showNotice("Top 5 mostrado en OBS."); }
  catch (err) { showNotice(err.message, true); }
}

async function crownTestAlert() {
  try { await api("/crown/test-alert", { method: "POST", body: JSON.stringify({}) }); showNotice("Alerta de corona enviada a OBS."); }
  catch (err) { showNotice(err.message, true); }
}

async function crownRelease() {
  if (!confirm("¿Liberar la corona actual? El tiempo del rey se guarda en el ranking.")) return;
  try { await api("/crown/release", { method: "POST" }); await loadCrown(); showNotice("Corona liberada."); }
  catch (err) { showNotice(err.message, true); }
}


function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function setupOverlayEditor(opts) {
  const scaleInput = $(opts.scaleInput);
  const rightInput = $(opts.rightInput);
  const bottomInput = $(opts.bottomInput);
  const scaleSlider = $(opts.scaleSlider);
  const scaleReadout = $(opts.scaleReadout);
  const rightReadout = $(opts.rightReadout);
  const bottomReadout = $(opts.bottomReadout);
  const stage = $(opts.stage);
  const widget = $(opts.widget);
  if (!scaleInput || !rightInput || !bottomInput || !scaleSlider || !stage || !widget) return () => {};

  const BASE_STAGE_W = 1920;
  const BASE_STAGE_H = 1080;

  function widgetSize(scale) {
    return {
      w: opts.baseWidth * scale / 100,
      h: opts.baseHeight * scale / 100,
    };
  }

  function writeReadouts() {
    if (scaleReadout) scaleReadout.textContent = `${Math.round(Number(scaleInput.value) || 100)}%`;
    if (rightReadout) rightReadout.textContent = `${Math.round(Number(rightInput.value) || 0)}px`;
    if (bottomReadout) bottomReadout.textContent = `${Math.round(Number(bottomInput.value) || 0)}px`;
  }

  function updatePreview() {
    const scale = clamp(Number(scaleInput.value) || opts.defaultScale, 50, 250);
    const right = clamp(Number(rightInput.value) || opts.defaultRight, 0, 1200);
    const bottom = clamp(Number(bottomInput.value) || opts.defaultBottom, 0, 1200);
    scaleInput.value = Math.round(scale);
    rightInput.value = Math.round(right);
    bottomInput.value = Math.round(bottom);
    scaleSlider.value = String(Math.round(scale));
    const rect = stage.getBoundingClientRect();
    const { w, h } = widgetSize(scale);
    widget.style.width = `${w}px`;
    widget.style.height = `${h}px`;
    const left = clamp(rect.width - w - (right / BASE_STAGE_W) * rect.width, 0, Math.max(0, rect.width - w));
    const top = clamp(rect.height - h - (bottom / BASE_STAGE_H) * rect.height, 0, Math.max(0, rect.height - h));
    widget.style.left = `${left}px`;
    widget.style.top = `${top}px`;
    writeReadouts();
  }

  function applyFromLeftTop(left, top) {
    const rect = stage.getBoundingClientRect();
    const scale = clamp(Number(scaleInput.value) || opts.defaultScale, 50, 250);
    const { w, h } = widgetSize(scale);
    const clampedLeft = clamp(left, 0, Math.max(0, rect.width - w));
    const clampedTop = clamp(top, 0, Math.max(0, rect.height - h));
    const right = ((rect.width - clampedLeft - w) / rect.width) * BASE_STAGE_W;
    const bottom = ((rect.height - clampedTop - h) / rect.height) * BASE_STAGE_H;
    rightInput.value = String(Math.round(clamp(right, 0, 1200)));
    bottomInput.value = String(Math.round(clamp(bottom, 0, 1200)));
    updatePreview();
  }

  scaleSlider.addEventListener("input", () => {
    scaleInput.value = scaleSlider.value;
    updatePreview();
  });

  const nudge = (dx, dy) => {
    const left = parseFloat(widget.style.left || "0") + dx;
    const top = parseFloat(widget.style.top || "0") + dy;
    applyFromLeftTop(left, top);
  };

  [
    [opts.nudgeUp, 0, -4],
    [opts.nudgeLeft, -4, 0],
    [opts.nudgeDown, 0, 4],
    [opts.nudgeRight, 4, 0],
  ].forEach(([id, dx, dy]) => {
    const btn = $(id);
    if (btn) btn.addEventListener("click", () => nudge(dx, dy));
  });

  const presetDefault = $(opts.presetDefault);
  if (presetDefault) presetDefault.addEventListener("click", () => {
    scaleInput.value = String(opts.defaultScale);
    rightInput.value = String(opts.defaultRight);
    bottomInput.value = String(opts.defaultBottom);
    updatePreview();
  });

  const presetSecondary = $(opts.presetSecondary);
  if (presetSecondary) presetSecondary.addEventListener("click", () => {
    scaleInput.value = String(opts.defaultScale);
    rightInput.value = String(opts.defaultRight);
    bottomInput.value = String(opts.secondaryBottom);
    updatePreview();
  });

  let drag = null;
  widget.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const rect = widget.getBoundingClientRect();
    drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    widget.classList.add("dragging");
    try { widget.setPointerCapture(e.pointerId); } catch {}
  });
  widget.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const stageRect = stage.getBoundingClientRect();
    applyFromLeftTop(e.clientX - stageRect.left - drag.dx, e.clientY - stageRect.top - drag.dy);
  });
  const endDrag = (e) => {
    if (!drag) return;
    drag = null;
    widget.classList.remove("dragging");
    try { widget.releasePointerCapture?.(e.pointerId); } catch {}
  };
  widget.addEventListener("pointerup", endDrag);
  widget.addEventListener("pointercancel", endDrag);
  window.addEventListener("resize", updatePreview);
  updatePreview();
  return updatePreview;
}

let syncOverlayEditors = null;
function initOverlayEditors() {
  const editors = [
    setupOverlayEditor({
      scaleInput: "crown_overlay_scale", rightInput: "crown_overlay_right", bottomInput: "crown_overlay_bottom",
      scaleSlider: "crownScaleSlider", scaleReadout: "crownScaleReadout", rightReadout: "crownRightReadout", bottomReadout: "crownBottomReadout",
      stage: "crownPreviewStage", widget: "crownPreviewWidget",
      nudgeUp: "crownNudgeUp", nudgeLeft: "crownNudgeLeft", nudgeDown: "crownNudgeDown", nudgeRight: "crownNudgeRight",
      presetDefault: "crownPresetDefault", presetSecondary: "crownPresetHigher",
      defaultScale: 100, defaultRight: 34, defaultBottom: 34, secondaryBottom: 90, baseWidth: 270, baseHeight: 72,
    }),
    setupOverlayEditor({
      scaleInput: "sub_goal_overlay_scale", rightInput: "sub_goal_overlay_right", bottomInput: "sub_goal_overlay_bottom",
      scaleSlider: "subGoalScaleSlider", scaleReadout: "subGoalScaleReadout", rightReadout: "subGoalRightReadout", bottomReadout: "subGoalBottomReadout",
      stage: "subGoalPreviewStage", widget: "subGoalPreviewWidget",
      nudgeUp: "subGoalNudgeUp", nudgeLeft: "subGoalNudgeLeft", nudgeDown: "subGoalNudgeDown", nudgeRight: "subGoalNudgeRight",
      presetDefault: "subGoalPresetDefault", presetSecondary: "subGoalPresetLower",
      defaultScale: 100, defaultRight: 34, defaultBottom: 132, secondaryBottom: 180, baseWidth: 270, baseHeight: 68,
    }),
  ];
  syncOverlayEditors = () => editors.forEach((fn) => fn && fn());
}

function paintLogs(logs = []) {
  const host = $("logsList");
  host.innerHTML = "";
  for (const log of logs) {
    const row = document.createElement("div");
    row.className = "log-row";
    const date = new Date(String(log.created_at).replace(" ", "T") + "Z");
    row.innerHTML = `<time>${date.toLocaleString()}</time><span class="log-type">${esc(log.type)}</span><span class="log-user">${esc(log.username || "—")}</span><span>${esc(log.message)}</span>`;
    host.appendChild(row);
  }
  if (!logs.length) host.innerHTML = '<p class="hint">Todavía no hay actividad.</p>';
}

async function loadLogs() {
  try {
    const data = await api("/logs");
    paintLogs(data.logs || []);
  } catch {}
}

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}

$("unlockButton").addEventListener("click", unlock);
$("adminKeyInput").addEventListener("keydown", e => { if (e.key === "Enter") unlock(); });
$("saveButton").addEventListener("click", saveConfig);
$("connectKick").addEventListener("click", connectKick);
$("syncEvents").addEventListener("click", syncEvents);
$("syncAllRewards").addEventListener("click", () => syncReward(0));
for (let slot = 1; slot <= 4; slot++) {
  $(`syncReward${slot}`).addEventListener("click", () => syncReward(slot));
  $(`testVoice${slot}`).addEventListener("click", () => testTts(slot));
}
$("testChat").addEventListener("click", testChat);
$("refreshLogs").addEventListener("click", loadLogs);
$("copyOverlay").addEventListener("click", async () => { await navigator.clipboard.writeText($("overlayUrl").value); showNotice("URL copiada."); });
$("addCommand").addEventListener("click", () => {
  const host = $("commandsList");
  if (host.querySelector(".hint")) host.innerHTML = "";
  const row = commandRow();
  host.prepend(row);
  row.querySelector(".command-name").focus();
});
$("lockButton").addEventListener("click", () => { localStorage.removeItem("streambot_admin_key"); adminKey = ""; $("adminKeyInput").value = ""; $("lockScreen").classList.remove("hidden"); });
if ($("addMod")) $("addMod").addEventListener("click", addMod);
if ($("newModUsername")) $("newModUsername").addEventListener("keydown", e => { if (e.key === "Enter") addMod(); });
if ($("crownShowTop")) $("crownShowTop").addEventListener("click", crownShowTop);
if ($("crownTestAlert")) $("crownTestAlert").addEventListener("click", crownTestAlert);
if ($("crownRelease")) $("crownRelease").addEventListener("click", crownRelease);

initOverlayEditors();

document.querySelectorAll(".nav-link").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b === button));
  document.querySelectorAll(".panel-section").forEach(s => s.classList.remove("active"));
  $(`section-${button.dataset.section}`).classList.add("active");
  if (typeof syncOverlayEditors === "function") syncOverlayEditors();
  if (button.dataset.section === "logs") loadLogs();
  if (button.dataset.section === "mods") loadMods();
  if (button.dataset.section === "crown") loadCrown();
}));

(async () => {
  if (new URLSearchParams(location.search).get("connected")) history.replaceState(null, "", "/streambot.html");

  // Con una key ya guardada, ocultamos el cartel inmediatamente y cargamos
  // todo el dashboard con una sola llamada al backend.
  if (adminKey) {
    $("lockScreen").classList.add("hidden");
    try {
      await loadAll();
      return;
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        localStorage.removeItem("streambot_admin_key");
        adminKey = "";
        $("unlockError").textContent = "La clave guardada ya no es válida. Ingresala de nuevo.";
        $("lockScreen").classList.remove("hidden");
      } else {
        // Un error temporal no borra la key ni vuelve a mostrar el login.
        showNotice(`No pude cargar el dashboard (${err.message}). Probá recargar.`, true);
      }
      return;
    }
  }

  $("lockScreen").classList.remove("hidden");
})();
