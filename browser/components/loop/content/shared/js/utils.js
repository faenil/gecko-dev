/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global loop:true */

var loop = loop || {};
loop.shared = loop.shared || {};
loop.shared.utils = (function() {
  "use strict";

  /**
   * Used for adding different styles to the panel
   * @returns {String} Corresponds to the client platform
   * */
  function getTargetPlatform() {
    var platform="unknown_platform";

    if (navigator.platform.indexOf("Win") !== -1) {
      platform = "windows";
    }
    if (navigator.platform.indexOf("Mac") !== -1) {
      platform = "mac";
    }
    if (navigator.platform.indexOf("Linux") !== -1) {
      platform = "linux";
    }

    return platform;
  }

  /**
   * Used for getting a boolean preference. It will either use the browser preferences
   * (if navigator.mozLoop is defined) or try to get them from localStorage.
   *
   * @param {String} prefName The name of the preference. Note that mozLoop adds
   *                          'loop.' to the start of the string.
   *
   * @return The value of the preference, or false if not available.
   */
  function getBoolPreference(prefName) {
    if (navigator.mozLoop) {
      return !!navigator.mozLoop.getLoopBoolPref(prefName);
    }

    return !!localStorage.getItem(prefName);
  }

  /**
   * Helper for general things
   */
  function Helper() {
    this._iOSRegex = /^(iPad|iPhone|iPod)/;
  }

  Helper.prototype = {
    isFirefox: function(platform) {
      return platform.indexOf("Firefox") !== -1;
    },

    isFirefoxOS: function(platform) {
      // So far WebActivities are exposed only in FxOS, but they may be
      // exposed in Firefox Desktop soon, so we check for its existence
      // and also check if the UA belongs to a mobile platform.
      // XXX WebActivities are also exposed in WebRT on Firefox for Android,
      //     so we need a better check. Bug 1065403.
      return !!window.MozActivity && /mobi/i.test(platform);
    },

    isIOS: function(platform) {
      return this._iOSRegex.test(platform);
    },

    locationHash: function() {
      return window.location.hash;
    }
  };

  return {
    Helper: Helper,
    getTargetPlatform: getTargetPlatform,
    getBoolPreference: getBoolPreference
  };
})();
