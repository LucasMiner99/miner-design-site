# MinerBot v15 · Overlay "Limpiando" 🐧

## Instalación (sin migraciones manuales)
1. Reemplazá los archivos del proyecto por los del ZIP completo y hacé el deploy/push de siempre.
2. Abrí `https://minerdesign.xyz/streambot.html` y entrá a **🐧 Limpiando** en el menú.
3. Ajustá velocidades, modo de viewers y duración; tocá **Guardar cambios**.
4. Copiá **URL independiente de OBS** y creá una **Fuente de navegador** nueva.
5. En las propiedades de la fuente de OBS poné **Ancho: 620**, **Alto: 430** y dejá transparencia.
   Ubicá y escalá la fuente directamente en tu escena de 2560×1440.
6. Probá **Probar follow ⚡** y **Probar piso limpio 🎉** desde el dashboard con OBS abierto.

## Funcionamiento
- Sobre el piso limpio se dibuja el piso sucio. Su opacidad baja gradualmente con el porcentaje.
- El pingüino trapea con su GIF original convertido a **spritesheet PNG no animado**, controlado por JS para que el FPS cambie en tiempo real.
- El pingüino se mueve ligeramente de lado a lado. Los follows reales de Kick activan velocidad turbo en el GIF **y** en la limpieza por 60 s (configurable). Otro follow renueva los 60 s.
- Al llegar al 100%, se suma un piso, se muestra **¡PISO LIMPIO!** y se reproduce la animación de baile durante 10 s (configurable). Luego arranca desde 0.
- La velocidad base es por minuto/piso; los viewers aumentan el ritmo según el % extra por 100 viewers.
- El servidor consulta el contador de espectadores de Kick una vez por minuto. Si la API falla, se conserva el último número conocido; si no hay directo, es 0. Podés forzar un número en modo manual para probar.
- El Worker mantiene el estado de progreso/ciclos en D1 con actualizaciones de cada minuto incluso si OBS no está abierto. También sincroniza cuando OBS consulta el estado.
- **No requiere migraciones SQL manuales**. La tabla `streambot_cleaning_state` se crea automáticamente en D1 en la primera lectura, ajuste o cron.

## Ajustes disponibles en dashboard
- Activar/desactivar minijuego.
- Minutos por piso, % velocidad extra cada 100 espectadores.
- Multiplicador por follow y duración del boost.
- Duración de baile; FPS de trapeo normal/turbo.
- Viewers automáticos de Kick o manuales.
- URL privada independiente del overlay, botones de prueba de follow y de fin de piso.
- Estado, editar progreso y pisos, reiniciar progreso, reiniciar pisos o reiniciar todo.

## Archivos nuevos
- `public/cleaning-overlay.html` y `public/cleaning-overlay.js`
- `public/assets/cleaning/dirty.png`, `clean.png`, `mop-sheet.png`, `dance-sheet.png`
- `src/cleaning.js` (lógica D1 del minijuego)

## Notas
- El contador persistente y los cambios administrativos usan una API privada, nunca parámetros editables de la URL del overlay.
- La URL del overlay lleva una key privada. No la publiques en el chat.
- La fuente usa Google Fonts *Zalando Sans* igual que la meta de subs. Si OBS no carga Google Fonts, usará Arial como respaldo.
- El endpoint oficial de Kick usado para espectadores es `GET /public/v1/livestreams?broadcaster_user_id=...`, con el token de la cuenta conectada.
