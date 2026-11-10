// Background music is streamed with an <audio> element instead of being
// decoded by Web Audio: decoding 2.5 minutes of music takes ~60 MB of RAM and
// can fail on phones, which used to break the game when pressing START.
var Music = {
  el: null,
  playing: false,
  unlocked: false,

  init: function () {
    if (this.el) return;
    var a = new Audio();
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0.6;
    a.src = a.canPlayType('audio/mp4; codecs="mp4a.40.2"') ? 'assets/sound/music.m4a' : 'assets/sound/music.ogg';
    this.el = a;
  },

  // Mobile browsers only allow playback that starts from a user gesture, so
  // the element is primed (muted) on the first tap/click/key press.
  unlock: function () {
    this.init();
    if (this.unlocked) return;
    this.unlocked = true;
    var a = this.el;
    a.muted = true;
    var p = a.play();
    if (!p) return;
    p.then(function () {
      if (!Music.playing) a.pause();
      a.muted = settings.muted;
    }).catch(function () { Music.unlocked = false; });
  },

  play: function () {
    this.init();
    this.playing = true;
    this.el.currentTime = 0;
    this.el.muted = settings.muted;
    this.resume();
  },

  resume: function () {
    if (!this.el) return;
    this.playing = true;
    var p = this.el.play();
    if (p) p.catch(function () { /* blocked until the next gesture */ });
  },

  pause: function () {
    this.playing = false;
    if (this.el) this.el.pause();
  },

  setMuted: function (muted) {
    if (this.el) this.el.muted = muted;
  }
};
