# MinerBot — setup inicial

El código ya está integrado al Worker existente. No hay API keys ni secretos hardcodeados en el repo.

## 1. Crear la base D1

En Cloudflare crea una base D1 llamada `miner-streambot`.

Con Wrangler:

```bash
npx wrangler d1 create miner-streambot
```

Cloudflare devuelve un `database_id`. En `wrangler.toml`, descomenta el bloque `[[d1_databases]]` del final y pega ese ID.

Después crea las tablas:

```bash
npx wrangler d1 execute miner-streambot --remote --file=./streambot-schema.sql
```

También puedes abrir D1 > miner-streambot > Console en Cloudflare y pegar el contenido de `streambot-schema.sql`.

## 2. Secrets del Worker

Configura estos cuatro secrets en Cloudflare Workers & Pages > miner-design-site > Settings > Variables and Secrets:

- `STREAMBOT_ADMIN_KEY`: una contraseña larga y aleatoria que usarás para entrar al dashboard.
- `KICK_CLIENT_ID`: Client ID de tu app de Kick.
- `KICK_CLIENT_SECRET`: Client Secret de tu app de Kick.
- `ELEVENLABS_API_KEY`: API key de ElevenLabs.

Con Wrangler también puedes hacer:

```bash
npx wrangler secret put STREAMBOT_ADMIN_KEY
npx wrangler secret put KICK_CLIENT_ID
npx wrangler secret put KICK_CLIENT_SECRET
npx wrangler secret put ELEVENLABS_API_KEY
```

Nunca pongas estos valores dentro de los archivos del repo.

## 3. Crear la app en Kick

En Kick > Settings > Developer crea una aplicación para MinerBot.

Si este Worker sigue publicado en `https://minerdesign.xyz`, usa:

- Redirect URL: `https://minerdesign.xyz/api/streambot/oauth/callback`
- Webhook URL: `https://minerdesign.xyz/api/streambot/webhook`

Si lo publicas en otro dominio, reemplaza el dominio en ambas URLs.

El dashboard solicita estos scopes automáticamente al conectar Kick:

- `user:read`
- `channel:read`
- `channel:rewards:write`
- `chat:write`
- `events:subscribe`

Una vez desplegado, entra a `/streambot.html`, conecta Kick y pulsa **Sincronizar eventos**. El botón **Crear / actualizar recompensa** crea desde la API la recompensa de Channel Points con el costo y límites configurados en el dashboard.

## 4. ElevenLabs

Crea una API key en ElevenLabs y guárdala como `ELEVENLABS_API_KEY` en Cloudflare.

El modelo configurado es `eleven_flash_v2_5`. El Voice ID se cambia desde el dashboard. El código nunca expone tu API key al navegador ni a OBS.

IMPORTANTE: el plan Free sirve técnicamente para probar la integración, pero la documentación actual de ElevenLabs indica que el uso comercial/monetizado requiere un plan pago y que el Free es para uso no comercial con atribución. Para pruebas está bien; antes de usarlo normalmente en un stream monetizado, revisa/actualiza el plan.

## 5. Dashboard privado

URL:

`https://minerdesign.xyz/streambot.html`

La página no está enlazada desde el portfolio, lleva `noindex` y todas las operaciones privadas de la API exigen `STREAMBOT_ADMIN_KEY`.

Para que ni siquiera la página HTML pueda abrirla otra persona, recomiendo además Cloudflare Zero Trust > Access > Applications > Self-hosted y proteger solo:

`minerdesign.xyz/streambot.html`

con una regla Allow para tu email. No protejas `/api/streambot/webhook` ni `/tts-overlay.html`, porque Kick y OBS necesitan acceder a esas rutas. El overlay ya usa una clave aleatoria propia que genera MinerBot.

## 6. OBS

En el dashboard, sección TTS, pulsa **Copiar URL de OBS**.

En OBS:

1. Agrega una Browser Source.
2. Pega esa URL.
3. Tamaño recomendado: 1920 x 1080 (o la resolución de tu canvas).
4. Activa `Control audio via OBS` si quieres manejar el volumen/ruteo desde OBS.

Mientras habla el TTS aparece abajo a la izquierda un cartel pequeño con icono de audio + `@usuario`. Desaparece al terminar.

## 7. Prueba rápida

Orden recomendado después del deploy:

1. Abrir `/streambot.html` e ingresar `STREAMBOT_ADMIN_KEY`.
2. **Conectar Kick**.
3. **Sincronizar eventos**.
4. **Crear / actualizar recompensa**.
5. Agregar el widget a OBS.
6. Probar **Mensaje de prueba**.
7. Probar **TTS de prueba**.
8. Canjear la recompensa con pocos puntos desde otra cuenta de Kick.

Si el TTS supera el límite, contiene un link, se llega al límite diario o ElevenLabs falla, MinerBot intenta rechazar el canje pendiente para que no quede aceptado como si hubiera funcionado.
