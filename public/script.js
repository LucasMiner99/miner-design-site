
// YouTube auto loader.
// The Worker endpoint /api/youtube reads the channel RSS feed and returns JSON.

async function loadYouTubeVideos() {
  const grids = document.querySelectorAll("[data-youtube-grid]");
  if (!grids.length) return;

  try {
    const data = await fetchJsonWithRetry("/api/youtube?limit=8&v=ytapi1", 3);
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

async function fetchJsonWithRetry(url, attempts = 3) {
  let lastError;

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data && Array.isArray(data.videos)) return data;

      throw new Error("Respuesta inválida");
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 450 * (i + 1)));
    }
  }

  throw lastError || new Error("Fetch error");
}

function renderVideoCard(video) {
  return `
    <a class="card video-card" href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">
      <div class="thumb youtube-thumb" style="background-image: url('${escapeHtml(video.thumbnail)}');">
        <span class="duration">YouTube</span>
      </div>
      <h3>${escapeHtml(video.title)}</h3>
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


// Gumroad auto loader.
// The Worker endpoint /api/gumroad-products reads product metadata and cover images from Gumroad.

async function loadGumroadProducts() {
  const grids = document.querySelectorAll("[data-gumroad-grid]");
  if (!grids.length) return;

  try {
    const response = await fetch("/api/gumroad-products?v=coverauto9");
    if (!response.ok) throw new Error("Gumroad API error");

    const data = await response.json();
    const products = Array.isArray(data.products) ? data.products : [];
    if (!products.length) return;

    grids.forEach((grid) => {
      const type = grid.dataset.type;
      const limit = Number(grid.dataset.limit) || 99;
      const filtered = products
        .filter((product) => !type || product.type === type)
        .slice(0, limit);

      if (!filtered.length) return;

      grid.innerHTML = filtered.map(renderGumroadCard).join("");
    });

    bindMouseGlow();
  } catch (error) {
    console.warn("No se pudieron cargar los productos de Gumroad. Se dejan las cards fallback.", error);
  }
}

function renderGumroadCard(product) {
  const isCourse = product.type === "course";
  const articleClass = isCourse ? "product-card" : "file-card";
  const colorClass = isCourse ? "green" : "blue";
  const buttonClass = isCourse ? "green-button" : "blue-button";
  const labelClass = isCourse ? "badge green" : "tag blue";

  const imageStyle = product.image
    ? `style="background-image: url('${escapeHtml(product.image)}');"`
    : "";

  const fallbackClass = product.fallbackClass || (isCourse ? "thumb-lowpoly" : "thumb-materials");
  const thumbClass = product.image ? "thumb gumroad-thumb" : `thumb ${fallbackClass}`;

  const footer = "";

  return `
        <article class="card ${articleClass}">
          <div class="${thumbClass}" ${imageStyle}></div>
          <span class="${labelClass}">${escapeHtml(product.label || "")}</span>
          <h3>${escapeHtml(product.title || "")}</h3>
          <p>${escapeHtml(product.description || "")}</p>${footer}
          <a href="${escapeHtml(product.url)}" class="download ${buttonClass}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(product.cta || "Ver en Gumroad")}
            <span class="icon icon-stroke">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14"></path>
                <path d="m13 6 6 6-6 6"></path>
              </svg>
            </span>
          </a>
        </article>
  `;
}

loadGumroadProducts();
