class ShipSelectScene extends Phaser.Scene {
  constructor() {
    super('shipselect');
  }

  init(data) {
    var stored = storage.get('kondo-invaders-selected-ship');
    this.selectedShipKey = (data && data.shipKey) || stored || DEFAULT_SHIP_KEY;
    if (!PLAYER_SHIPS[this.selectedShipKey]) this.selectedShipKey = DEFAULT_SHIP_KEY;
  }

  create() {
    setupCamera(this);
    onLayout(this, () => this.scene.restart({ shipKey: this.selectedShipKey }));

    var shipKeys = Object.keys(PLAYER_SHIPS);
    this.currentIndex = shipKeys.indexOf(this.selectedShipKey);
    if (this.currentIndex === -1) this.currentIndex = 0;

    // Moving starfield background
    this.starfield = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'starfield').setOrigin(0).setDepth(-10);

    // Title
    addText(this, GAME_W / 2, 60, 'SELECT YOUR SHIP', 16, '#ffeb3b')
      .setOrigin(0.5).setStroke('#000', 4);

    // Ship preview container
    this.previewY = 165;
    this.previewShip = this.add.sprite(GAME_W / 2, this.previewY, PLAYER_SHIPS[this.selectedShipKey].spriteKey, 0)
      .setScale(3.0);
    this.tweens.add({
      targets: this.previewShip,
      y: this.previewY - 8,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Arrow navigation buttons
    var arrowY = this.previewY;
    var prevBtn = addText(this, 50, arrowY, '<', 24, '#ffffff')
      .setOrigin(0.5).setPadding(15, 15);
    prevBtn.setInteractive({ useHandCursor: true });
    prevBtn.on('pointerdown', () => this.prevShip());

    var nextBtn = addText(this, GAME_W - 50, arrowY, '>', 24, '#ffffff')
      .setOrigin(0.5).setPadding(15, 15);
    nextBtn.setInteractive({ useHandCursor: true });
    nextBtn.on('pointerdown', () => this.nextShip());

    // 3 small selectable ship badges
    this.badges = [];
    var badgeSpacing = 100;
    var startX = GAME_W / 2 - badgeSpacing;
    var badgeY = 235;

    shipKeys.forEach((key, idx) => {
      var ship = PLAYER_SHIPS[key];
      var bg = this.add.rectangle(startX + idx * badgeSpacing, badgeY, 68, 40, 0x111c3a, 0.8)
        .setStrokeStyle(2, key === this.selectedShipKey ? 0xffeb3b : 0x445577);
      var spr = this.add.image(startX + idx * badgeSpacing, badgeY, ship.spriteKey, 0)
        .setScale(1.4);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.selectShipByIndex(idx));
      spr.setInteractive({ useHandCursor: true });
      spr.on('pointerdown', () => this.selectShipByIndex(idx));

      this.badges.push({ bg: bg, key: key });
    });

    // Ship info texts
    this.nameText = addText(this, GAME_W / 2, 285, '', 14, '#fff').setOrigin(0.5).setStroke('#000', 4);
    this.descText = addText(this, GAME_W / 2, 312, '', 9, '#b0bec5').setOrigin(0.5).setStroke('#000', 3);

    // Stats box
    var statsBoxY = 345;
    this.add.rectangle(GAME_W / 2, statsBoxY + 50, 340, 115, 0x070c1d, 0.85)
      .setStrokeStyle(2, 0x223355);

    this.statSpeedText = addText(this, GAME_W / 2 - 140, statsBoxY + 20, '', 10, '#e0e0e0').setOrigin(0, 0.5);
    this.statFireText = addText(this, GAME_W / 2 - 140, statsBoxY + 50, '', 10, '#e0e0e0').setOrigin(0, 0.5);
    this.statArmorText = addText(this, GAME_W / 2 - 140, statsBoxY + 80, '', 10, '#e0e0e0').setOrigin(0, 0.5);

    // Launch button
    var launchBtn = addText(this, GAME_W / 2, GAME_H - 120, 'DEPLOY SHIP', 16, '#00e676')
      .setOrigin(0.5).setPadding(20, 12).setStroke('#000', 4);
    launchBtn.setInteractive({ useHandCursor: true });
    launchBtn.on('pointerover', () => launchBtn.setColor('#b9f6ca'));
    launchBtn.on('pointerout', () => launchBtn.setColor('#00e676'));
    launchBtn.on('pointerdown', () => this.launchGame());
    this.tweens.add({ targets: launchBtn, alpha: 0.7, duration: 600, yoyo: true, repeat: -1 });

    // Back to Menu button
    var backBtn = addText(this, 60, 24, '< BACK', 10, '#fff')
      .setOrigin(0.5).setPadding(10, 8).setStroke('#000', 4);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#ffeb3b'));
    backBtn.on('pointerout', () => backBtn.setColor('#fff'));
    backBtn.on('pointerdown', () => this.scene.start('menu'));

    // Keyboard navigation
    var kb = this.input.keyboard;
    kb.on('keydown-LEFT', () => this.prevShip());
    kb.on('keydown-A', () => this.prevShip());
    kb.on('keydown-RIGHT', () => this.nextShip());
    kb.on('keydown-D', () => this.nextShip());
    kb.on('keydown-ENTER', () => this.launchGame());
    kb.on('keydown-SPACE', () => this.launchGame());
    kb.on('keydown-ESC', () => this.scene.start('menu'));

    this.updateDisplay();
  }

  prevShip() {
    var keys = Object.keys(PLAYER_SHIPS);
    this.currentIndex = (this.currentIndex - 1 + keys.length) % keys.length;
    this.selectedShipKey = keys[this.currentIndex];
    this.updateDisplay();
  }

  nextShip() {
    var keys = Object.keys(PLAYER_SHIPS);
    this.currentIndex = (this.currentIndex + 1) % keys.length;
    this.selectedShipKey = keys[this.currentIndex];
    this.updateDisplay();
  }

  selectShipByIndex(idx) {
    var keys = Object.keys(PLAYER_SHIPS);
    this.currentIndex = idx;
    this.selectedShipKey = keys[idx];
    this.updateDisplay();
  }

  renderBar(val, max) {
    var bar = '';
    for (var i = 1; i <= max; i++) {
      bar += (i <= val) ? '█ ' : '· ';
    }
    return bar.trim();
  }

  updateDisplay() {
    var ship = PLAYER_SHIPS[this.selectedShipKey];
    storage.set('kondo-invaders-selected-ship', this.selectedShipKey);

    // Update main preview
    this.previewShip.setTexture(ship.spriteKey);

    // Update badge selection highlight
    this.badges.forEach((b) => {
      b.bg.setStrokeStyle(2, b.key === this.selectedShipKey ? 0xffeb3b : 0x445577);
      b.bg.setFillStyle(b.key === this.selectedShipKey ? 0x223366 : 0x111c3a, 0.85);
    });

    // Update textual info
    this.nameText.setText(ship.name).setColor(ship.color);
    this.descText.setText(ship.desc);

    this.statSpeedText.setText('SPEED:     ' + this.renderBar(ship.stats.speed, 5));
    this.statFireText.setText('FIRE RATE: ' + this.renderBar(ship.stats.fireRate, 5));
    this.statArmorText.setText('ARMOR:     ' + this.renderBar(ship.stats.armor, 5) + ' (' + ship.lives + ' LIVES)');
  }

  launchGame() {
    this.scene.start('game', { shipKey: this.selectedShipKey });
  }

  update(time, delta) {
    if (this.starfield) {
      this.starfield.tilePositionY -= 0.6 * (delta / 16.67);
    }
  }
}
