// Logical game size. Everything is laid out in these units and the
// canvas is scaled to fit any screen (see main.js).
// Width is fixed; height follows the screen's shape on tall phones so they
// don't get black bars. It's recomputed when the window or fullscreen state
// changes, and scenes get a 'layout' event to rearrange themselves.
var GAME_W = 450;
function computeGameHeight() {
  var area = document.getElementById('game');
  var w = (area && area.clientWidth) || window.innerWidth;
  var h = (area && area.clientHeight) || window.innerHeight;
  return Math.round(Math.min(Math.max(GAME_W * h / w, 800), 1100));
}
var GAME_H = computeGameHeight();
// Internal render resolution multiplier, keeps text and sprites crisp
// when the canvas is scaled up on desktop / high-DPI screens.
var RES = 2;

var FONT = '"Press Start 2P", monospace';

var STORAGE_KEYS = {
  scores: 'kondo-invaders-scores',
  legacyScores: 'data',
  muted: 'kondo-invaders-muted'
};

// Zoom the main camera so scenes can work in logical units while the
// canvas renders at RES times the resolution.
function setupCamera(scene) {
  scene.cameras.main.setZoom(RES).centerOn(GAME_W / 2, GAME_H / 2);
}

function addText(scene, x, y, str, size, color) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: size + 'px',
    color: color || '#fff',
    align: 'center',
    resolution: RES
  });
}

// Run `fn` whenever the game height changes, while this scene is alive.
function onLayout(scene, fn) {
  scene.events.on('layout', fn, scene);
  scene.events.once('shutdown', function () { scene.events.off('layout', fn, scene); });
}

// Text button with hover/press feedback.
function addTextButton(scene, x, y, label, size, onClick) {
  var btn = addText(scene, x, y, label, size).setOrigin(0.5).setPadding(10, 8);
  btn.setInteractive({ useHandCursor: true });
  btn.on('pointerover', function () { btn.setColor('#ffeb3b'); });
  btn.on('pointerout', function () { btn.setColor('#fff'); });
  btn.on('pointerup', function (pointer, x, y, event) {
    event.stopPropagation();
    onClick();
  });
  return btn;
}

// Phones/tablets: steered by tilting the device instead of the keyboard.
function isTouchDevice() {
  return window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : 'ontouchstart' in window;
}

// Fullscreen for the whole page (so HTML overlays stay visible). Phaser's own
// helper leaves a rejected promise unhandled when the browser refuses.
var Fullscreen = {
  get available() {
    var el = document.documentElement;
    return !!(el.requestFullscreen || el.webkitRequestFullscreen);
  },
  get active() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  },
  // Must be called from a user gesture (tap, click or key press).
  enter: function () {
    if (!this.available || this.active) return;
    var el = document.documentElement;
    var request = el.requestFullscreen || el.webkitRequestFullscreen;
    Promise.resolve(request.call(el, { navigationUI: 'hide' })).then(function () {
      // Keep the screen in portrait while playing (Android, fullscreen only),
      // so tilting to steer doesn't rotate the game.
      if (screen.orientation && screen.orientation.lock) {
        return screen.orientation.lock('portrait');
      }
    }).catch(function () { /* refused: keep playing in the page */ });
  },
  exit: function () {
    if (!this.active) return;
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    Promise.resolve(exit.call(document)).catch(function () {});
  },
  toggle: function () {
    if (this.active) this.exit(); else this.enter();
  }
};

// Sound effect that degrades to a silent stub if the audio failed to load or
// decode on this device, instead of throwing and freezing the game.
var SILENT_SOUND = { play: function () {}, pause: function () {}, resume: function () {}, stop: function () {}, destroy: function () {} };
function addSound(scene, key, config) {
  if (!scene.cache.audio.exists(key)) return SILENT_SOUND;
  try {
    return scene.sound.add(key, config);
  } catch (e) {
    return SILENT_SOUND;
  }
}

var storage = {
  get: function (key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  set: function (key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
};

var settings = {
  get muted() { return storage.get(STORAGE_KEYS.muted) === '1'; },
  set muted(v) { storage.set(STORAGE_KEYS.muted, v ? '1' : '0'); }
};
