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
  "tts_enabled","tts_reward_title","tts_reward_cost","tts_max_chars","tts_daily_chars","tts_voice_id","tts_volume"
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
  $("rewardStatus").textContent = status.rewardConfigured ? "Configurada" : "Sin crear";
  $("queueStatus").textContent = String(status.queueCount || 0);
  $("overlayUrl").value = status.overlayUrl || "";
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
    showNotice("Cambios guardados.");
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

async function syncReward() {
  try {
    await api("/config", { method: "PUT", body: JSON.stringify(collectConfig()) });
    await api("/reward/sync", { method: "POST" });
    status = await api("/status");
    paintStatus();
    showNotice("Recompensa TTS sincronizada con Kick.");
  } catch (err) { showNotice(err.message, true); }
}

async function testChat() {
  try { await api("/test/chat", { method: "POST" }); showNotice("Mensaje enviado al chat."); }
  catch (err) { showNotice(err.message, true); }
}

async function testTts() {
  try {
    const text = $("testTtsText").value.trim();
    await api("/test/tts", { method: "POST", body: JSON.stringify({ text }) });
    showNotice("TTS enviado a la cola de OBS.");
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
$("syncReward").addEventListener("click", syncReward);
$("testChat").addEventListener("click", testChat);
$("testTts").addEventListener("click", testTts);
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

document.querySelectorAll(".nav-link").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b === button));
  document.querySelectorAll(".panel-section").forEach(s => s.classList.remove("active"));
  $(`section-${button.dataset.section}`).classList.add("active");
  if (button.dataset.section === "logs") loadLogs();
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
