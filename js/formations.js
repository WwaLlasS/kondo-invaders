// Random enemy formations. Each wave picks a different shape; most are drawn
// on a 7x6 lattice whose spacing keeps aliens from overlapping.
// Builds a lattice mask from a little ASCII picture ('#' = alien).
function Formations_picture(rows) {
  return function (c, r) { return rows[r] ? rows[r][c] === '#' : false; };
}

var Formations = {
  COLS: 7,
  ROWS: 6,
  SPACING_X: 52,
  SPACING_Y: 44,
  last: null,

  // Shapes on the lattice: return true for cells that hold an alien.
  masks: {
    grid: function (c, r) { return r < 5; },
    checker: function (c, r) { return (c + r) % 2 === 0; },
    diamond: function (c, r) { return Math.abs(c - 3) + Math.abs(r - 2.5) <= 3.5; },
    pyramid: function (c, r) { return r < 5 && Math.abs(c - 3) <= r; },
    funnel: function (c, r) { return r < 4 && Math.abs(c - 3) <= 3 - r || r === 4 && c === 3; },
    chevron: function (c, r) { var d = Math.abs(c - 3); return r === d || r === d - 1 || r === d + 1 && r < 5; },
    cross: function (c, r) { return c === 3 || r === 2 || r === 3 || Math.abs(c - 3) === Math.abs(r - 2.5) + 0.5; },
    columns: function (c, r) { return r < 5 && c % 2 === 0; },
    stripes: function (c, r) { return r % 2 === 0 || c === 0 || c === 6; },
    hourglass: function (c, r) { return Math.abs(c - 3) <= Math.abs(r - 2.5) + 0.5; },
    frame: function (c, r) { return r < 5 && (r === 0 || r === 4 || c === 0 || c === 6); },
    pillars: function (c, r) { return r < 5 && (c <= 1 || c >= 5) || c === 3 && r >= 1 && r <= 3; },
    diagonal: function (c, r) { return c >= r && c <= r + 2; },
    heart: Formations_picture([
      '.##.##.',
      '#######',
      '#######',
      '.#####.',
      '..###..',
      '...#...'
    ]),
    invader: Formations_picture([
      '#.....#',
      '.#####.',
      '##.#.##',
      '#######',
      '#.#.#.#',
      '.#...#.'
    ]),
    wings: Formations_picture([
      '#.....#',
      '##...##',
      '###.###',
      '.#####.',
      '..#.#..'
    ]),
    arrow: Formations_picture([
      '..###..',
      '..###..',
      '#######',
      '.#####.',
      '..###..',
      '...#...'
    ]),
    random: null // filled in by symmetricRandom()
  },

  // Free-form shapes, as offsets from the formation's center.
  shapes: {
    spiral: function () {
      // Points every ~56px along an Archimedean spiral.
      var pts = [];
      var turn = Phaser.Math.RND.sign();
      var start = Math.random() * Math.PI * 2;
      for (var a = 0, i = 0; i < 16; i++) {
        var radius = 42 + 19 * a;
        pts.push({ x: Math.cos(start + a * turn) * radius, y: Math.sin(start + a * turn) * radius * 0.85 });
        a += 56 / Math.max(radius, 40);
      }
      return pts;
    },
    rings: function () {
      // Three small rings in a triangle, each with a center.
      var pts = [];
      var flip = Math.random() < 0.5 ? 1 : -1;
      [[-108, -60 * flip], [108, -60 * flip], [0, 75 * flip]].forEach(function (c) {
        pts.push({ x: c[0], y: c[1] });
        for (var i = 0; i < 6; i++) {
          var a = i / 6 * Math.PI * 2 + Math.PI / 6;
          pts.push({ x: c[0] + Math.cos(a) * 54, y: c[1] + Math.sin(a) * 50 });
        }
      });
      return pts;
    },
    smile: function () {
      // Two concentric arcs bending towards (or away from) the player.
      var pts = [];
      var dir = Math.random() < 0.5 ? 1 : -1;
      [[175, 9], [115, 6], [55, 3]].forEach(function (arc) {
        for (var i = 0; i < arc[1]; i++) {
          var a = Math.PI * (0.12 + 0.76 * i / (arc[1] - 1));
          pts.push({ x: Math.cos(a) * arc[0], y: Math.sin(a) * arc[0] * 0.8 * dir });
        }
      });
      return pts;
    },
    scatter: function () {
      // Random mirrored cloud: aliens never closer than one sprite apart.
      var pts = [];
      var tries = 0;
      while (pts.length < 26 && tries++ < 2000) {
        var p = { x: Phaser.Math.Between(26, 150), y: Phaser.Math.Between(0, 250) };
        var free = pts.concat(pts.map(function (q) { return { x: -q.x, y: q.y }; })).every(function (q) {
          return Math.abs(q.x - p.x) >= 50 || Math.abs(q.y - p.y) >= 42;
        });
        if (free) pts.push(p);
      }
      return pts.concat(pts.map(function (q) { return { x: -q.x, y: q.y }; }));
    },
    ring: function () {
      var pts = [{ x: 0, y: 0 }];
      [[6, 60], [12, 120]].forEach(function (ring) {
        var start = Math.random() * Math.PI;
        for (var i = 0; i < ring[0]; i++) {
          var a = start + i / ring[0] * Math.PI * 2;
          pts.push({ x: Math.cos(a) * ring[1], y: Math.sin(a) * ring[1] * 0.95 });
        }
      });
      return pts;
    },
    wave: function () {
      var pts = [];
      var phase = Math.random() * Math.PI * 2;
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 7; c++) {
          pts.push({ x: (c - 3) * 52, y: (r - 1.5) * 58 + Math.sin(c * 0.9 + phase) * 14 });
        }
      }
      return pts;
    }
  },

  // A random pattern, mirrored left/right so it still looks designed.
  symmetricRandom: function () {
    var cells;
    do {
      cells = {};
      for (var r = 0; r < 5; r++) {
        for (var c = 0; c <= 3; c++) {
          if (Math.random() < 0.6) cells[c + ',' + r] = cells[(6 - c) + ',' + r] = true;
        }
      }
    } while (Object.keys(cells).length < 16);
    return function (c, r) { return !!cells[c + ',' + r]; };
  },

  // Returns { name, slots: [{x, y}] } in world coordinates.
  generate: function (centerX, top) {
    var names = Object.keys(this.masks).concat(Object.keys(this.shapes));
    var name;
    do { name = Phaser.Utils.Array.GetRandom(names); } while (name === this.last);
    this.last = name;

    var pts = [];
    if (this.shapes[name]) {
      // Drop any alien that would overlap one already placed.
      pts = this.shapes[name]().filter(function (p, i, all) {
        return all.slice(0, i).every(function (q) {
          return Math.abs(q.x - p.x) >= 46 || Math.abs(q.y - p.y) >= 38;
        });
      });
    } else {
      var test = name === 'random' ? this.symmetricRandom() : this.masks[name];
      var flip = Math.random() < 0.5 ? 1 : -1; // mirror asymmetric shapes
      for (var r = 0; r < this.ROWS; r++) {
        for (var c = 0; c < this.COLS; c++) {
          if (test(c, r)) pts.push({ x: (c - 3) * this.SPACING_X * flip, y: r * this.SPACING_Y });
        }
      }
      // Knock a few random holes in bigger shapes for extra variety.
      if (pts.length > 22 && Math.random() < 0.5) {
        Phaser.Utils.Array.Shuffle(pts);
        pts.length = pts.length - Phaser.Math.Between(2, 5);
      }
    }

    // Shift so the shape's top edge sits at `top`.
    var minY = Math.min.apply(null, pts.map(function (p) { return p.y; }));
    return {
      name: name,
      slots: pts.map(function (p) { return { x: centerX + p.x, y: top + p.y - minY }; })
    };
  }
};
