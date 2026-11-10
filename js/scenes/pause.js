class PauseScene extends Phaser.Scene {
  constructor() {
    super('pause');
  }

  create() {
    setupCamera(this);
    onLayout(this, () => this.scene.restart());
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.75).setOrigin(0);
    addText(this, GAME_W / 2, 220, 'PAUSED', 24).setOrigin(0.5);

    addTextButton(this, GAME_W / 2, 330, 'RESUME', 16, () => this.resumeGame());

    this.soundBtn = addTextButton(this, GAME_W / 2, 400, '', 12, () => {
      this.sound.mute = !this.sound.mute;
      settings.muted = this.sound.mute;
      Music.setMuted(this.sound.mute);
      this.updateLabels();
    });

    addTextButton(this, GAME_W / 2, 540, 'QUIT TO MENU', 12, () => {
      this.scene.stop('game');
      this.scene.start('menu');
    });

    this.updateLabels();

    var kb = this.input.keyboard;
    kb.on('keydown-P', this.resumeGame, this);
    kb.on('keydown-ESC', this.resumeGame, this);
    kb.on('keydown-ENTER', this.resumeGame, this);
  }

  updateLabels() {
    this.soundBtn.setText(this.sound.mute ? 'SOUND: OFF' : 'SOUND: ON');
  }

  resumeGame() {
    this.scene.resume('game');
    this.scene.stop();
  }
}
