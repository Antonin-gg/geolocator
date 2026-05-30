var isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouchDevice) document.body.classList.add("touch");

var historyDepth = 0;
var handlingPopstate = false;

function maximizePanel() {
    document.body.classList.add("ultra-open");
    history.pushState({}, "");
    historyDepth++;
    setTimeout(function () {
        lockPanelPhotoSize(true);
        balanceGeoInfoLayout();
    }, 300);
}

function unmaximizePanel() {
    document.body.classList.add("ultra-collapsing");
    document.body.classList.remove("ultra-open");
    if (!handlingPopstate) {
        handlingPopstate = true;
        history.back();
        historyDepth--;
    }
    setTimeout(function () {
        lockPanelPhotoSize(true);
        balanceGeoInfoLayout();
        document.body.classList.remove("ultra-collapsing");
    }, 300);
}

window.addEventListener("popstate", function () {
    if (handlingPopstate) {
        handlingPopstate = false;
        return;
    }
    handlingPopstate = true;
    if (!document.getElementById("languageOptions").classList.contains("hidden-language")) {
        document.getElementById("languageOptions").classList.add("hidden-language");
        document.getElementById("showToggleLanguage").classList.remove("dropdown-open");
    } else if (document.body.classList.contains("ultra-open")) {
        unmaximizePanel();
    } else if (document.body.classList.contains("panel-open")) {
        minimizePanel();
        recenterForPanelState();
    } else if (document.body.classList.contains("strip-open")) {
        closeStrip();
    }
    if (historyDepth > 0) historyDepth--;
    handlingPopstate = false;
});

// ── TOUCH GESTURE CONSTANTS ────────────────────────────────────────
// These thresholds decide when a drag counts as an intentional swipe
// versus an accidental nudge or a slow drag that should snap back.

var SWIPE_DISTANCE = 40;      // px — minimum travel to commit a swipe
var SWIPE_VELOCITY = 0.4;     // px/ms — a fast flick commits even if short
var AXIS_LOCK = 8;            // px — movement before we decide H vs V
var SNAP_RESISTANCE = 0.4;    // multiplier for rubber-banding past bounds


// ── STRIP GESTURES ─────────────────────────────────────────────────
// The strip (minimized bar) responds to two gestures:
//   • swipe UP   → open the full panel
//   • swipe LEFT or RIGHT → close the result entirely
// History is handled inside openPanel() and closeStrip(), so this
// function never touches history itself.

