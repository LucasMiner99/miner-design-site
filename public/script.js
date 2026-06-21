
// YouTube auto loader.
// The Worker endpoint /api/youtube reads the channel RSS feed and returns JSON.

async function loadYouTubeVideos() {
  const grids = document.querySelectorAll("[data-youtube-grid]");
  if (!grids.length) return;

  try {
    const response = await fetch("/api/youtube?limit=8");
    if (!response.ok) throw new Error("YouTube API error");

    const data = await response.json();
    const videos = Array.isArray(data.videos) ? data.videos : [];
    if (!videos.length) return;

    grids.forEach((grid) => {
      const limit = Number(grid.dataset.limit) || videos.length;
      grid.innerHTML = videos.slice(0, limit).map(renderVideoCard).join("");
    });

    bindMouseGlow();
  } catch (error) {
    console.warn("No se pudieron cargar los videos automáticos. Se dejan las cards de ejemplo.", error);
  }
}

function renderVideoCard(video) {
  return `
    <a class="card video-card" href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">
      <div class="thumb youtube-thumb" style="background-image: url('${escapeHtml(video.thumbnail)}');">
        <span class="duration">YouTube</span>
      </div>
      <h3>${escapeHtml(video.title)}</h3>
      <p>Nuevo tutorial de Blender en Miner Design.</p>
      <small>${escapeHtml(video.publishedText || "")}</small>
    </a>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindMouseGlow() {
  const hoverTargets = document.querySelectorAll(
    ".card, .button, .community-button, .social-link, .nav-button, .download"
  );

  hoverTargets.forEach((element) => {
    if (element.dataset.glowReady === "true") return;
    element.dataset.glowReady = "true";

    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      element.style.setProperty("--mx", `${x}px`);
      element.style.setProperty("--my", `${y}px`);
    });
  });
}

bindMouseGlow();
loadYouTubeVideos();
