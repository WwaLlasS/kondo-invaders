var PLAYER_SPEED = 320;
// Holding fire shoots automatically every PLAYER_AUTO_FIRE_DELAY ms (5% faster
// than the original 300 ms). Each new tap/press shoots right away, so tapping
// fast fires as fast as you tap, down to a tiny anti-double-trigger gap.
var PLAYER_AUTO_FIRE_DELAY = 300 / 1.05;
var PLAYER_TAP_FIRE_GAP = 50;
// Nobody shoots until every alien of the wave has flown into its slot.
var HUD_H = 44;
var HUD_DEPTH = 5;
// Enemy states: in formation, playing the take-off animation, diving at the
// player, or flying back to their slot after a missed dive.
var ENEMY_FORMATION = 'formation';
var ENEMY_LAUNCH = 'launch';
var ENEMY_DIVE = 'dive';
var ENEMY_RETURN = 'return';

// Parallax background planet definitions (speed, depth, alpha, horizontal response)
var PLANET_DEFS = [
  { key: 'planet-moon', speedY: 0.35, depth: -9, alpha: 0.8, scale: 1.0, parallaxX: 0.02 },
  { key: 'planet-ice', speedY: 0.65, depth: -8, alpha: 0.9, scale: 1.0, parallaxX: 0.05 },
  { key: 'planet-desert', speedY: 0.95, depth: -7, alpha: 0.95, scale: 1.0, parallaxX: 0.08 },
  { key: 'planet-gas', speedY: 1.35, depth: -6, alpha: 1.0, scale: 1.0, parallaxX: 0.12 }
];

class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  create() {
    setupCamera(this);
    this.physics.world.setBounds(0, HUD_H, GAME_W, GAME_H - HUD_H);

    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.nextPlayerShot = 0;
    this.lastPlayerShot = -Infinity;
    this.nextEnemyShot = 0;
    this.nextDive = 0;
    this.combatReadyAt = Infinity;
    this.waveCleared = false;
    this.gameOver = false;

