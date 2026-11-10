// Tilt (motion) controls for mobile devices.
// Uses deviceorientation's gamma (left/right tilt in degrees), which has the
// same sign on iOS and Android, unlike accelerationIncludingGravity.
var Tilt = {
  gamma: null,
  listening: false,

  // True once the device has reported real orientation data.
  get available() { return this.gamma !== null; },

  start: function () {
    if (this.listening) return;
    this.listening = true;
    window.addEventListener('deviceorientation', function (e) {
      if (typeof e.gamma === 'number') Tilt.gamma = e.gamma;
    });
  },

  // iOS 13+ only grants access from inside a user gesture.
  requestPermission: function () {
    var DOE = window.DeviceOrientationEvent;
    if (!DOE) return;
    if (typeof DOE.requestPermission === 'function') {
      DOE.requestPermission().then(function (state) {
        if (state === 'granted') Tilt.start();
      }).catch(function () { /* denied or not in a gesture */ });
    } else {
      Tilt.start();
    }
  },

  // Horizontal velocity for the ship, matching the feel of the original
  // version (acceleration * 100 ~= 980 * sin(tilt)).
  velocity: function (maxSpeed) {
    if (this.gamma === null) return 0;
    var g = this.gamma;
    if (Math.abs(g) < 2) return 0;
    var v = 980 * Math.sin(g * Math.PI / 180);
    return Math.max(-maxSpeed, Math.min(maxSpeed, v));
  }
};
