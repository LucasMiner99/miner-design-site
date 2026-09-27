# MinerBot v10 — Realtime Overlay

Esta versión reemplaza el polling constante del overlay/control por WebSockets sobre un Durable Object de Cloudflare.

## Qué cambia

- El Browser Source ya no consulta media cada 450 ms.
- El TTS ya no consulta la cola cada 900 ms.
- El panel de control ya no refresca la escena cada 1.3 s.
- Arrastrar/redimensionar envía previews por WebSocket (~30 fps) y guarda en D1 una sola vez al soltar.
- Si el WebSocket falla, el Browser Source cae a un polling de emergencia cada 15 segundos.

## Instalación

No hay migración D1 nueva y no hay secrets nuevos.

El `wrangler.toml` incluido agrega:

```toml
[[durable_objects.bindings]]
name = "OVERLAY_ROOM"
class_name = "OverlayRoom"

[exports.OverlayRoom]
type = "durable-object"
storage = "sqlite"
```

Hacé commit + push. Wrangler crea la namespace SQLite del Durable Object durante el deploy.

Después del deploy:

1. Refrescá una vez el Browser Source de MinerBot en OBS.
2. Recargá `/control.html`.
3. Mostrá una imagen y arrastrala. OBS debería seguirla casi en tiempo real.
4. Probá un TTS para confirmar que sigue llegando sin polling.

## Archivos principales modificados

- `src/index.js`
- `src/streambot.js`
- `src/realtime.js` (nuevo)
- `public/control.js`
- `public/tts-overlay.html`
- `wrangler.toml`
