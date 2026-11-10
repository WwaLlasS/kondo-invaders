class HighScoresScene extends Phaser.Scene {
  constructor() {
    super('highscores');
  }

  init(data) {
    this.highlight = data && typeof data.highlight === 'number' ? data.highlight : -1;
  }

  create() {
    setupCamera(this);
    onLayout(this, () => this.scene.restart({ highlight: this.highlight }));
    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'starfield').setOrigin(0);
    addText(this, GAME_W / 2, 70, 'HIGH SCORES', 22, '#ffeb3b').setOrigin(0.5);

    var list = Scores.load();
    if (list.length === 0) {
      addText(this, GAME_W / 2, 300, 'NO SCORES YET', 14).setOrigin(0.5);
    }

    list.forEach((entry, i) => {
      var y = 150 + i * 48;
      var color = i === this.highlight ? '#ffeb3b' : '#fff';
      addText(this, 40, y, String(i + 1).padStart(2, ' ') + '.', 14, '#aaa').setOrigin(0, 0.5);
      addText(this, 100, y, entry.name, 14, color).setOrigin(0, 0.5);
      addText(this, GAME_W - 40, y, String(entry.score), 14, color).setOrigin(1, 0.5);
    });

    var back = () => this.scene.start('menu');
    // Small delay so the tap that opened this screen doesn't close it.
    this.time.delayedCall(500, () => {
      var btn = addTextButton(this, GAME_W / 2, GAME_H - 70, 'BACK TO MENU', 14, back);
      this.tweens.add({ targets: btn, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
      this.input.keyboard.on('keydown-ENTER', back);
      this.input.keyboard.on('keydown-ESC', back);
      this.input.keyboard.on('keydown-SPACE', back);
    });
  }
}
