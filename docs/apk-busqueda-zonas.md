# Búsqueda y fotografías de la APK 1.16.3

- Las fotos de trabajos se abren en un visor interno con deslizamiento, controles y reintento. Atrás cierra el visor; desde otras pantallas vuelve al Home y en Home mantiene la app abierta. Las reseñas existentes no tienen campos de fotografías.
- Autocompletado por nombre u ocupación desde Home y filtros, con espera de 250 ms, selección táctil y teclado. La normalización del endpoint de profesionales ignora mayúsculas y diacríticos y aplica el límite después del filtro. Requiere desplegar backend actualizado para búsquedas remotas sin tildes.
- Si no hay coincidencias locales, se consultan otras ciudades conservando término, categoría, verificación y calificación. Solo se recomiendan municipios con profesionales disponibles y coordenadas identificables, hasta 80 km; no se cambia la ciudad sin tocar una recomendación.
- Distancias aproximadas en línea recta entre coordenadas municipales, no entre posiciones personales ni por carretera. No se infieren coordenadas para nombres municipales ambiguos.

Coordenadas: DIVIPOLA, Datos Abiertos Colombia, consultado el 27 de octubre de 2026. Fuente: https://www.datos.gov.co/resource/gdxc-w37w.json y https://www.datos.gov.co/widgets/gdxc-w37w. Copia reducida incluida en mobile/src/data/municipalityCoordinates.json, sin dependencia de geocodificación durante el uso.

Validación: compilación web local de APK, compilación/lint Android, pruebas de interfaz con API/Auth simuladas, cuatro pruebas de búsqueda del backend y comprobaciones de proximidad, exclusión de zonas lejanas, filtros y ubicaciones desconocidas. Pendiente verificar botón físico y gestos en el teléfono.

## Galería 1.16.4

Miniaturas de 112 px y visor centrado con fondo claro. Pase automático cada cuatro segundos con pausa/reproducción, detenido al ampliar, durante gestos, al ocultar la app o si falla la imagen. Se respeta la preferencia de movimiento reducido al iniciar. Zoom 1–3× mediante botones, doble toque o pellizco, con arrastre y restablecimiento. Los controles Anterior/Siguiente recorren las imágenes en bucle. Se mantiene el cierre mediante Atrás.

Validación local: avance automático, pausa al ampliar, zoom por botones y pellizco mediante eventos táctiles del navegador, restablecimiento, carga fallida/reintento y regreso al Home. Compilación y lint Android correctos; pendiente prueba física del teléfono.
