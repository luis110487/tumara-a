# Búsqueda y fotografías de la APK 1.16.3

- Las fotos de trabajos se abren en un visor interno con deslizamiento, controles y reintento. Atrás cierra el visor; desde otras pantallas vuelve al Home y en Home mantiene la app abierta. Las reseñas existentes no tienen campos de fotografías.
- Autocompletado por nombre u ocupación desde Home y filtros, con espera de 250 ms, selección táctil y teclado. La normalización del endpoint de profesionales ignora mayúsculas y diacríticos y aplica el límite después del filtro. Requiere desplegar backend actualizado para búsquedas remotas sin tildes.
- Si no hay coincidencias locales, se consultan otras ciudades conservando término, categoría, verificación y calificación. Solo se recomiendan municipios con profesionales disponibles y coordenadas identificables, hasta 80 km; no se cambia la ciudad sin tocar una recomendación.
- Distancias aproximadas en línea recta entre coordenadas municipales, no entre posiciones personales ni por carretera. No se infieren coordenadas para nombres municipales ambiguos.

Coordenadas: DIVIPOLA, Datos Abiertos Colombia, consultado el 27 de octubre de 2026. Fuente: https://www.datos.gov.co/resource/gdxc-w37w.json y https://www.datos.gov.co/widgets/gdxc-w37w. Copia reducida incluida en mobile/src/data/municipalityCoordinates.json, sin dependencia de geocodificación durante el uso.

Validación: compilación web local de APK, compilación/lint Android, pruebas de interfaz con API/Auth simuladas, cuatro pruebas de búsqueda del backend y comprobaciones de proximidad, exclusión de zonas lejanas, filtros y ubicaciones desconocidas. Pendiente verificar botón físico y gestos en el teléfono.
