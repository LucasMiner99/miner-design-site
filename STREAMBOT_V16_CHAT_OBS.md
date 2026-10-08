# MinerBot V16 — Chat OBS

El ZIP contiene todo el sitio, integrado a la base V15 de Limpiando. No requiere crear otro bot ni ejecutar SQL manualmente.

## Puesta en marcha

1. Subir el sitio al mismo proyecto de Cloudflare con el flujo habitual (reemplazar archivos + push).
2. Entrar al dashboard `/streambot`, sección **Chat OBS**. Confirmar que esté activo y guardar ajustes.
3. En **General**, con Kick conectado, tocar **Sincronizar eventos** si no llegan mensajes reales. El evento `chat.message.sent` ya figura en EVENT_TYPES del bot.
4. Copiar una URL a OBS (Browser Source) y usar **Probar mensaje en OBS**. Luego probar con un mensaje real de Kick y un emote de 7TV.

## URL y dimensiones recomendadas

- Compacta: 420 × 650 px. La URL compacta usa los controles del dashboard.
- Ancha: 720 × 500 px. La URL ancha sobrescribe 4 mensajes y 23 px de texto; el resto toma los controles del dashboard.
- Ambas con transparencia y ajuste automático del ancho del globo a la fuente OBS.
- Overrides por URL: `max=5`, `font=18`, `duration=35`, `speed=195`, `gap=8` (añadir con `&`).

## Funciones

- Nombre al color `sender.identity.username_color` de Kick.
- Todas las badges listadas en `sender.identity.badges` del webhook, con tipo, texto y recuento si aplica. Kick no entrega URL de imagen de badge en este payload: se muestran como etiquetas nativas de estilo MinerBot; **no se copian exactamente los gráficos propios de Kick**.
- Emotes nativos de Kick a través de `files.kick.com/emotes/{id}/fullsize`.
- 7TV global y, cuando está vinculado, emotes del canal bajo `7tv.io/v3/users/kick/{kickUserId}`; se cargan mediante `/api/streambot/chat/emotes` y se refrescan cada 15 min. 7TV es un servicio externo y puede fallar temporalmente o requerir vinculación del canal.
- WebSocket del Durable Object existente. Si OBS se desconecta, reconecta solo. Historial muy corto de mensajes recientes en D1 (tabla autocreada al primer mensaje).
- Máximo configurable 1–10, 5 por defecto; duración 0–180 s; texto 11–38 px; animación 100–450 ms; separación 0–24 px; ocultar comandos opcional.

## Cambios previos conservados

- Limpiando y su infraestructura V15 continúan sin cambios de rutas ni tablas.
- Límite del turbo del pingüino subido a 500 FPS en frontend, Worker y limpieza (como se había pedido).
- Baile ajustado a 24 FPS (la versión V15 original usaba 10 FPS).

## Limitaciones

No probamos eventos reales contra la cuenta Kick de producción, solo rutas simuladas y la representación/recepción de mensajes por WebSocket en Chromium. Si 7TV o imágenes de badges requieren ajustes para un canal particular, comprobarlo después del despliegue.
