# MinerBot v9 · Overlay Control

Esta versión agrega un panel privado para vos/mods en `/control.html` y reutiliza **el mismo Browser Source de OBS** (`tts-overlay.html`) para TTS + imágenes + videos.

## Antes de hacer push

### 1. Ejecutar la migración D1

Cloudflare → D1 → `miner-streambot` → Console.

Pegá y ejecutá todo el contenido de:

`streambot-v9-migration.sql`

Es idempotente: ejecutarlo de nuevo no borra nada.

### 2. Crear el bucket R2

Cloudflare → R2 Object Storage → Create bucket.

Nombre recomendado/exacto para usar el snippet ya preparado:

`miner-streambot-media`

No hace falta hacerlo público.

### 3. Activar el binding R2 en `wrangler.toml`

Al final del archivo ya quedó este bloque comentado:

```toml
# [[r2_buckets]]
# binding = "STREAMBOT_MEDIA"
# bucket_name = "miner-streambot-media"
```

Después de crear el bucket, sacale los `#` para que quede:

```toml
[[r2_buckets]]
binding = "STREAMBOT_MEDIA"
bucket_name = "miner-streambot-media"
```

Esto hace que el binding persista en cada deploy. R2 no usa API key dentro del código.

### 4. Commit + push

No hay secrets nuevos y no hay que reconectar la app principal de Kick.

El login de mods usa la misma Kick Developer App y el mismo callback que ya tenés registrado:

`https://minerdesign.xyz/api/streambot/oauth/callback`

Para el login de mods solo se solicita `user:read`.

## Uso

### Dashboard admin

En `/streambot.html` aparece una sección nueva **Mods**.

- Activar/pausar el control remoto de mods.
- Agregar usernames de Kick a la allowlist.
- Permisos por persona:
  - Controlar: mover, redimensionar, mostrar y ocultar.
  - Subir: agregar imágenes/videos nuevos.
  - Borrar: eliminar archivos de la biblioteca.
  - Activo: revoca/permite el acceso completo.

Tu propia cuenta de Kick es reconocida como **owner** y tiene todos los permisos sin tener que agregarte.

### Panel remoto

`https://minerdesign.xyz/control.html`

Cada persona entra con su propia cuenta de Kick. Si no es tu cuenta ni está en la allowlist, se rechaza el acceso.

El canvas es 16:9 y usa coordenadas relativas, por lo que funciona aunque el Browser Source de OBS esté a 1920x1080, 2560x1440, etc.

### Media soportada

- PNG
- JPG/JPEG
- WebP
- GIF
- WebM (recomendado para alpha + audio)
- MP4

Máximo actual: 25 MB por archivo.

Los archivos viven en R2 privado y se sirven únicamente a una sesión autorizada o al Browser Source con su overlay key.

## OBS

No agregues otro Browser Source.

El `tts-overlay.html?key=...` que ya usás pasa a ser el **MinerBot Global Overlay**. Sigue reproduciendo TTS y además renderiza el media controlado desde `/control.html`.
