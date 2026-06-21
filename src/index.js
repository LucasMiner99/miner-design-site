const CHANNEL_ID = "UC7ICe-QlKsiyClI3uA8WU3g";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/youtube") {
      return handleYouTube(request);
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

function text(input, regex) {
  const match = input.match(regex);
  return match ? match[1].trim() : "";
}

function decode(value) {
  return value
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