function attachStripGestures() {
    var strip = document.getElementById("resultStrip");
    var panel = document.getElementById("resultPanel");

    // Per-gesture scratch state. Reset on every touchstart.
    var startX, startY, startTime;
    var axis = null;        // "h" once we lock horizontal, "v" once vertical
    var isDragging = false;
    var panelH = 0;

    strip.addEventListener("touchstart", function (e) {
        // Record where and when the finger landed.
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        axis = null;
        isDragging = true;
        panelH = isLandscape()
            ? panel.getBoundingClientRect().width
            : panel.getBoundingClientRect().height;
        strip.style.transition = "none";
        panel.style.transition = "none";
    }, { passive: true });

    strip.addEventListener("touchmove", function (e) {
        if (!isDragging) return;

        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;

        // Axis lock: the first meaningful movement decides whether this
        // is a horizontal or vertical gesture, and we commit to that axis
        // for the rest of the drag. This stops diagonal drags from feeling
        // ambiguous — once you start going sideways, it stays sideways.
        if (!axis) {
            if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
            axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        }

        // preventDefault stops the browser from scrolling the page or
        // triggering pull-to-refresh while the user is dragging the strip.
        e.preventDefault();

        if (isLandscape()) {
            if (axis === "h") {
                if (dx > 0) {
                    // rightward = open panel preview
                    strip.style.opacity = 1 - Math.min(dx / panelH, 1);
                    panel.style.transform = "translateX(" + Math.max(-panelH, -panelH + dx) + "px)";
                } else {
                    strip.style.transform = "translateX(" + dx * 0.2 + "px)";
                }
            } else {
                // vertical axis = close gesture (same as portrait horizontal)
                strip.style.transform = "translateY(" + dy + "px)";
                strip.style.opacity = 1 - Math.min(Math.abs(dy) / 120, 1) * 0.6;
            }
            return;
        }

        if (axis === "v") {
            // Only upward drag is meaningful (opening the panel).
            // Downward gets heavy resistance (×0.2) so it barely moves —
            // there's nothing below the strip to reveal.
            if (dy < 0) {
                // Upward: strip fades out, panel slides in from bottom
                var progress = Math.min(Math.abs(dy) / panelH, 1);
                strip.style.opacity = 1 - progress;
                strip.style.transform = "";
                panel.style.transform = "translateY(" + Math.max(0, panelH + dy) + "px)";
            } else {
                // Downward: light resistance on strip only, no panel movement
                strip.style.transform = "translateY(" + dy * 0.2 + "px)";
                strip.style.opacity = "";
            }
        } else {
            // Horizontal: the strip slides with the finger and fades out,
            // previewing the "close" action visually before release.
            strip.style.transform = "translateX(" + dx + "px)";
            strip.style.opacity = 1 - Math.min(Math.abs(dx) / 120, 1) * 0.6;
        }
    }, { passive: false });

    strip.addEventListener("touchend", function (e) {
        if (!isDragging) return;
        isDragging = false;

        // Restore the CSS transition and clear the inline drag styles.
        // Whatever happens next (commit or snap-back) now animates smoothly.
        strip.style.transition = "";
        panel.style.transition = "";

        // No axis means the finger never moved past AXIS_LOCK — treat as a
        // tap, not a swipe, and do nothing.
        if (!axis) {
            strip.style.transform = "";
            strip.style.opacity = "";
            panel.style.transform = "";
            return;
        }
        var dx = e.changedTouches[0].clientX - startX;
        var dy = e.changedTouches[0].clientY - startY;
        var dt = Date.now() - startTime;
        var vx = Math.abs(dx) / dt;   // horizontal speed
        var vy = Math.abs(dy) / dt;   // vertical speed

        if (isLandscape()) {
            // primary = horizontal, secondary = vertical
            if (axis === "h") {
                if (dx > SWIPE_DISTANCE || vx > SWIPE_VELOCITY) {
                    openPanel(
                        currentPlaceName, currentPhotoHtml,
                        currentMethod, currentShortName, currentIsAI
                    );
                    panel.style.transform = "";
                    recenterForPanelState();
                } else {
                    strip.style.opacity = ""; panel.style.transform = "";
                }
            } else {
                if (Math.abs(dy) > 80 || vy > SWIPE_VELOCITY) closeStrip();
            }
            axis = null;
            return;
        }

        if (axis === "v") {
            strip.style.transform = "";
            strip.style.opacity = "";
            // Commit to opening the panel if the drag was far enough OR
            // fast enough (a quick flick shouldn't need full distance).
            if (dy < -SWIPE_DISTANCE || vy > SWIPE_VELOCITY) {
                openPanel(
                    currentPlaceName, currentPhotoHtml,
                    currentMethod, currentShortName, currentIsAI
                );
                panel.style.transform = "";
                recenterForPanelState();
            }
            // Otherwise the cleared transform + restored transition let the
            // strip ease back to its resting position — a natural snap-back.
        } else {
            strip.style.transform = "";
            strip.style.opacity = "";
            panel.style.transform = "";
            // Horizontal swipe past distance or velocity closes the result.
            if (Math.abs(dx) > 80 || vx > SWIPE_VELOCITY) {
                closeStrip();
            }
            // Otherwise: snap back, same as above.
        }
        axis = null;
    }, { passive: true });

    strip.addEventListener("touchcancel", function () {
        if (!isDragging) return;
        isDragging = false;
        axis = null;
        strip.style.transition = "";
        strip.style.transform = "";
        strip.style.opacity = "";
        panel.style.transition = "";
        panel.style.transform = "";
    }, { passive: true });
}


// ── PANEL GESTURES ─────────────────────────────────────────────────
// The panel responds to vertical drags:
//   • from panel,  swipe UP   → ultra
//   • from panel,  swipe DOWN → strip
//   • from ultra,  swipe DOWN → panel
//
// The panel visually follows the finger during the drag (drag-follow),
// then on release either commits to a new state or snaps back.
//
// Two zones can initiate a drag:
//   • the handle (always draggable)
//   • the panel body, but ONLY when the content isn't scrollable —
//     if it's scrollable, a downward drag should scroll the content,
//     not move the panel.
//
// History is handled inside maximizePanel / unmaximizePanel /
// minimizePanel, so this function never touches history itself.

