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


Update:
- Gumroad API real con deduplicado automático.
- La web pide `/api/gumroad-products?v=dedupe1` para evitar cache viejo.
- El endpoint devuelve `Cache-Control: no-store` para que los cambios se vean más rápido.


Fix clean-products:
- Páginas Cursos/Archivos reconstruidas sin cards placeholder.
- Home muestra todos los cursos/archivos reales desde Gumroad.
- Cache actualizado a `/api/gumroad-products?v=clean2`.
