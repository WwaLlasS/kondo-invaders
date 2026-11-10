# Kondo Invaders

Shoot 'em up retro estilo *Space Invaders* para navegador, en móvil y escritorio.
Hecho con [Phaser 3](https://phaser.io/) y JavaScript plano: no requiere compilación.

**Jugar:** https://wwallass.github.io/kondo-invaders/

## Controles

| | Móvil | Escritorio |
|---|---|---|
| Mover | Inclinar el dispositivo | Flechas o A / D |
| Disparar | Tocar (mantener = automático) | Espacio (mantener = automático) |
| Pausa | Botón `II` | P o Esc |

En móvil el control por inclinación necesita HTTPS (o `localhost`); en iOS el
navegador pide permiso para usar los sensores de movimiento al primer toque.

## Desarrollo local

```bash
npm start   # sirve el proyecto en http://localhost:8080
```

Cualquier servidor estático sirve: el juego carga sus recursos con peticiones
HTTP, así que no funciona abriendo `index.html` directamente desde el disco.

## Estructura

```
index.html            página del juego
css/style.css         estilos, fuente y overlays (nombre, error, girar)
js/config.js          tamaño lógico, ajustes, helpers
js/main.js            arranque de Phaser, ajuste de alto, errores
js/scenes/            escenas: preload, menu, game, pause, gameover, highscores
js/formations.js      formaciones aleatorias de enemigos por oleada
js/collision.js       colisiones precisas por píxel
js/tilt.js            control por inclinación
js/music.js           música en streaming
js/scores.js          tabla de récords (localStorage)
lib/phaser.min.js     Phaser 3.90.0
assets/               imágenes, sonidos e iconos
```

## Publicación

El sitio se publica con GitHub Pages desde la raíz de la rama `main`. Cada
push a `main` actualiza el juego. Al cambiar archivos JS/CSS conviene subir el
número de versión `?v=` en `index.html` para evitar cachés antiguas.