function attachPanelGestures() {
    var panel = document.getElementById("resultPanel");
    var content = document.getElementById("panelContent");

    var startX, startY, startTime;
    var panelStartWidth = null;
    var isDragging = false;
    var deferring = false;   // body touch on scrollable content: wait for direction
    var axis = null;

    // How much taller ultra is than the current panel. The drag has to
    // cover this distance to fully "fill" from panel up to ultra, so the
    // commit threshold and rubber-band bound are both derived from it.
    function getUltraExtraHeight() {
        if (isLandscape()) {
            var panelW = panel.getBoundingClientRect().width;
            return (window.innerWidth - 30) - panelW;
        }
        var panelH = panel.getBoundingClientRect().height;
        return (window.innerHeight - 30) - panelH;
    }

    function onDragStart(e) {
        var isHandle = e.target.closest("#panelHandle");
        var isScrollable = content.classList.contains("scrollable");
        panelStartWidth = panel.getBoundingClientRect().width;

        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        startTime = Date.now();
        axis = null;
        if (isHandle || !isScrollable) {
            isDragging = true;
            deferring = false;
        } else {
            isDragging = false;
            deferring = true;
        }
    }

    function lockAxis() {
        axis = isLandscape() ? "h" : "v";
    }

    function onDragMove(e) {
        if (!isDragging && !deferring) return;
        var landscape = isLandscape();
        var dy = e.touches[0].clientY - startY;
        var dx = e.touches[0].clientX - startX;
        var delta = landscape ? dx : dy;  // +right or +down = "minimize direction" in portrait, "expand" in landscape
        var isUltra = document.body.classList.contains("ultra-open");

        if (deferring) {
            if (Math.abs(delta) < AXIS_LOCK) return;
            if (!e.cancelable) { deferring = false; return; }

            if (isLandscape()) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal dominant → panel drag
                    isDragging = true;
                    deferring = false;
                    lockAxis();
                } else {
                    // Vertical dominant → let content scroll
                    deferring = false;
                }
            } else {
                var goingDown = dy > 0;
                var atTop = content.scrollTop < 1;
                var atBottom = content.scrollHeight - content.scrollTop - content.clientHeight < 1;
                if ((goingDown && atTop) || (!goingDown && atBottom)) {
                    isDragging = true; deferring = false; lockAxis();
                } else { deferring = false; return; }
            }
        }

        if (!isDragging) return;
        if (!e.cancelable) { isDragging = false; return; }
        e.preventDefault();

        var offset = delta;

        if (!axis) {
            if (Math.abs(delta) < AXIS_LOCK) return;
            lockAxis();
        } else {
            var extraSize = getUltraExtraHeight();
            var panelSize = landscape
                ? panel.getBoundingClientRect().width
                : panel.getBoundingClientRect().height;

            if (landscape) {
                // +dx = right = EXPAND  (opposite sign to portrait's -dy = up = expand)
                if (isUltra && delta > 0) {
                    offset = delta * SNAP_RESISTANCE;
                } else if (!isUltra && delta > 0) {
                    if (delta > extraSize) offset = extraSize + (delta - extraSize) * SNAP_RESISTANCE;
                    document.body.classList.add("dragging-panel-up");
                } else if (delta < 0) {
                    if (delta < -panelSize) offset = -panelSize + (delta + panelSize) * SNAP_RESISTANCE;
                    if (!isUltra) document.body.classList.remove("dragging-panel-up");
                }
                panel.style.transition = "none";
                panel.style.transform = "translateX(" + offset + "px)";
            } else {
                // portrait (unchanged)
                if (isUltra && delta < 0) {
                    offset = delta * SNAP_RESISTANCE;
                } else if (!isUltra && delta < 0) {
                    if (delta < -extraSize) offset = -extraSize + (delta + extraSize) * SNAP_RESISTANCE;
                    document.body.classList.add("dragging-panel-up");
                } else if (delta > 0) {
                    if (delta > panelSize) offset = panelSize + (delta - panelSize) * SNAP_RESISTANCE;
                    if (!isUltra) document.body.classList.remove("dragging-panel-up");
                }
                panel.style.transition = "none";
                panel.style.transform = "translateY(" + offset + "px)";
            }
        }
    }

    function onDragEnd(e) {
        if (!isDragging && !deferring) return;
        var wasActive = isDragging;
        isDragging = false; deferring = false;
        panel.style.transition = "";
        panel.style.transform = "";
        if (!wasActive || !axis) return;

        var landscape = isLandscape();
        var delta = landscape
            ? e.changedTouches[0].clientX - startX
            : e.changedTouches[0].clientY - startY;
        var dt = Date.now() - startTime;
        var v = delta / dt;   // signed velocity

        var isUltra = document.body.classList.contains("ultra-open");
        var extraSize = getUltraExtraHeight();
        var panelSize = landscape
            ? panel.getBoundingClientRect().width
            : panel.getBoundingClientRect().height;

        if (landscape) {
            var flickExpand = v > SWIPE_VELOCITY;
            var flickMinimize = v < -SWIPE_VELOCITY;
            var expandThresh = extraSize * 0.3;
            var minimizeThresh = -panelSize * 0.3;

            if (isUltra) {
                if (flickMinimize || delta < minimizeThresh) unmaximizePanel();
            } else {
                if (flickExpand || delta > expandThresh) {
                    clearPanelDragPreviewAfterTransition();
                    maximizePanel();
                } else if (flickMinimize || delta < minimizeThresh) {
                    clearPanelDragPreviewAfterTransition();
                    minimizePanel();
                    recenterForPanelState();
                } else {
                    clearPanelDragPreviewAfterTransition();
                }
            }
        } else {
            // portrait (unchanged)
            var flickUp = v < -SWIPE_VELOCITY;
            var flickDown = v > SWIPE_VELOCITY;
            var upThresh = -extraSize * 0.3;
            var downThresh = panelSize * 0.3;

            if (isUltra) {
                if (flickDown || delta > downThresh) unmaximizePanel();
            } else {
                if (flickUp || delta < upThresh) {
                    clearPanelDragPreviewAfterTransition();
                    maximizePanel();
                } else if (flickDown || delta > downThresh) {
                    clearPanelDragPreviewAfterTransition();
                    minimizePanel();
                    recenterForPanelState();
                } else {
                    clearPanelDragPreviewAfterTransition();
                }
            }
        }
        axis = null;
    }

    function cancelPanelDrag() {
        isDragging = false;
        deferring = false;
        axis = null;
        panel.style.transition = "";
        panel.style.transform = "";
    }

    // Attach to the panel itself. touchmove must be non-passive because we
    // call preventDefault() inside it to block native scroll during a drag.
    panel.addEventListener("touchstart", onDragStart, { passive: true });
    panel.addEventListener("touchmove", onDragMove, { passive: false });
    panel.addEventListener("touchend", onDragEnd, { passive: true });
    panel.addEventListener("touchcancel", cancelPanelDrag, { passive: true });
}

