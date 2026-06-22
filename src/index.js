const CHANNEL_ID = "UC7ICe-QlKsiyClI3uA8WU3g";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const GUMROAD_API_URL = "https://api.gumroad.com/v2/products";

// Ajustes manuales por producto.
// La API trae la lista automáticamente, pero acá definimos cómo se muestra cada producto.
const PRODUCT_OVERRIDES = {
  md_blender_principiantes: {
    type: "course",
    title: "Blender para Principiantes",
    description: "Aprendé Blender desde cero con una guía clara para empezar a modelar, iluminar y renderizar tus primeras escenas.",
    label: "Curso",
    meta: "",
    cta: "Ver curso",
    fallbackClass: "thumb-course-fallback",
  },
  espuma_shader: {
    type: "file",
    title: "Shader de Espuma Realista",
    description: "Material procedural para crear espuma realista en Blender, ideal para agua, mar, costas y renders con detalle.",
    label: "Shader",
    meta: "Recurso digital · Blender",
    cta: "Ver en Gumroad",
    fallbackClass: "thumb-materials",
  },
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/youtube") {
      return handleYouTube(request, ctx);
    }

    if (url.pathname === "/api/gumroad-products") {
      return handleGumroadProducts(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleYouTube(request, ctx) {
  const url = new URL(request.url);
  const limit = clamp(Number(url.searchParams.get("limit")) || 8, 1, 12);

  const cache = caches.default;
  const cacheKey = new Request(`https://minerdesign.local/youtube-cache-stable-v2?limit=${limit}`);
  const cached = await cache.match(cacheKey);

  try {
    let videos = await fetchYouTubeFromFeed(limit);

    // Fallback: si el RSS falla o viene vacío, intentamos leer la página de videos del canal.
    if (!videos.length) {
      videos = await fetchYouTubeFromChannelPage(limit);
    }

    if (videos.length) {
      const response = json({ videos, source: "live" }, 200, {
        "Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
      });

      if (ctx && ctx.waitUntil) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      } else {
        await cache.put(cacheKey, response.clone());
      }

      return response;
    }
  } catch (error) {
    // Si YouTube falla, seguimos abajo y usamos la última respuesta buena cacheada.
  }

  if (cached) {
    return cached;
  }

  return json({
    error: "No se encontraron videos de YouTube y todavía no hay cache guardado.",
    videos: [],
    source: "empty",
  }, 200, {
    "Cache-Control": "no-store",
  });
}

async function fetchYouTubeFromFeed(limit) {
  const response = await fetch(FEED_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 MinerDesignWebsite/1.0",
      "Accept": "application/rss+xml, application/xml, text/xml,*/*",
    },
    cf: {
      cacheTtl: 600,
      cacheEverything: true,
    },
  });

  if (!response.ok) return [];

  const xml = await response.text();
  return parseYouTubeFeed(xml).slice(0, limit);
}

