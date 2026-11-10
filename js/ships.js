// Player ship definitions and statistics
var PLAYER_SHIPS = {
  balanced: {
    key: 'balanced',
    name: 'ALPHA FIGHTER',
    spriteKey: 'player',
    iconKey: 'ship',
    speed: 320,
    fireDelay: 300 / 1.05,
    lives: 3,
    color: '#4fc3f7',
    desc: 'BALANCED COMBAT FIGHTER',
    stats: { speed: 3, fireRate: 3, armor: 3 }
  },
  swift: {
    key: 'swift',
    name: 'PHANTOM DART',
    spriteKey: 'player-swift',
    iconKey: 'ship-swift',
    speed: 400,
    fireDelay: 205,
    lives: 2,
    color: '#00e5ff',
    desc: 'HIGH SPEED & RAPID FIRE',
    stats: { speed: 5, fireRate: 5, armor: 2 }
  },
  heavy: {
    key: 'heavy',
    name: 'TITAN BASTION',
    spriteKey: 'player-heavy',
    iconKey: 'ship-heavy',
    speed: 250,
    fireDelay: 380,
    lives: 4,
    color: '#ff5252',
    desc: 'HEAVY ARMOR & 4 LIVES',
    stats: { speed: 2, fireRate: 2, armor: 5 }
  }
};

var DEFAULT_SHIP_KEY = 'balanced';
