# Miner Design Site

Estructura:
- `wrangler.toml` en raíz
- `src/index.js` para APIs
- `public/` para la web estática

APIs:
- `/api/youtube` carga videos del canal @MinerDesign
- `/api/gumroad-products` carga productos desde la API real de Gumroad

Cloudflare Secret necesario:
- `GUMROAD_ACCESS_TOKEN`

Importante:
- No guardar el token en GitHub.
- El token se carga como Secret en Cloudflare.
