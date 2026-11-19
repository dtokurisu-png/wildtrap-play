# WildTrap Play

Repositorio independiente para la experiencia jugable de WildTrap: habitación, lobby, tienda, mejoras, salas y multijugador.

## Contrato del escenario

- `maps/current.json`: copia publicada que carga el juego.
- `maps/manifest.json`: versión activa y lista de publicaciones anteriores.
- `maps/versions/<id>.json`: instantáneas inmutables para restaurar o fijar una sesión.
- `maps/schema.md`: descripción del contrato.

El editor **WildTrap** NO comparte el borrador en vivo. Solo se reciben snapshots publicados explícitamente.

**Una partida iniciada debe guardar `mapVersion` en su estado de sala y cargar la URL de `maps/versions/<id>.json`.** `current.json` es solo el valor por defecto para partidas nuevas.

El UI, matchmaking y gameplay se desarrollan aquí, sin modificar el editor 3D original.

## Demo jugable en solitario (v0.1.0)

El repositorio ahora incluye una aplicación 3D independiente del editor:

1. Pantalla de entrada → **Entrar a mi habitación**.
2. Habitación 3D con cama, rincón de mascota y puerta interactiva.
3. Acércate a la puerta y pulsa **E** → **Ir a cazar** o **Tienda**.
4. La tienda permite probar ventas con objetos **de demostración**, sin backend.
5. En **Ir a cazar**, elige **Crear partida en solitario**.
6. Se crea una **sala local** con `mapVersion` fijado desde `maps/manifest.json`.
7. Pulsa **Entrar a la cacería**: carga `maps/versions/v001.json`, materializa el relieve y el recorte publicado, y coloca el Explorador en el spawn del jugador 1.
8. Las condiciones de misión aparecen **después** de entrar en el escenario.
9. En **Menú → Volver a la habitación** puedes repetir la prueba.

Controles: **W A S D**, arrastra ratón para cámara, **Shift** para desplazamiento rápido, **E** interactuar y **Esc** para menú. El modelo del Explorador se intenta cargar desde los assets compartidos de WildTrap, con avatar básico de respaldo.

**Sin conexión online:** solo se prueba el ciclo de vida de una sala de un jugador. Crear/unirse a una sala con amigos aparece expresamente como pendiente. Firebase, emparejamiento, cuentas Google, estado persistente, progresión real, enemigos y recompensas todavía no están integrados.

La geometría de terreno se reconstruye desde la versión **publicada y fijada** del JSON, no del borrador del editor. El lector de escenas se encuentra en `map-loader.mjs`; el gameplay y los menús están en `play.mjs`. Los modelos GLB necesitan sus assets: la copia JSON no los incorpora.

## Publicar el sitio en GitHub Pages

El primer intento automático de crear GitHub Pages falló porque el token de GitHub Actions no tenía permiso para **habilitar Pages desde cero**.

El propietario del repositorio debe abrir **Settings → Pages** de `dtokurisu-png/wildtrap-play`, configurar **Build and deployment → Source: GitHub Actions** y guardar. Después se puede ejecutar de nuevo **Actions → Publish WildTrap Play demo → Run workflow**. Esta acción publica el repositorio en `https://dtokurisu-png.github.io/wildtrap-play/`. Hasta que la implementación muestre **success**, ese enlace no debe considerarse operativo.

## Pruebas

`Validate published WildTrap map` ejecuta validación de JSON, sintaxis de scripts y una prueba de Chrome que recorre automáticamente **habitación → puerta → selección Solo → creación de sala → mapa publicado → misión**. Puede repetirse localmente con un servidor HTTP y `node tests/browser-solo-flow.mjs`. La URL `?smoke=solo` ejecuta el mismo recorrido automatizado para diagnóstico.

## Migración sincronizada desde WildTrap

El código y los assets actualizados del editor se publican completos bajo `/wildtrap-play/engine/`, sin sobrescribir la habitación, tienda ni salas del repositorio Play. La prueba táctil instalable inicia en `engine/mobile.html`.

El workflow `Publish and sync WildTrap Play` copia la última versión de `dtokurisu-png/wildtrap`, sincroniza `assets/terrain/wildtrap-mobile-world.json` con `maps/current.json` y crea una versión inmutable `wt-<hash>` en `maps/versions/`. Se ejecuta en cambios de Play, manualmente y cada 30 minutos. Una sala existente conserva la versión que tenía fijada. Las actualizaciones a móviles se notifican una vez desplegadas a Pages mediante `engine/version.json`.

La sincronización no accede al borrador local del editor; el escenario debe estar **confirmado en el repositorio WildTrap**. Las tareas programadas de GitHub pueden ejecutarse con retraso.
