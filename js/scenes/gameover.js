class GameOverScene extends Phaser.Scene {
  constructor() {
    super('gameover');
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.finalWave = data.wave || 1;
  }

  create() {
    setupCamera(this);
    // Content is anchored to the top; only the backdrop needs to grow.
    var bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'starfield').setOrigin(0);
    onLayout(this, () => {
      setupCamera(this);
      bg.setSize(GAME_W, GAME_H);
    });

    addText(this, GAME_W / 2, 200, 'GAME OVER', 28, '#ff5252').setOrigin(0.5);
    addText(this, GAME_W / 2, 290, 'SCORE ' + this.finalScore, 16).setOrigin(0.5);
    addText(this, GAME_W / 2, 330, 'WAVE ' + this.finalWave, 12, '#aaa').setOrigin(0.5);

    if (Scores.qualifies(this.finalScore)) {
      addText(this, GAME_W / 2, 400, 'NEW HIGH SCORE!', 14, '#ffeb3b').setOrigin(0.5);
      // Short delay so a tap that killed the player doesn't hit the form.
      this.time.delayedCall(400, () => this.askName());
    } else {
      this.showContinue();
    }
  }

  askName() {
    var overlay = document.getElementById('name-entry');
    var form = overlay.querySelector('form');
    var input = overlay.querySelector('input');
    var kb = this.input.keyboard;

    // Let the text field receive keys Phaser normally captures (space, arrows).
    kb.enabled = false;
    kb.disableGlobalCapture();

    var onSubmit = (e) => {
      e.preventDefault();
      cleanup();
      var index = Scores.add(input.value, this.finalScore);
      this.scene.start('highscores', { highlight: index });
    };
    var cleanup = () => {
      form.removeEventListener('submit', onSubmit);
      overlay.hidden = true;
      input.blur();
      kb.enabled = true;
      kb.enableGlobalCapture();
    };

    form.addEventListener('submit', onSubmit);
    this.events.once('shutdown', () => { if (!overlay.hidden) cleanup(); });

    input.value = '';
    overlay.hidden = false;
    input.focus();
  }

  showContinue() {
    var go = () => this.scene.start('highscores');
    this.time.delayedCall(600, () => {
      var btn = addTextButton(this, GAME_W / 2, 470, 'CONTINUE', 16, go);
      this.tweens.add({ targets: btn, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
      this.input.keyboard.once('keydown-ENTER', go);
      this.input.keyboard.once('keydown-SPACE', go);
    });
  }
}
