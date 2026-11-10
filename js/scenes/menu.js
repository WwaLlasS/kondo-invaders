class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create() {
    setupCamera(this);
    onLayout(this, () => this.scene.restart());
    // Cover the whole screen without distorting the artwork.
    var bg = this.add.image(GAME_W / 2, GAME_H / 2, 'menu-bg');
    bg.setScale(Math.max(GAME_W / bg.width, GAME_H / bg.height));

    var start = this.addImageButton(GAME_W / 2, GAME_H / 2 - 10, 'btn-start', this.startGame);
    this.tweens.add({ targets: start, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });

    if (Scores.load().length > 0) {
      this.addImageButton(GAME_W / 2, GAME_H / 2 + 70, 'btn-highscore', this.showScores);
    }

    var hint = isTouchDevice()
      ? 'TILT YOUR DEVICE TO MOVE\nTOUCH TO FIRE'
      : 'ARROWS / A D TO MOVE\nSPACE TO FIRE  P PAUSE';
    addText(this, GAME_W / 2, GAME_H - 130, hint, 10)
      .setOrigin(0.5).setLineSpacing(10).setStroke('#000', 4);

    this.soundBtn = addTextButton(this, 70, 24, '', 10, () => this.toggleSound()).setStroke('#000', 4);
    this.updateSoundLabel();

    if (Fullscreen.available) {
      this.fullBtn = addTextButton(this, GAME_W - 80, 24, '', 10, () => Fullscreen.toggle())
        .setStroke('#000', 4);
      var updateFull = () => this.fullBtn.setText(Fullscreen.active ? 'EXIT FULL' : 'FULLSCREEN');
      updateFull();
      document.addEventListener('fullscreenchange', updateFull);
      this.events.once('shutdown', () => document.removeEventListener('fullscreenchange', updateFull));
    }

    var kb = this.input.keyboard;
    kb.on('keydown-ENTER', this.startGame, this);
    kb.on('keydown-SPACE', this.startGame, this);
    kb.on('keydown-H', this.showScores, this);
    kb.on('keydown-M', this.toggleSound, this);
  }

  addImageButton(x, y, key, onClick) {
    var btn = this.add.image(x, y, key).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout', () => btn.setScale(1));
    btn.on('pointerup', onClick, this);
    return btn;
  }

  startGame() {
    // A tap here is a user gesture, needed on iOS to enable tilt controls
    // and by every browser to enter fullscreen.
    Tilt.requestPermission();
    Fullscreen.enter();
    this.scene.start('shipselect');
  }

  showScores() {
    this.scene.start('highscores');
  }

  toggleSound() {
    this.sound.mute = !this.sound.mute;
    settings.muted = this.sound.mute;
    Music.setMuted(this.sound.mute);
    this.updateSoundLabel();
  }

  updateSoundLabel() {
    this.soundBtn.setText(this.sound.mute ? 'SOUND OFF' : 'SOUND ON');
  }
}
