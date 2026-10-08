# MinerBot V19 · Editor visual de alertas

- En **Alertas OBS**, la vista previa usa `/alerts-overlay.html?preview=1` sin key: no conecta WebSocket ni API, no emite eventos hacia Kick/OBS.
- Los botones de la vista previa animan solo el iframe local. El sonido de prueba es opcional (desactivado por defecto).
- Los botones del bloque **Fuente independiente para OBS** siguen siendo pruebas en vivo de OBS (claramente diferenciadas).
- Control de logo, separaciones, ancho máximo, padding, tamaños de los tres textos, fondo y fuerza del degradado. Ajustes en vivo en preview; **Guardar cambios** persiste en D1 y el overlay se actualiza por el evento `alerts.refresh`.
- El ancho del cartel es máximo y el contenido se autoajusta para evitar espacios vacíos a la derecha.
- OBS sigue usando la misma URL existente. No requiere migraciones D1 ni nuevos Secrets.