    this.starfield = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'starfield').setOrigin(0).setDepth(-10);
    this.initPlanets();

    this.sfx = {
      laserPlayer: addSound(this, 'laser-player', { volume: 0.8 }),
      laserEnemy: addSound(this, 'laser-enemy', { volume: 0.7 }),
      explosionPlayer: addSound(this, 'explosion-player', { volume: 0.8 }),
      explosionEnemy: addSound(this, 'explosion-enemy', { volume: 0.3 }),
      armorHit: addSound(this, 'explosion-enemy', { volume: 0.2, rate: 2 }),
      dive: addSound(this, 'laser-enemy', { volume: 0.5, rate: 0.5 })
    };
    Music.play();

    this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 30 });
    this.enemyBullets = this.physics.add.group({ defaultKey: 'enemy-bullet', maxSize: 30 });
    this.enemies = this.physics.add.group();

    this.player = this.physics.add.sprite(GAME_W / 2, GAME_H - 80, 'player', 0).setScale(1.5);
    this.player.setCollideWorldBounds(true);

    // Bodies only pre-filter; HitMask decides whether visible pixels touch.
    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, this.bulletHitsEnemy, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.hitPlayer, this.bulletHitsPlayer, this);
    this.physics.add.overlap(this.player, this.enemies, this.enemyCrash, this.enemyHitsPlayer, this);

    this.createHud();
    onLayout(this, this.relayout);
    this.createEnemies();
    this.showWaveText();
    this.time.delayedCall(1500, () => this.checkTilt());

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,SPACE');
    this.input.keyboard.on('keydown-SPACE', (event) => { if (!event.repeat) this.tapFire(); });
    this.input.on('pointerdown', this.tapFire, this);
    this.input.keyboard.on('keydown-P', this.pause, this);
    this.input.keyboard.on('keydown-ESC', this.pause, this);
    this.input.addPointer(1); // allow a second finger on touch screens

    // Pause automatically when the tab/app goes to the background.
    this.game.events.on('blur', this.pause, this);
    this.game.events.on('hidden', this.pause, this);
    this.events.once('shutdown', () => {
      this.game.events.off('blur', this.pause, this);
      this.game.events.off('hidden', this.pause, this);
      Music.pause();
      Object.keys(this.sfx).forEach((k) => this.sfx[k].destroy());
    });
    this.events.on('resume', () => Music.resume());
  }

  createHud() {
    // Drawn above the aliens so they fly in from behind the bar.
    this.add.rectangle(0, 0, GAME_W, HUD_H, 0x000000, 0.85).setOrigin(0).setDepth(HUD_DEPTH);
    this.scoreText = addText(this, 12, HUD_H / 2, '', 12).setOrigin(0, 0.5).setDepth(HUD_DEPTH);
    this.updateScore(0);

    this.lifeIcons = [];
    for (var i = 0; i < this.lives; i++) {
      this.lifeIcons.push(this.add.image(GAME_W - 150 + i * 34, HUD_H / 2, 'ship').setAlpha(0.8).setDepth(HUD_DEPTH));
    }

    var pauseBtn = addText(this, GAME_W - 26, HUD_H / 2, 'II', 14).setOrigin(0.5).setPadding(12, 10).setDepth(HUD_DEPTH);
    pauseBtn.setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', (pointer, x, y, event) => {
      event.stopPropagation();
      this.pause();
    });

    this.waveText = addText(this, GAME_W / 2, GAME_H / 2, '', 22).setOrigin(0.5).setDepth(10);
  }

  // Each wave gets a random formation; the aliens fly in from the top
  // one after another and settle into their slots.
  createEnemies() {
    var formation = Formations.generate(GAME_W / 2, HUD_H + 50);
    var slots = Phaser.Utils.Array.Shuffle(assignEnemyTypes(formation.slots, this.wave));

    slots.forEach((slot, i) => {
      var alien = this.enemies.create(Phaser.Math.Between(30, GAME_W - 30), HUD_H - 30 - i * 14, slot.kind.key, 0);
      alien.kind = slot.kind;
      alien.hp = slot.kind.hp;
      alien.play(slot.kind.key + '-dive');
      // Generous box (covers the sprite at any rotation); HitMask is exact.
      alien.body.setSize(46, 46, true);
      alien.body.moves = false; // positions are driven by code, not physics
      alien.enemyState = ENEMY_RETURN;
      alien.slotX = slot.x;
      alien.slotY = slot.y;
    });

    // The formation moves as a whole; each alien's slot is slot + offset.
    this.waveTotal = slots.length;
    this.formationOffset = { x: 0, y: 0 };
    this.formationDir = Phaser.Math.RND.sign();
    this.formationSpeed = 30 + this.wave * 10;

    // Hold fire until the entrance finishes (see updateEntrance).
    this.entering = true;
    this.combatReadyAt = Infinity;
  }

  // The screen changed shape (e.g. entered fullscreen): stretch the play
  // area and keep the ship near the bottom edge.
  relayout() {
    setupCamera(this);
    this.physics.world.setBounds(0, HUD_H, GAME_W, GAME_H - HUD_H);
    this.starfield.setSize(GAME_W, GAME_H);
    this.waveText.setPosition(GAME_W / 2, GAME_H / 2);
    this.player.y = GAME_H - 80;
    if (this.player.body.enable) this.player.body.reset(this.player.x, this.player.y);
  }

  // Tilt is the only way to move on phones, so explain when it can't work.
  checkTilt() {
    if (!isTouchDevice() || Tilt.available) return;
    var msg = window.isSecureContext
      ? 'TILT NOT AVAILABLE\nALLOW MOTION SENSORS\nAND RELOAD'
      : 'TILT NEEDS HTTPS\nOPEN THE GAME\nFROM AN HTTPS ADDRESS';
    var text = addText(this, GAME_W / 2, GAME_H / 2 + 80, msg, 11, '#ffeb3b')
      .setOrigin(0.5).setLineSpacing(8).setStroke('#000', 4).setDepth(10);
    this.time.delayedCall(5000, () => text.destroy());
  }

  showWaveText() {
    this.waveText.setText('WAVE ' + this.wave).setVisible(true);
    this.time.delayedCall(1500, () => this.waveText.setVisible(false));
  }

  initPlanets() {
    this.planets = [];
    // Spawn 2 planets already on screen at varied positions, and 2 waiting above
    var initial = [
      { defIndex: 0, x: GAME_W * 0.78, y: GAME_H * 0.28 },
      { defIndex: 1, x: GAME_W * 0.22, y: GAME_H * 0.68 },
      { defIndex: 2, x: GAME_W * 0.65, y: -120 },
      { defIndex: 3, x: GAME_W * 0.3, y: -380 }
    ];

    initial.forEach((init) => {
      var def = PLANET_DEFS[init.defIndex];
      var sprite = this.add.image(init.x, init.y, def.key)
        .setDepth(def.depth)
        .setAlpha(def.alpha)
        .setScale(def.scale);
      sprite.speedY = def.speedY;
      sprite.parallaxX = def.parallaxX;
      sprite.defIndex = init.defIndex;
      this.planets.push(sprite);
    });
  }

  updateBackground(delta) {
    var dt = delta / 16.67;
    var playerVx = (this.player && this.player.body) ? this.player.body.velocity.x : 0;
    var vxRatio = playerVx / PLAYER_SPEED; // -1 to 1

    // Starfield: continuous downward forward motion + subtle horizontal parallax
    this.starfield.tilePositionY -= 2 * dt;
    this.starfield.tilePositionX += vxRatio * 0.35 * dt;

    this.planets.forEach((p) => {
      // Forward parallax: downward drift
      p.y += p.speedY * dt;
      // Horizontal parallax: shift opposite to ship steering
      p.x -= vxRatio * p.parallaxX * 24 * dt;

      // Wrap around gently if shifted offscreen horizontally
      if (p.x < -60) p.x = GAME_W + 60;
      else if (p.x > GAME_W + 60) p.x = -60;

      // Reset when scrolled past bottom
      if (p.y > GAME_H + 120) {
        p.y = -100 - Math.random() * 250;
        p.x = Phaser.Math.Between(40, GAME_W - 40);

        // Cycle through planet types with varied depth and speed
        var nextIdx = (p.defIndex + 1 + Phaser.Math.Between(0, 1)) % PLANET_DEFS.length;
        var def = PLANET_DEFS[nextIdx];
        p.defIndex = nextIdx;
        p.setTexture(def.key);
        p.setDepth(def.depth);
        p.setAlpha(def.alpha);
        p.setScale(def.scale);
        p.speedY = def.speedY;
        p.parallaxX = def.parallaxX;
      }
    });
  }

  update(time, delta) {
    this.updateBackground(delta);
    if (this.gameOver) return;

    // Move the aliens first so the frame the last one settles in its slot
    // is also the first frame anyone can shoot.
    this.updateFormation(delta);
    this.updateDivers(time, delta);
    this.updateEntrance(time);
    this.updatePlayer(time);
    this.updateEnemyFire(time);
    this.cleanupBullets();

    if (!this.waveCleared && this.enemies.countActive() === 0) {
      this.nextWave();
    }
  }

  // Shooting is allowed as soon as the last alien settles into its slot.
  updateEntrance(time) {
    if (!this.entering) return;
    var stillArriving = this.enemies.getChildren().some(function (e) {
      return e.active && e.enemyState === ENEMY_RETURN;
    });
    if (stillArriving) return;
    this.entering = false;
    this.combatReadyAt = time;
  }

  canShoot(time) {
    return time >= this.combatReadyAt;
  }

  updatePlayer(time) {
    var player = this.player;
    if (!player.active || !player.body.enable) return;

    var left = this.cursors.left.isDown || this.keys.A.isDown;
    var right = this.cursors.right.isDown || this.keys.D.isDown;
    var pointer = this.getActivePointer();
    var vx = 0;

    if (left) {
      vx = -PLAYER_SPEED;
    } else if (right) {
      vx = PLAYER_SPEED;
    } else if (Tilt.available) {
      // On phones the ship is steered only by tilting; touching just fires.
      vx = Tilt.velocity(PLAYER_SPEED);
    }
    player.setVelocityX(vx);

    if ((this.keys.SPACE.isDown || pointer) && time >= this.nextPlayerShot && this.canShoot(time)) {
      // Schedule from when the shot was due, not from this frame, so frame
      // rounding doesn't make auto-fire slower than PLAYER_AUTO_FIRE_DELAY.
      var due = time - this.nextPlayerShot < 50 ? this.nextPlayerShot : time;
      this.firePlayerBullet(time);
      this.nextPlayerShot = due + PLAYER_AUTO_FIRE_DELAY;
    }
  }

  // A fresh press fires immediately instead of waiting for the auto-fire timer.
  tapFire() {
    var time = this.time.now;
    if (this.gameOver || !this.player.body.enable || !this.canShoot(time)) return;
    if (time - this.lastPlayerShot < PLAYER_TAP_FIRE_GAP) return;
    this.firePlayerBullet(time);
  }

  getActivePointer() {
    var pointers = this.input.manager.pointers;
    for (var i = 0; i < pointers.length; i++) {
      if (pointers[i].isDown) return pointers[i];
    }
    return null;
  }

  firePlayerBullet(time) {
    var bullet = this.bullets.get();
    if (!bullet) return;
    bullet.enableBody(true, this.player.x, this.player.y - 14, true, true);
    bullet.play('bullet-spin');
    bullet.setVelocity(0, -500);
    this.lastPlayerShot = time;
    this.nextPlayerShot = time + PLAYER_AUTO_FIRE_DELAY;
    this.sfx.laserPlayer.play();
  }

  updateFormation(delta) {
    var alive = this.enemies.getChildren().filter(function (e) { return e.active; });
    if (alive.length === 0) return;

    // Speed up as the formation thins out, like the arcade original.
    var total = this.waveTotal;
    var speed = this.formationSpeed * (1 + (total - alive.length) / total * 1.5);
    var dx = this.formationDir * speed * delta / 1000;
    var offset = this.formationOffset;

    // Bounds come from the slots, so divers don't stretch the formation.
    var minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    alive.forEach(function (e) {
      minX = Math.min(minX, e.slotX + offset.x);
      maxX = Math.max(maxX, e.slotX + offset.x);
      maxY = Math.max(maxY, e.slotY + offset.y);
    });

    var margin = 25;
    var dy = 0;
    if ((this.formationDir > 0 && maxX + dx > GAME_W - margin) || (this.formationDir < 0 && minX + dx < margin)) {
      this.formationDir *= -1;
      dx = 0;
      dy = 14;
    }
    offset.x += dx;
    offset.y += dy;

    alive.forEach(function (e) {
      if (e.enemyState === ENEMY_FORMATION) {
        e.x = e.slotX + offset.x;
        e.y = e.slotY + offset.y;
      }
    });

    // Invaders reached the ship: game over.
    if (maxY >= this.player.y - 30) {
      this.endGame();
    }
  }

  // Every few seconds a random alien leaves the formation and dives at the
  // player. More divers, more often, in later waves.
  updateDivers(time, delta) {
    var dt = delta / 1000;
    var active = this.enemies.getChildren().filter(function (e) { return e.active; });

    var diving = active.filter(function (e) { return e.enemyState !== ENEMY_FORMATION; }).length;
    var maxDivers = Math.min(1 + Math.floor(this.wave / 2), 4);
    // Dives also wait for the formation; then a grace period before the first.
    var ready = this.canShoot(time);
    if (ready && this.nextDive === 0) this.nextDive = time + 2500;
    if (ready && time > this.nextDive && diving < maxDivers && this.player.body.enable) {
      var candidates = active.filter(function (e) { return e.enemyState === ENEMY_FORMATION; });
      if (candidates.length > 0) this.launchDiver(weightedPick(candidates, (e) => e.kind.diveWeight));
      var minDelay = Math.max(2200 - this.wave * 200, 700);
      this.nextDive = time + Phaser.Math.Between(minDelay, minDelay * 2);
    }

    active.forEach((e) => {
      if (e.enemyState === ENEMY_DIVE) this.moveDiver(e, dt);
      else if (e.enemyState === ENEMY_RETURN) this.moveReturning(e, dt);
    });
  }

  launchDiver(enemy) {
    enemy.enemyState = ENEMY_LAUNCH;
    this.sfx.dive.play();

    // Randomized flight so no two dives look the same.
    enemy.dive = {
      t: 0,
      vy: (Phaser.Math.Between(170, 230) + this.wave * 12) * enemy.kind.diveSpeed,
      maxVx: Phaser.Math.Between(140, 260),
      homing: Phaser.Math.FloatBetween(0.8, 2.5),
      swayAmp: Phaser.Math.Between(20, 110),
      swayFreq: Phaser.Math.FloatBetween(2, 5),
      swayPhase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      vx: 0
    };

    // Take-off animation: hop up, flash, and spin in a random direction.
    var spin = Phaser.Math.RND.sign() * 360;
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(80, () => { if (enemy.active) this.showDamage(enemy); });
    enemy.play(enemy.kind.key + '-dive');
    this.tweens.add({
      targets: enemy,
      y: enemy.y - 24,
      angle: spin,
      duration: 450,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!enemy.active) return;
        enemy.angle = 0;
        enemy.enemyState = ENEMY_DIVE;
      }
    });
    this.tweens.add({ targets: enemy, scale: 1.3, duration: 225, yoyo: true, ease: 'Sine.easeInOut' });
  }

  moveDiver(e, dt) {
    var d = e.dive;
    d.t += dt;

    // Home in on the ship with a random zig-zag, until it has passed the ship.
    if (e.y < this.player.y) {
      var targetX = this.player.x + Math.sin(d.t * d.swayFreq + d.swayPhase) * d.swayAmp;
      d.vx = Phaser.Math.Clamp((targetX - e.x) * d.homing, -d.maxVx, d.maxVx);
    }
    e.x = Phaser.Math.Clamp(e.x + d.vx * dt, 20, GAME_W - 20);
    e.y += d.vy * dt;

    // Point the alien along its flight path (the sprite faces down).
    var heading = Math.atan2(d.vy, d.vx) - Math.PI / 2;
    e.rotation = Phaser.Math.Angle.RotateTo(e.rotation, heading, 6 * dt);

    // Missed: wrap around to the top and fly back to its slot.
    if (e.y > GAME_H + 40) {
      e.y = HUD_H - 40;
      e.x = e.slotX + this.formationOffset.x;
      e.enemyState = ENEMY_RETURN;
    }
  }

  moveReturning(e, dt) {
    var tx = e.slotX + this.formationOffset.x;
    var ty = e.slotY + this.formationOffset.y;
    var dist = Phaser.Math.Distance.Between(e.x, e.y, tx, ty);
    var step = 260 * dt;
    e.rotation = Phaser.Math.Angle.RotateTo(e.rotation, 0, 6 * dt);
    if (dist <= step) {
      e.setPosition(tx, ty);
      e.rotation = 0;
      e.enemyState = ENEMY_FORMATION;
      e.play(e.kind.key + '-fly');
    } else {
      e.x += (tx - e.x) / dist * step;
      e.y += (ty - e.y) / dist * step;
    }
  }

  updateEnemyFire(time) {
    if (time < this.nextEnemyShot || !this.player.body.enable || !this.canShoot(time)) return;

    // Aliens still flying in (or back) from the top don't shoot.
    var shooters = this.enemies.getChildren().filter(function (e) {
      return e.active && e.enemyState !== ENEMY_RETURN;
    });
    if (shooters.length === 0) return;

    var bullet = this.enemyBullets.get();
    if (!bullet) return;

    var shooter = weightedPick(shooters, (e) => e.kind.fireWeight);
    bullet.enableBody(true, shooter.x, shooter.y + 18, true, true);
    bullet.play('enemy-bullet-spin');
    this.physics.moveToObject(bullet, this.player, Math.min(120 + (this.wave - 1) * 15, 260));
    this.sfx.laserEnemy.play();

    var delay;
    if (this.score > 15000) delay = 400;
    else if (this.score > 7000) delay = 700;
    else if (this.score > 4000) delay = 1000;
    else delay = 2000;
    this.nextEnemyShot = time + Math.max(delay - (this.wave - 1) * 100, 350);
  }

  cleanupBullets() {
    [this.bullets, this.enemyBullets].forEach(function (group) {
      group.getChildren().forEach(function (b) {
        if (b.active && (b.y < HUD_H - 10 || b.y > GAME_H + 20 || b.x < -20 || b.x > GAME_W + 20)) {
          b.disableBody(true, true);
        }
      });
    });
  }

  hitEnemy(bullet, enemy) {
    bullet.disableBody(true, true);
    enemy.hp--;
    if (enemy.hp > 0) {
      // Armored enemy survived: flash white, then stay tinted as damaged.
      this.sfx.armorHit.play();
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(60, () => { if (enemy.active) this.showDamage(enemy); });
      return;
    }
    // Shooting down a diver is worth double.
    this.updateScore(enemy.kind.points * (enemy.enemyState === ENEMY_FORMATION ? 1 : 2));
    this.explodeEnemy(enemy);
  }

  showDamage(enemy) {
    if (enemy.hp < enemy.kind.hp) enemy.setTint(0xff8a80);
    else enemy.clearTint();
  }

  explodeEnemy(enemy) {
    this.tweens.killTweensOf(enemy);
    enemy.body.enable = false;
    enemy.setActive(false).stop().clearTint().setScale(1).setFrame(2);
    this.time.delayedCall(150, () => enemy.destroy());
    this.sfx.explosionEnemy.play();
  }

  canBeHit(player, other) {
    return other.active && player.body.enable && !player.invulnerable;
  }

  bulletHitsEnemy(bullet, enemy) {
    return bullet.active && enemy.active && HitMask.overlap(bullet, enemy);
  }

  bulletHitsPlayer(player, bullet) {
    return this.canBeHit(player, bullet) && HitMask.overlap(bullet, player);
  }

  enemyHitsPlayer(player, enemy) {
    return this.canBeHit(player, enemy) && HitMask.overlap(player, enemy);
  }

  hitPlayer(player, bullet) {
    bullet.disableBody(true, true);
    this.damagePlayer();
  }

  // A diving alien rammed the ship: both are destroyed.
  enemyCrash(player, enemy) {
    if (!this.canBeHit(player, enemy)) return;
    this.explodeEnemy(enemy);
    this.damagePlayer();
  }

  damagePlayer() {
    var player = this.player;
    this.clearBullets();
    this.sfx.explosionPlayer.play();
    this.cameras.main.shake(200, 0.01);

    player.body.enable = false;
    player.play('player-explode');

    this.lives--;
    var icon = this.lifeIcons[this.lives];
    if (icon) icon.setVisible(false);

    if (this.lives <= 0) {
      this.endGame();
      return;
    }

    this.time.delayedCall(700, () => {
      player.setFrame(0).setPosition(GAME_W / 2, player.y);
      player.body.enable = true;
      player.body.reset(player.x, player.y);
      player.invulnerable = true;
      this.tweens.add({
        targets: player, alpha: 0.2, duration: 120, yoyo: true, repeat: 6,
        onComplete: () => { player.alpha = 1; player.invulnerable = false; }
      });
    });
  }

  nextWave() {
    this.waveCleared = true;
    this.combatReadyAt = Infinity;
    this.clearBullets();
    this.updateScore(200);
    this.wave++;
    this.player.setX(GAME_W / 2);
    this.showWaveText();
    this.time.delayedCall(1200, () => {
      this.createEnemies();
      this.nextDive = 0;
      this.waveCleared = false;
    });
  }

  clearBullets() {
    this.bullets.getChildren().forEach(function (b) { b.disableBody(true, true); });
    this.enemyBullets.getChildren().forEach(function (b) { b.disableBody(true, true); });
  }

  updateScore(points) {
    this.score += points;
    this.scoreText.setText('SCORE ' + this.score);
  }

  endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.player.setVelocity(0, 0);
    this.player.body.enable = false;
    this.player.play('player-explode');
    Music.pause();
    this.time.delayedCall(900, () => {
      this.scene.start('gameover', { score: this.score, wave: this.wave });
    });
  }

  pause() {
    if (this.gameOver || !this.scene.isActive()) return;
    Music.pause();
    this.scene.launch('pause');
    this.scene.pause();
  }
}
