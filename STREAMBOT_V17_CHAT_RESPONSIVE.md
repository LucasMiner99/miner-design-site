# MinerBot V17 · Chat OBS responsive y badges de imagen

- Solo hay **una URL** de chat en el dashboard; sirve en tantas fuentes de navegador OBS como quieras.
- Fuente OBS recomendada: **1000 × 1300 px** para texto nítido. Podés poner otra proporción / tamaño. El tamaño visual se adapta al ancho.
- 420 × 650 no era un límite: era solo una sugerencia anterior.
- Badge globales: busca los íconos en `https://cpwemotes.co.uk/kick/kickBadges/` (es un espejo comunitario, **no oficial**), y cae a etiquetas si una imagen falla. Kick informa tipo/meses pero **no** la URL de imagen en el webhook.
- Badges personalizadas de subs: en Dashboard → Chat OBS → imágenes personalizadas, pegá líneas `subscriber:1=https://...`, `subscriber:3=...`, `subscriber:6=...`; se usa el mayor umbral que no supere los meses del usuario. Se aceptan `vip=https://...` etc. No hace falta configurar nada para los íconos generales disponibles.
- Controles globales de cantidad de mensajes (1–10), velocidad, duración, tamaño y separación se mantienen.
- Para configurar dos fuentes de forma diferente sin duplicar ajustes, opcionalmente usá `&max=4&font=23&duration=40` al final de la URL para una de ellas.
- 7TV y emotes de Kick se mantienen sin cambios.
- No requiere migraciones ni cambios en Kick o Cloudflare.
- No está garantizado que el espejo comunitario de badges permanezca disponible: si no responde, se muestra la etiqueta textual. Las badges personalizadas exactas sí deben ser provistas.