function clearPanelDragPreviewAfterTransition() {
    setTimeout(function () {
        document.body.classList.remove("dragging-panel-up");
    }, 300);
}

function isLandscape() {
    return window.innerWidth > window.innerHeight;
}

// Given a target, returns the center to pass to setView/flyTo so the target
// lands in the VISIBLE region of the full-screen touch map (panel occludes
// the bottom half in portrait, the left half in landscape). `zoom` must be the
// DESTINATION zoom, since projection is zoom-dependent.
function offsetCenterForPanel(targetLatLng, zoom) {
    if (!isTouchDevice || !document.body.classList.contains("panel-open")) {
        return targetLatLng;
    }
    var pt = map.project(targetLatLng, zoom);
    var panel = document.getElementById("resultPanel").getBoundingClientRect();
    if (isLandscape()) {
        pt.x -= panel.width / 2;    // center left of target → target shifts right into the visible right half
    } else {
        pt.y += panel.height / 2;   // center below target → target shifts up into the visible top half
    }
    return map.unproject(pt, zoom);
}

function visiblePadding() {
    if (!isTouchDevice || !document.body.classList.contains("panel-open")) {
        return { paddingTopLeft: [15, 15], paddingBottomRight: [15, 15] };
    }
    var panel = document.getElementById("resultPanel").getBoundingClientRect();
    if (isLandscape()) {
        return { paddingTopLeft: [panel.width + 15, 15], paddingBottomRight: [15, 15] };
    }
    return { paddingTopLeft: [15, 15], paddingBottomRight: [15, panel.height + 15] };
}

// Re-frames the current result for the panel state we just transitioned INTO.
// Call AFTER openPanel()/minimizePanel() so body.panel-open reflects the target.
// Point  → panBy half the panel extent (into visible region when opening,
//          back to center when minimizing).
// Bounds → flyToBounds with panel-aware padding (absolute, state-driven).
function recenterForPanelState() {
    if (!isTouchDevice || locationPreviewInProgress || currentLat == null || currentLng == null) return;

    if (locationPolygon) {
        map.flyToBounds(locationPolygon.getBounds(), visiblePadding());
        return;
    }

    var panel = document.getElementById("resultPanel").getBoundingClientRect();
    var sign = document.body.classList.contains("panel-open") ? 1 : -1;  // opening vs minimizing
    if (isLandscape()) {
        map.panBy([-sign * panel.width / 2, 0], { animate: true });
    } else {
        map.panBy([0, sign * panel.height / 2], { animate: true });
    }
}
