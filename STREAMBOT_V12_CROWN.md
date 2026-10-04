# MinerBot v12 — The Crown

## Qué agrega

- Widget compacto de Corona dentro del mismo `tts-overlay.html` que ya usa OBS.
- `!robar`: reclama la corona si está libre o la roba durante la ventana abierta.
- `!corona` y `!rey`: muestran el Top 5 en OBS durante 10 segundos por defecto.
- Ranking por tiempo total acumulado con la corona.
- Aviso realtime cuando alguien reclama/roba la corona.
- Nueva pestaña **Corona** en `/streambot` para configurar tiempos y probar el overlay.

## Cloudflare: único paso nuevo

Antes de usar la función, abrí la consola D1 de la base `miner-streambot` y ejecutá todo el archivo:

`streambot-v12-crown-migration.sql`

Es idempotente: si lo ejecutás otra vez no borra el historial.

No hay bindings nuevos, buckets nuevos ni secrets nuevos.

## Después del deploy

1. Entrá a `https://minerdesign.xyz/streambot`.
2. Abrí la pestaña **Corona**.
3. Dejá **Corona activa**.
4. Valores por defecto:
   - `!robar`
   - `!corona` / `!rey`
   - ventana aleatoria cada 10–20 minutos
   - 20 segundos para robar
   - Top 5 visible 10 segundos
5. En OBS, refrescá una vez el Browser Source actual de MinerBot. No agregues otro.
6. Usá **Probar alerta** y **Mostrar Top 5 en OBS** desde el dashboard.

Si no hay rey todavía, el primer viewer que escriba `!robar` se queda con la corona inmediatamente.


## Tamaño del overlay
En **Dashboard → Corona → Overlay en OBS** podés cambiar el tamaño en porcentaje y los márgenes derecho/inferior. No requiere una migración D1 adicional. Guardá cambios y el overlay se actualiza por realtime.

## Hotfix webhook Kick (401)

Se corrigió la validación de webhooks de Kick para:
- verificar la firma sobre los bytes exactos recibidos;
- refrescar automáticamente la public key desde `GET /public/v1/public-key` si la key documentada/caché no valida;
- mantener fallback seguro a la public key documentada;
- dejar diagnóstico en Workers Logs si una firma vuelve a fallar.

No requiere migración D1 adicional. Después del deploy, usar **Sincronizar eventos** una vez y probar `!ig`.
