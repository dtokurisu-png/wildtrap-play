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
