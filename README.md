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


Polish fixes:
- Hero sin botones Ver Tutoriales / Explorar Cursos.
- Botón Discord blanco con texto negro.
- Sin movimiento hover en logos ni iconos del footer.
- Cards con altura uniforme, texto cortado con ellipsis visual y botones alineados abajo.
- Fondo interno limpio sin franja gris inferior.


Card size fixes:
- Descripciones de cursos/archivos limitadas a máximo 2 líneas.
- Curso sin texto "Gumroad" en la card.
- Cards de YouTube más compactas.
- Cache actualizado a `/api/gumroad-products?v=cards4`.


Tight card fixes:
- Producto/archivo: descripción bloqueada a 2 líneas exactas, sin tercera línea asomando.
- Tutoriales: cards más compactas y sin espacio muerto inferior.
- Cache actualizado a `/api/gumroad-products?v=tight5`.