async function fetchYouTubeFromChannelPage(limit) {
  const response = await fetch("https://www.youtube.com/@MinerDesign/videos", {
    headers: {
      "User-Agent": "Mozilla/5.0 MinerDesignWebsite/1.0",
      "Accept": "text/html,*/*",
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
    },
    cf: {
      cacheTtl: 600,
      cacheEverything: true,
    },
  });

  if (!response.ok) return [];

  const html = await response.text();
  const videos = [];
  const seen = new Set();

  const regex = /"videoId":"([^"]+)"[\s\S]{0,900}?"title":\{"runs":\[\{"text":"([^"]+)"/g;
  let match;

  while ((match = regex.exec(html)) && videos.length < limit) {
    const id = match[1];
    const title = decode(match[2]);

    if (!id || !title || seen.has(id)) continue;

    seen.add(id);
    videos.push({
      id,
      title,
      author: "MinerDesign",
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      published: "",
      publishedText: "",
    });
  }

  return videos;
}

async function handleGumroadProducts(request, env) {
  try {
    if (!env.GUMROAD_ACCESS_TOKEN) {
      return json({
        error: "Falta configurar el secret GUMROAD_ACCESS_TOKEN en Cloudflare.",
      }, 500);
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    const rawProducts = await fetchGumroadProducts(env.GUMROAD_ACCESS_TOKEN);
    let products = rawProducts
      .map(normalizeGumroadProduct)
      .filter(Boolean)
      .filter((product) => product.url);

    products = dedupeProducts(products);

    if (type) {
      products = products.filter((product) => product.type === type);
    }

    // Si Gumroad no devuelve imagen, intentamos leer og:image de la página pública.
    const enriched = await Promise.all(products.map(enrichGumroadImage));

    return json({ products: enriched }, 200, {
      "Cache-Control": "no-store",
    });
  } catch (error) {
    return json({
      error: "Error cargando productos de Gumroad.",
      detail: error && error.message ? error.message : String(error),
    }, 500);
  }
}

async function fetchGumroadProducts(accessToken) {
  // Gumroad documenta que el token se usa en el header.
  // Dejamos fallback por query param porque algunas integraciones viejas de Gumroad lo usaban así.
  const attempts = [
    {
      url: GUMROAD_API_URL,
      options: {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
        },
      },
    },
    {
      url: `${GUMROAD_API_URL}?access_token=${encodeURIComponent(accessToken)}`,
      options: {
        headers: {
          "Accept": "application/json",
        },
      },
    },
  ];

  let lastError = "";

  for (const attempt of attempts) {
    const response = await fetch(attempt.url, {
      ...attempt.options,
      cf: {
        cacheTtl: 1800,
        cacheEverything: true,
      },
    });

    const text = await response.text();

    if (!response.ok) {
      lastError = `Gumroad respondió ${response.status}: ${text.slice(0, 180)}`;
      continue;
    }

    const data = JSON.parse(text);
    if (data && data.success === false) {
      lastError = data.message || "Gumroad devolvió success:false";
      continue;
    }

    return Array.isArray(data.products) ? data.products : [];
  }

  throw new Error(lastError || "No se pudo conectar con Gumroad.");
}

function normalizeGumroadProduct(product) {
  const permalink = getPermalink(product);
  const overrides = PRODUCT_OVERRIDES[permalink] || {};
  const title = overrides.title || product.name || product.title || "Producto";
  const type = overrides.type || inferProductType(title, permalink);
  const url = product.short_url || product.url || product.long_url || product.preview_url || `https://minerdesign.gumroad.com/l/${permalink}`;
  const image = pickBestProductImage(getImageCandidatesFromProduct(product), { title, permalink });

  // Intentamos ocultar productos borradores/deshabilitados si Gumroad manda ese dato.
  if (product.deleted || product.archived || product.is_deleted) return null;
  if (product.published === false || product.is_published === false) return null;

  return {
    id: product.id || permalink || slugify(title),
    permalink,
    type,
    title,
    description: overrides.description || cleanDescription(product.description || product.custom_summary || product.summary || ""),
    label: overrides.label || (type === "course" ? "Curso" : "Recurso"),
    meta: overrides.meta || getMeta(product, type),
    cta: overrides.cta || (type === "course" ? "Ver curso" : "Ver en Gumroad"),
    url,
    image,
    fallbackClass: overrides.fallbackClass || (type === "course" ? "thumb-lowpoly" : "thumb-materials"),
    price: product.formatted_price || product.price_formatted || "",
  };
}

async function enrichGumroadImage(product) {
  if (product.image || !product.url || product.forceNoImage || product.skipPageImageFallback) return product;

  try {
    const response = await fetch(product.url, {
      headers: {
        "User-Agent": "MinerDesignWebsite/1.0",
        "Accept": "text/html,application/xhtml+xml",
      },
      cf: {
        cacheTtl: 1800,
        cacheEverything: true,
      },
    });

    if (!response.ok) return product;

    const html = await response.text();
    const image =
      meta(html, "og:image") ||
      meta(html, "twitter:image") ||
      "";

    return {
      ...product,
      image,
    };
  } catch (error) {
    return product;
  }
}


function dedupeProducts(products) {
  const seen = new Set();
  const output = [];

  for (const product of products) {
    const key = productKey(product);
    if (seen.has(key)) continue;

    seen.add(key);
    output.push(product);
  }

  return output;
}

function productKey(product) {
  // Primero intentamos deduplicar por permalink/link.
  // Si Gumroad duplicó productos con URLs distintas pero mismo título, usamos el título normalizado.
  const permalink = normalizeKey(product.permalink || "");
  const title = normalizeKey(product.title || "");

  if (permalink) return `permalink:${permalink}`;
  if (title) return `title:${title}`;

  return `id:${product.id}`;
}

function normalizeKey(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*copy\s*\d*$/i, "")
    .replace(/\s*copia\s*\d*$/i, "")
    .replace(/\s*\(\s*copy\s*\d*\s*\)$/i, "")
    .replace(/\s*\(\s*copia\s*\d*\s*\)$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}


function getPermalink(product) {
  const fromProduct =
    product.custom_permalink ||
    product.permalink ||
    product.unique_permalink ||
    product.slug ||
    product.product_permalink ||
    "";

  if (fromProduct) return String(fromProduct).trim();

  const url = product.short_url || product.url || product.long_url || product.preview_url || "";
  const match = String(url).match(/\/l\/([^/?#]+)/i);
  return match ? match[1] : "";
}

function getImageCandidatesFromProduct(product) {
  const candidates = [];

  const directKeys = [
    "thumbnail_url",
    "cover_url",
    "cover_image_url",
    "image_url",
    "picture_url",
    "customizable_price_image_url",
  ];

  for (const key of directKeys) {
    addImageCandidate(candidates, product[key], `api:${key}`);
  }

  collectImageUrls(product.previews, candidates, "api:previews");
  collectImageUrls(product.covers, candidates, "api:covers");
  collectImageUrls(product.images, candidates, "api:images");
  collectImageUrls(product.product_images, candidates, "api:product_images");
  collectImageUrls(product.preview_images, candidates, "api:preview_images");
  collectImageUrls(product.content, candidates, "api:content");

  return candidates;
}

function getImageCandidatesFromHtml(html) {
  const candidates = [];

  addImageCandidate(candidates, meta(html, "og:image"), "html:og:image");
  addImageCandidate(candidates, meta(html, "twitter:image"), "html:twitter:image");
  addImageCandidate(candidates, meta(html, "thumbnail"), "html:thumbnail");

  const attrRegex = /(src|href|content)=["']([^"']+\.(?:png|jpe?g|webp)(?:\?[^"']*)?)["']/gi;
  let attrMatch;

  while ((attrMatch = attrRegex.exec(html))) {
    addImageCandidate(candidates, decodeHtmlUrl(attrMatch[2]), `html:${attrMatch[1]}`);
  }

  const srcsetRegex = /srcset=["']([^"']+)["']/gi;
  let srcsetMatch;

  while ((srcsetMatch = srcsetRegex.exec(html))) {
    const parts = srcsetMatch[1].split(",");
    for (const part of parts) {
      const url = part.trim().split(/\s+/)[0];
      addImageCandidate(candidates, decodeHtmlUrl(url), "html:srcset");
    }
  }

  const escapedRegex = /https?:\\\/\\\/[^"'\\]+?(?:png|jpe?g|webp)(?:\\\?[^"'\\]*)?/gi;
  let escapedMatch;

  while ((escapedMatch = escapedRegex.exec(html))) {
    addImageCandidate(candidates, decodeHtmlUrl(escapedMatch[0]), "html:json-escaped");
  }

  const plainRegex = /https?:\/\/[^"'<>\\]+?(?:png|jpe?g|webp)(?:\?[^"'<>\\]*)?/gi;
  let plainMatch;

  while ((plainMatch = plainRegex.exec(html))) {
    addImageCandidate(candidates, decodeHtmlUrl(plainMatch[0]), "html:script-url");
  }

  return candidates;
}

function collectImageUrls(value, candidates, source = "api:nested") {
  if (!value) return;

  if (typeof value === "string") {
    addImageCandidate(candidates, value, source);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectImageUrls(item, candidates, `${source}[${index}]`));
    return;
  }

  if (typeof value === "object") {
    const keys = [
      "url",
      "src",
      "image",
      "image_url",
      "thumbnail_url",
      "cover_url",
      "cover_image_url",
      "large_url",
      "original_url",
      "file_url",
    ];

    for (const key of keys) {
      addImageCandidate(candidates, value[key], `${source}.${key}`);
    }

    for (const [key, nested] of Object.entries(value)) {
      if (/image|thumb|cover|preview|asset|file/i.test(key)) {
        collectImageUrls(nested, candidates, `${source}.${key}`);
      }
    }
  }
}

function addImageCandidate(candidates, value, source = "") {
  if (!value || typeof value !== "string") return;

  const url = decodeHtmlUrl(value).trim();

  if (!/^https?:\/\//i.test(url)) return;
  if (!/\.(png|jpe?g|webp)(\?|#|$)/i.test(url) && !/gumlet|cloudfront|s3|public-files/i.test(url)) return;

  candidates.push({ url, source });
}

function pickBestProductImage(candidates, product = {}) {
  const unique = new Map();

  for (const candidate of candidates) {
    if (!candidate || !candidate.url) continue;
    const clean = cleanupImageUrl(candidate.url);
    if (!clean) continue;
    if (!unique.has(clean)) unique.set(clean, { ...candidate, url: clean });
  }

  let best = null;
  let bestScore = -9999;

  for (const candidate of unique.values()) {
    const score = scoreProductImage(candidate.url, product, candidate.source || "");

    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best && bestScore >= 25 ? best.url : "";
}

function scoreProductImage(url, product = {}, source = "") {
  const clean = String(url).toLowerCase();
  const sourceClean = String(source).toLowerCase();
  const permalink = normalizeKey(product.permalink || "");
  const title = normalizeKey(product.title || "");
  const dimensions = getImageDimensionsFromUrl(clean);

  let score = 0;

  if (/gumroad|gumlet|cloudfront|s3|public-files/.test(clean)) score += 25;

  if (/cover|preview|product|asset|image/.test(clean)) score += 30;
  if (/cover|preview|product|asset|image/.test(sourceClean)) score += 20;

  if (permalink && clean.includes(permalink)) score += 35;
  if (title && clean.includes(title)) score += 15;

  if (dimensions.width || dimensions.height) {
    const maxSide = Math.max(dimensions.width || 0, dimensions.height || 0);
    const minSide = Math.min(dimensions.width || 9999, dimensions.height || 9999);

    if (maxSide >= 900) score += 45;
    else if (maxSide >= 600) score += 35;
    else if (maxSide >= 320) score += 18;
    else score -= 80;

    if (minSide && minSide <= 180) score -= 45;
  }

  if (/\.(ico|svg)(\?|#|$)/.test(clean)) score -= 200;
  if (/favicon|avatar|profile|userpic|apple-touch-icon|\/icons?\//.test(clean)) score -= 160;

  if (/logo/.test(clean)) score -= 45;
  if (/thumb|thumbnail/.test(clean)) score -= dimensions.width && dimensions.width < 500 ? 55 : 10;

  return score;
}

function getImageDimensionsFromUrl(url) {
  const widthMatch = url.match(/[?&](?:w|width)=([0-9]+)/i) || url.match(/(?:_|-)([0-9]{3,4})x[0-9]{3,4}/i);
  const heightMatch = url.match(/[?&](?:h|height)=([0-9]+)/i) || url.match(/(?:_|-)[0-9]{3,4}x([0-9]{3,4})/i);

  return {
    width: widthMatch ? Number(widthMatch[1]) : 0,
    height: heightMatch ? Number(heightMatch[1]) : 0,
  };
}

function cleanupImageUrl(url) {
  return decodeHtmlUrl(url)
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .trim();
}

function decodeHtmlUrl(value) {
  return String(value)
    .replace(/\\\//g, "/")
    .replace(/\\u002F/gi, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/g, "/")
    .replace(/&#47;/g, "/")
    .replace(/&quot;/g, '"');
}

function getMeta(product, type) {
  if (product.formatted_price) return product.formatted_price;
  if (product.price_formatted) return product.price_formatted;
  return type === "course" ? "Curso digital" : "Recurso digital";
}

function inferProductType(title, permalink) {
  const value = `${title} ${permalink}`.toLowerCase();

  if (
    value.includes("curso") ||
    value.includes("course") ||
    value.includes("principiante") ||
    value.includes("beginner") ||
    value.includes("blender_principiantes")
  ) {
    return "course";
  }

  return "file";
}

function cleanDescription(value) {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function parseYouTubeFeed(xml) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => match[1]);

  return entries.map((entry) => {
    const videoId = text(entry, /<yt:videoId>([\s\S]*?)<\/yt:videoId>/);
    const title = decode(text(entry, /<title>([\s\S]*?)<\/title>/));
    const published = text(entry, /<published>([\s\S]*?)<\/published>/);
    const author = decode(text(entry, /<name>([\s\S]*?)<\/name>/));

    return {
      id: videoId,
      title,
      author,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      published,
      publishedText: relativeDate(published),
    };
  }).filter((video) => video.id && video.title);
}

function meta(html, property) {
  const escaped = property.replace(":", "\\:");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decode(match[1].trim());
  }

  return "";
}

function text(input, regex) {
  const match = input.match(regex);
  return match ? match[1].trim() : "";
}

function decode(value) {
  return String(value)
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function relativeDate(dateString) {
  const published = new Date(dateString);
  const now = new Date();
  const diffMs = now - published;
  const diffDays = Math.max(0, Math.floor(diffMs / 86400000));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "Hace 1 semana";
  if (diffWeeks < 5) return `Hace ${diffWeeks} semanas`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths <= 1) return "Hace 1 mes";
  if (diffMonths < 12) return `Hace ${diffMonths} meses`;

  const diffYears = Math.floor(diffDays / 365);
  return diffYears <= 1 ? "Hace 1 año" : `Hace ${diffYears} años`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}
