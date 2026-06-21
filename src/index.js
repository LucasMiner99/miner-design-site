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
    meta: "Curso completo · Principiante",
    cta: "Ver curso",
    fallbackClass: "thumb-lowpoly",
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
      return handleYouTube(request);
    }

    if (url.pathname === "/api/gumroad-products") {
      return handleGumroadProducts(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleYouTube(request) {
  try {
    const limit = clamp(Number(new URL(request.url).searchParams.get("limit")) || 8, 1, 12);
    const response = await fetch(FEED_URL, {
      headers: {
        "User-Agent": "MinerDesignWebsite/1.0",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      cf: {
        cacheTtl: 1800,
        cacheEverything: true,
      },
    });

    if (!response.ok) {
      return json({ error: "No se pudo leer el feed de YouTube." }, 502);
    }

    const xml = await response.text();
    const videos = parseYouTubeFeed(xml).slice(0, limit);

    return json({ videos }, 200, {
      "Cache-Control": "public, max-age=1800",
    });
  } catch (error) {
    return json({ error: "Error cargando videos de YouTube." }, 500);
  }
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

    if (type) {
      products = products.filter((product) => product.type === type);
    }

    // Si Gumroad no devuelve imagen, intentamos leer og:image de la página pública.
    const enriched = await Promise.all(products.map(enrichGumroadImage));

    return json({ products: enriched }, 200, {
      "Cache-Control": "public, max-age=1800",
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
  const image = getImage(product);

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
  if (product.image || !product.url) return product;

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

function getImage(product) {
  const candidates = [
    product.thumbnail_url,
    product.cover_url,
    product.cover_image_url,
    product.preview_url,
    product.image_url,
    product.picture_url,
    product.customizable_price_image_url,
  ];

  for (const candidate of candidates) {
    if (candidate && /^https?:\/\//i.test(candidate)) return candidate;
  }

  if (Array.isArray(product.previews) && product.previews.length) {
    const preview = product.previews[0];
    if (typeof preview === "string") return preview;
    if (preview && preview.url) return preview.url;
  }

  return "";
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
