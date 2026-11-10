// High score table stored in localStorage as [{name, score}], best first.
var Scores = {
  MAX: 10,

  load: function () {
    var raw = storage.get(STORAGE_KEYS.scores);
    if (raw) {
      try {
        var list = JSON.parse(raw);
        if (Array.isArray(list)) return list;
      } catch (e) { /* corrupted, start over */ }
      return [];
    }
    return Scores.migrateLegacy();
  },

  // v1 stored {"scores": [{"NAME": 123}, ...]} under the "data" key.
  migrateLegacy: function () {
    var raw = storage.get(STORAGE_KEYS.legacyScores);
    if (!raw) return [];
    var list = [];
    try {
      (JSON.parse(raw).scores || []).forEach(function (entry) {
        var name = Object.keys(entry)[0];
        if (name) list.push({ name: Scores.cleanName(name), score: Number(entry[name]) || 0 });
      });
    } catch (e) { return []; }
    list = Scores.sort(list);
    Scores.save(list);
    return list;
  },

  save: function (list) {
    storage.set(STORAGE_KEYS.scores, JSON.stringify(list));
  },

  sort: function (list) {
    return list.sort(function (a, b) { return b.score - a.score; }).slice(0, Scores.MAX);
  },

  qualifies: function (score) {
    if (score <= 0) return false;
    var list = Scores.load();
    return list.length < Scores.MAX || score > list[list.length - 1].score;
  },

  // Returns the index of the new entry in the table.
  add: function (name, score) {
    var entry = { name: Scores.cleanName(name), score: score };
    var list = Scores.load();
    list.push(entry);
    list = Scores.sort(list);
    Scores.save(list);
    return list.indexOf(entry);
  },

  // Keep to characters the pixel font can draw.
  cleanName: function (name) {
    var clean = String(name || '').toUpperCase().replace(/[^A-Z0-9 ._\-!?]/g, '').trim().slice(0, 10);
    return clean || 'PLAYER';
  }
};
