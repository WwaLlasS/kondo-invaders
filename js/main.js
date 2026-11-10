function startGame() {
  window.invadersGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_W * RES,
    height: GAME_H * RES,
    backgroundColor: '#000000',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false }
    },
    input: {
      activePointers: 2
    },
    scene: [PreloadScene, MenuScene, ShipSelectScene, GameScene, PauseScene, GameOverScene, HighScoresScene]
  });

  // An exception inside a frame would otherwise stop Phaser's loop for good.
  var game = window.invadersGame;
  watchGameHeight(game);
  var step = game.step;
  game.step = function (time, delta) {
    try {
      step.call(game, time, delta);
    } catch (e) {
      showError(e);
    }
  };
}

// Entering fullscreen, rotating, or the mobile address bar hiding all change
// the screen's shape: resize the game to fill it and tell scenes to relayout.
function watchGameHeight(game) {
  var timer;
  function apply() {
    var h = computeGameHeight();
    if (Math.abs(h - GAME_H) < 4) return;
    GAME_H = h;
    game.scale.setGameSize(GAME_W * RES, GAME_H * RES);
    game.scene.scenes.forEach(function (scene) {
      if (scene.sys.isActive() || scene.sys.isPaused()) scene.events.emit('layout');
    });
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 120);
  }
  window.addEventListener('resize', schedule);
  document.addEventListener('fullscreenchange', schedule);
  document.addEventListener('webkitfullscreenchange', schedule);
}

// Make sure the pixel font is ready before any text is drawn.
var fontReady = document.fonts
  ? document.fonts.load('16px "Press Start 2P"').catch(function () {})
  : Promise.resolve();
var fontTimeout = new Promise(function (resolve) { setTimeout(resolve, 3000); });
Promise.race([fontReady, fontTimeout]).then(startGame);

// The first tap/click/key press is a user gesture: use it to enable music
// playback and, on iOS, to ask for motion (tilt) permission.
function onFirstGesture() {
  Music.unlock();
  Tilt.requestPermission();
  ['touchend', 'click', 'keydown'].forEach(function (type) {
    window.removeEventListener(type, onFirstGesture, true);
  });
}
['touchend', 'click', 'keydown'].forEach(function (type) {
  window.addEventListener(type, onFirstGesture, true);
});

// Show unexpected errors on screen instead of leaving a frozen game.
var errorShown = false;
function showError(err) {
  if (errorShown) return;
  errorShown = true;
  console.error(err);
  var overlay = document.getElementById('error');
  overlay.querySelector('.error-message').textContent = String((err && (err.message || err)) || 'Unknown error');
  overlay.querySelector('button').onclick = function () { location.reload(); };
  overlay.hidden = false;
}
window.addEventListener('error', function (e) { showError(e.error || e.message); });
window.addEventListener('unhandledrejection', function (e) { showError(e.reason); });
