// Random enemy formations. Each wave picks a different shape; most are drawn
// on a 7x6 lattice whose spacing keeps aliens from overlapping.
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
    random: null // filled in by symmetricRandom()
  },

  // Free-form shapes, as offsets from the formation's center.
  shapes: {
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
      pts = this.shapes[name]();
    } else {
      var test = name === 'random' ? this.symmetricRandom() : this.masks[name];
      for (var r = 0; r < this.ROWS; r++) {
        for (var c = 0; c < this.COLS; c++) {
          if (test(c, r)) pts.push({ x: (c - 3) * this.SPACING_X, y: r * this.SPACING_Y });
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
