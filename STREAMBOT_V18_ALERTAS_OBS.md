# MinerBot V18 — Alertas OBS

Se agregó `alerts-overlay.html` como fuente de navegador independiente, con el logo
`LOGO_PNG.png` y `notification_sound.mp3` proporcionados por el usuario.

## Primer arranque

1. Reemplazá los archivos de la web con los de este ZIP y subí el proyecto como siempre.
2. Dashboard (`/streambot`) → **Alertas OBS**. Revisá controles y copiá la URL.
3. En OBS añadí **Fuente de navegador nueva** a resolución sugerida **960 × 300**;
   habilitá el sonido de esa fuente.
4. En el dashboard, **General → Sincronizar eventos** una vez para agregar
   `kicks.gifted` (los otros eventos ya estaban incluidos en V17).
5. Desde **Alertas OBS**, probá botones de follow/sub/regalos/kicks antes de esperar eventos reales.

## Eventos oficiales automáticos

- `channel.followed` → nuevo seguidor
- `channel.subscription.new` → suscriptor
- `channel.subscription.renewal` → renovación
- `channel.subscription.gifts` → subs regaladas
- `kicks.gifted` → regalo de KICKs

**Raid** y **Host** tienen diseño y botones de prueba, pero no se activan
solos: actualmente Kick no los incluye en su lista oficial de eventos por webhook.
No se usan endpoints internos no documentados para simular compatibilidad.

## Características

- Cola de alertas FIFO, sin solapamientos; cada evento suena una vez.
- Animación de entrada ~260 ms, salida ~195 ms, barra de duración (sin destello diagonal).
- Zalando Sans Expanded con respaldo Zalando Sans.
- Fuente responsive: transparencia completa; escala global configurable desde dashboard.
- Sound MP3 local, volumen y activación en dashboard.
- D1 `streambot_alert_events`: tabla creada automáticamente en la primera consulta o alerta,
  con últimos 100 eventos y recuperación tras cortes cortos de WebSocket.
- Endpoint protegido con overlay_key: `GET /api/streambot/alerts/state`.
- Endpoint de prueba con clave admin: `POST /api/streambot/alerts/test`.
- Las alertas reales siguen funcionando aunque se desactive `bot_enabled`.
- Pruebas no alteran subs, contador, comandos ni mandan mensajes a Kick.

Si agregás **dos fuentes con el mismo enlace**, ambas van a mostrar y reproducir
las alertas; silenciá una en el mezclador de OBS si no querés audio duplicado.

No requiere agregar binding ni ejecutar una migración SQL manual en Cloudflare.
