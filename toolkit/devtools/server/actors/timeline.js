/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Many Gecko operations (painting, reflows, restyle, ...) can be tracked
 * in real time. A marker is a representation of one operation. A marker
 * has a name, and start and end timestamps. Markers are stored in docShells.
 *
 * This actor exposes this tracking mechanism to the devtools protocol.
 *
 * To start/stop recording markers:
 *   TimelineFront.start()
 *   TimelineFront.stop()
 *   TimelineFront.isRecording()
 *
 * When markers are available, an event is emitted:
 *   TimelineFront.on("markers", function(markers) {...})
 *
 */

const {Ci, Cu} = require("chrome");
const protocol = require("devtools/server/protocol");
const {method, Arg, RetVal} = protocol;
const events = require("sdk/event/core");
const {setTimeout, clearTimeout} = require("sdk/timers");

// How often do we pull markers from the docShells, and therefore, how often do
// we send events to the front (knowing that when there are no markers in the
// docShell, no event is sent).
const DEFAULT_TIMELINE_DATA_PULL_TIMEOUT = 200; // ms

/**
 * The timeline actor pops and forwards timeline markers registered in docshells.
 */
let TimelineActor = exports.TimelineActor = protocol.ActorClass({
  typeName: "timeline",

  events: {
    /**
     * "markers" events are emitted every DEFAULT_TIMELINE_DATA_PULL_TIMEOUT ms
     * at most, when profile markers are found. A marker has the following
     * properties:
     * - start {Number} ms
     * - end {Number} ms
     * - name {String}
     */
    "markers" : {
      type: "markers",
      markers: Arg(0, "array:json")
    }
  },

  initialize: function(conn, tabActor) {
    protocol.Actor.prototype.initialize.call(this, conn);
    this.tabActor = tabActor;

    this._isRecording = false;

    // Make sure to get markers from new windows as they become available
    this._onWindowReady = this._onWindowReady.bind(this);
    events.on(this.tabActor, "window-ready", this._onWindowReady);
  },

  /**
   * The timeline actor is the first (and last) in its hierarchy to use protocol.js
   * so it doesn't have a parent protocol actor that takes care of its lifetime.
   * So it needs a disconnect method to cleanup.
   */
  disconnect: function() {
    this.destroy();
  },

  destroy: function() {
    this.stop();

    events.off(this.tabActor, "window-ready", this._onWindowReady);
    this.tabActor = null;

    protocol.Actor.prototype.destroy.call(this);
  },

  /**
   * Get the list of docShells in the currently attached tabActor. Note that we
   * always list the docShells included in the real root docShell, even if the
   * tabActor was switched to a child frame. This is because for now, paint
   * markers are only recorded at parent frame level so switching the timeline
   * to a child frame would hide all paint markers.
   * See https://bugzilla.mozilla.org/show_bug.cgi?id=1050773#c14
   * @return {Array}
   */
  get docShells() {
    let docShellsEnum = this.tabActor.originalDocShell.getDocShellEnumerator(
      Ci.nsIDocShellTreeItem.typeAll,
      Ci.nsIDocShell.ENUMERATE_FORWARDS
    );

    let docShells = [];
    while (docShellsEnum.hasMoreElements()) {
      let docShell = docShellsEnum.getNext();
      docShells.push(docShell.QueryInterface(Ci.nsIDocShell));
    }

    return docShells;
  },

  /**
   * At regular intervals, pop the markers from the docshell, and forward
   * markers if any.
   */
  _pullTimelineData: function() {
    if (!this._isRecording) {
      return;
    }

    let markers = [];
    for (let docShell of this.docShells) {
      markers = [...markers, ...docShell.popProfileTimelineMarkers()];
    }
    if (markers.length > 0) {
      events.emit(this, "markers", markers);
    }

    this._dataPullTimeout = setTimeout(() => {
      this._pullTimelineData();
    }, DEFAULT_TIMELINE_DATA_PULL_TIMEOUT);
  },

  /**
   * Are we recording profile markers currently?
   */
  isRecording: method(function() {
    return this._isRecording;
  }, {
    request: {},
    response: {
      value: RetVal("boolean")
    }
  }),

  /**
   * Start recording profile markers.
   */
  start: method(function() {
    if (this._isRecording) {
      return;
    }
    this._isRecording = true;

    for (let docShell of this.docShells) {
      docShell.recordProfileTimelineMarkers = true;
    }

    this._pullTimelineData();
  }, {}),

  /**
   * Stop recording profile markers.
   */
  stop: method(function() {
    if (!this._isRecording) {
      return;
    }
    this._isRecording = false;

    for (let docShell of this.docShells) {
      docShell.recordProfileTimelineMarkers = false;
    }

    clearTimeout(this._dataPullTimeout);
  }, {}),

  /**
   * When a new window becomes available in the tabActor, start recording its
   * markers if we were recording.
   */
  _onWindowReady: function({window}) {
    if (this._isRecording) {
      // XXX As long as bug 1070089 isn't fixed, each docShell has its own start
      // recording time, so markers aren't going to be properly ordered.
      let docShell = window.QueryInterface(Ci.nsIInterfaceRequestor)
                           .getInterface(Ci.nsIWebNavigation)
                           .QueryInterface(Ci.nsIDocShell);
      docShell.recordProfileTimelineMarkers = true;
    }
  }
});

exports.TimelineFront = protocol.FrontClass(TimelineActor, {
  initialize: function(client, {timelineActor}) {
    protocol.Front.prototype.initialize.call(this, client, {actor: timelineActor});
    this.manage(this);
  },

  destroy: function() {
    protocol.Front.prototype.destroy.call(this);
  },
});
