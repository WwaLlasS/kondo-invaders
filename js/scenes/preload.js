class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    setupCamera(this);
    onLayout(this, () => setupCamera(this));

    // Progress bar
    var barW = 260;
    var x = (GAME_W - barW) / 2;
    var y = GAME_H / 2;
    addText(this, GAME_W / 2, y - 40, 'LOADING...', 16).setOrigin(0.5);
    this.add.rectangle(x, y, barW, 16).setOrigin(0, 0.5).setStrokeStyle(2, 0xffffff);
    var bar = this.add.rectangle(x + 3, y, 0, 10, 0xffeb3b).setOrigin(0, 0.5);
    this.load.on('progress', function (p) { bar.width = (barW - 6) * p; });

    this.load.setPath('assets/');

    this.load.image('menu-bg', 'img/menu-bg.png');
    this.load.image('starfield', 'img/campo_de_estrellas.png');
    this.load.image('btn-start', 'img/btn-start.png');
    this.load.image('btn-highscore', 'img/btn-highscore.png');
    this.load.image('ship', 'img/ship.png');

    // Parallax background planets
    this.load.image('planet-gas', 'img/planet-gas.png');
    this.load.image('planet-desert', 'img/planet-desert.png');
    this.load.image('planet-ice', 'img/planet-ice.png');
    this.load.image('planet-moon', 'img/planet-moon.png');

    this.load.spritesheet('bullet', 'img/balas/balas_1.png', { frameWidth: 15, frameHeight: 15 });
    this.load.spritesheet('enemy-bullet', 'img/balas/balas_4.png', { frameWidth: 15, frameHeight: 15 });
    this.load.spritesheet('enemy', 'img/invader.png', { frameWidth: 45, frameHeight: 36 });
    this.load.spritesheet('enemy-scout', 'img/enemy-scout.png', { frameWidth: 45, frameHeight: 36 });
    this.load.spritesheet('enemy-elite', 'img/enemy-elite.png', { frameWidth: 45, frameHeight: 36 });
    this.load.spritesheet('enemy-tank', 'img/enemy-tank.png', { frameWidth: 45, frameHeight: 36 });
    this.load.spritesheet('player', 'img/player.png', { frameWidth: 30, frameHeight: 15 });

    this.load.audio('laser-player', 'sound/laser4.wav');
    this.load.audio('laser-enemy', 'sound/laser5.wav');
    this.load.audio('explosion-player', 'sound/Explosion.wav');
    this.load.audio('explosion-enemy', 'sound/Explosion_02.wav');
  }

  create() {
    // The painted menu background looks better smoothed; the sprites stay pixelated.
    this.textures.get('menu-bg').setFilter(Phaser.Textures.FilterMode.LINEAR);

    // Every enemy kind: slow wing flapping in formation, faster while diving.
    ENEMY_SHEETS.forEach((key) => {
      this.anims.create({
        key: key + '-fly',
        frames: this.anims.generateFrameNumbers(key, { frames: [0, 1] }),
        frameRate: 2,
        repeat: -1
      });
      this.anims.create({
        key: key + '-dive',
        frames: this.anims.generateFrameNumbers(key, { frames: [0, 1] }),
        frameRate: 10,
        repeat: -1
      });
    });
    this.anims.create({
      key: 'player-explode',
      frames: this.anims.generateFrameNumbers('player', { frames: [1, 2] }),
      frameRate: 10
    });
    this.anims.create({
      key: 'bullet-spin',
      frames: this.anims.generateFrameNumbers('bullet', { start: 0, end: 2 }),
      frameRate: 12,
      repeat: -1
    });
    this.anims.create({
      key: 'enemy-bullet-spin',
      frames: this.anims.generateFrameNumbers('enemy-bullet', { start: 0, end: 2 }),
      frameRate: 12,
      repeat: -1
    });

    HitMask.build(this, ['player', 'bullet', 'enemy-bullet'].concat(ENEMY_SHEETS));

    this.sound.mute = settings.muted;
    this.scene.start('menu');
  }
}
