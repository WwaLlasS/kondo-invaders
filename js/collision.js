// Pixel-precise collisions. Arcade physics bodies are only used as a cheap
// first check; a hit only counts when visible (opaque) pixels of both sprites
// actually touch. Works with scaled and rotated sprites.
var HitMask = {
  ALPHA_MIN: 128,
  masks: {},  // texture key -> { w, data: Uint8Array of 0/1 }
  points: {}, // "key:frame" -> [x, y, x, y, ...] opaque pixel centers in frame space

  // Read the alpha channel of each texture once, after loading.
  build: function (scene, keys) {
    keys.forEach(function (key) {
      var img = scene.textures.get(key).getSourceImage();
      var canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      var rgba = ctx.getImageData(0, 0, img.width, img.height).data;
      var data = new Uint8Array(img.width * img.height);
      for (var i = 0; i < data.length; i++) {
        data[i] = rgba[i * 4 + 3] >= HitMask.ALPHA_MIN ? 1 : 0;
      }
      HitMask.masks[key] = { w: img.width, data: data };
    });
  },

  framePoints: function (sprite) {
    var f = sprite.frame;
    var id = sprite.texture.key + ':' + f.name;
    if (this.points[id]) return this.points[id];
    var mask = this.masks[sprite.texture.key];
    var pts = [];
    for (var y = 0; y < f.height; y++) {
      for (var x = 0; x < f.width; x++) {
        if (mask.data[(f.cutY + y) * mask.w + f.cutX + x]) pts.push(x + 0.5, y + 0.5);
      }
    }
    return (this.points[id] = pts);
  },

  // Is there an opaque pixel of `sprite` at world point (wx, wy)?
  solidAt: function (sprite, wx, wy) {
    var f = sprite.frame;
    var mask = this.masks[sprite.texture.key];
    var dx = wx - sprite.x;
    var dy = wy - sprite.y;
    var cos = Math.cos(-sprite.rotation);
    var sin = Math.sin(-sprite.rotation);
    var lx = Math.floor((dx * cos - dy * sin) / sprite.scaleX + sprite.displayOriginX);
    var ly = Math.floor((dx * sin + dy * cos) / sprite.scaleY + sprite.displayOriginY);
    if (lx < 0 || ly < 0 || lx >= f.width || ly >= f.height) return false;
    return mask.data[(f.cutY + ly) * mask.w + f.cutX + lx] === 1;
  },

  // True when any opaque pixel of `a` lies on an opaque pixel of `b`.
  // Pass the smaller sprite (e.g. the bullet) as `a`.
  overlap: function (a, b) {
    var pts = this.framePoints(a);
    var cos = Math.cos(a.rotation);
    var sin = Math.sin(a.rotation);
    for (var i = 0; i < pts.length; i += 2) {
      var lx = (pts[i] - a.displayOriginX) * a.scaleX;
      var ly = (pts[i + 1] - a.displayOriginY) * a.scaleY;
      if (this.solidAt(b, a.x + lx * cos - ly * sin, a.y + lx * sin + ly * cos)) return true;
    }
    return false;
  }
};
