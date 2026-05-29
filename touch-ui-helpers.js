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
    document.body.classList.remove("ultra-open");
    if (!handlingPopstate) {
        handlingPopstate = true;
        history.back();
        historyDepth--;
    }
    setTimeout(function () {
        lockPanelPhotoSize(true);
        balanceGeoInfoLayout();
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

    // Per-gesture scratch state. Reset on every touchstart.
    var startX, startY, startTime;
    var axis = null;        // "h" once we lock horizontal, "v" once vertical
    var isDragging = false;

    strip.addEventListener("touchstart", function (e) {
        // Record where and when the finger landed.
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        axis = null;
        isDragging = true;

        // Kill the CSS transition so the strip follows the finger
        // instantly instead of easing toward each position.
        strip.style.transition = "none";
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

        if (axis === "v") {
            // Only upward drag is meaningful (opening the panel).
            // Downward gets heavy resistance (×0.2) so it barely moves —
            // there's nothing below the strip to reveal.
            var clampedDy = dy < 0 ? dy : dy * 0.2;
            strip.style.transform = "translateY(" + clampedDy + "px)";
        } else {
            // Horizontal: the strip slides with the finger and fades out,
            // previewing the "close" action visually before release.
            strip.style.transform = "translateX(" + dx + "px)";
            var progress = Math.min(Math.abs(dx) / 120, 1);
            strip.style.opacity = 1 - progress * 0.6;
        }
    }, { passive: false });

    strip.addEventListener("touchend", function (e) {
        if (!isDragging) return;
        isDragging = false;

        // Restore the CSS transition and clear the inline drag styles.
        // Whatever happens next (commit or snap-back) now animates smoothly.
        strip.style.transition = "";
        strip.style.transform = "";
        strip.style.opacity = "";

        // No axis means the finger never moved past AXIS_LOCK — treat as a
        // tap, not a swipe, and do nothing.
        if (!axis) return;

        var dx = e.changedTouches[0].clientX - startX;
        var dy = e.changedTouches[0].clientY - startY;
        var dt = Date.now() - startTime;
        var vx = Math.abs(dx) / dt;   // horizontal speed
        var vy = Math.abs(dy) / dt;   // vertical speed

        if (axis === "v") {
            // Commit to opening the panel if the drag was far enough OR
            // fast enough (a quick flick shouldn't need full distance).
            if (dy < -SWIPE_DISTANCE || vy > SWIPE_VELOCITY) {
                openPanel(
                    currentPlaceName, currentPhotoHtml,
                    currentMethod, currentShortName, currentIsAI
                );
            }
            // Otherwise the cleared transform + restored transition let the
            // strip ease back to its resting position — a natural snap-back.
        } else {
            // Horizontal swipe past distance or velocity closes the result.
            if (Math.abs(dx) > 80 || vx > SWIPE_VELOCITY) {
                closeStrip();
            }
            // Otherwise: snap back, same as above.
        }
        axis = null;
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

    var startY, startTime;
    var isDragging = false;
    var axis = null;

    // How much taller ultra is than the current panel. The drag has to
    // cover this distance to fully "fill" from panel up to ultra, so the
    // commit threshold and rubber-band bound are both derived from it.
    function getUltraExtraHeight() {
        var panelH = panel.getBoundingClientRect().height;
        var ultraH = window.innerHeight - 30;   // ultra leaves a 30px map peek
        return ultraH - panelH;
    }

    // Decide whether this touch is allowed to start a panel drag.
    // The handle always qualifies. The body only qualifies when the
    // content isn't scrollable (otherwise we'd hijack the user's scroll).
    function canDrag(e) {
        var isHandle = e.target.closest("#panelHandle");
        var isScrollable = content.classList.contains("scrollable");
        return isHandle || !isScrollable;
    }

    function onDragStart(e) {
        if (!canDrag(e)) return;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        axis = null;
        isDragging = true;
    }

    function onDragMove(e) {
        if (!isDragging) return;
        if (!e.cancelable) {
            isDragging = false;
            return;
        }
        e.preventDefault();

        var dy = e.touches[0].clientY - startY;   // +down, −up
        var isUltra = document.body.classList.contains("ultra-open");
        var offset = dy;

        if (!axis) {
            if (Math.abs(dy) < AXIS_LOCK) return;
            axis = "v";
            if (!isUltra) {
                document.body.classList.add("dragging-panel");
                requestAnimationFrame(function () {
                    map.invalidateSize({ pan: false, debounceMoveend: true });
                });
            }
        } else {
            // Rubber-banding: past a natural limit, movement is damped so the
            // panel resists rather than flying off. Gives a physical "edge" feel.
            if (isUltra && dy < 0) {
                // Already at the top in ultra — resist any further upward drag.
                offset = dy * SNAP_RESISTANCE;
            } else if (!isUltra && dy < 0) {
                // Dragging up from panel toward ultra: free until we reach the
                // ultra height, then resist going beyond it.
                var ultraLimit = -getUltraExtraHeight();
                if (dy < ultraLimit) {
                    offset = ultraLimit + (dy - ultraLimit) * SNAP_RESISTANCE;
                }
                document.body.classList.add("dragging-panel-up");
            } else if (dy > 0) {
                // Dragging down toward the strip: free until the panel's own
                // height, then resist (there's nothing more to reveal below).
                var downLimit = panel.getBoundingClientRect().height;
                if (dy > downLimit) {
                    offset = downLimit + (dy - downLimit) * SNAP_RESISTANCE;
                }
                if (!isUltra) {
                    document.body.classList.remove("dragging-panel-up");
                }
            }

            // Follow the finger. Transition off = instant, physical tracking.
            panel.style.transition = "none";
            panel.style.transform = "translateY(" + offset + "px)";
        }
    }

    function onDragEnd(e) {
        if (!isDragging) return;
        isDragging = false;

        // Hand control back to CSS: clearing the transform lets the panel
        // animate to whatever its class-driven resting position is.
        panel.style.transition = "";
        panel.style.transform = "";

        if (!axis) return;

        var dy = e.changedTouches[0].clientY - startY;
        var dt = Date.now() - startTime;
        var vy = dy / dt;   // signed: negative = upward flick

        var isUltra = document.body.classList.contains("ultra-open");
        var panelH = panel.getBoundingClientRect().height;
        var ultraExtra = getUltraExtraHeight();

        var flickUp = vy < -SWIPE_VELOCITY;
        var flickDown = vy > SWIPE_VELOCITY;

        // Distance commit thresholds: 30% of the relevant travel distance.
        var upThreshold = -ultraExtra * 0.3;   // far enough up toward ultra
        var downThreshold = panelH * 0.3;       // far enough down toward strip

        if (isUltra) {
            // From ultra, the only exit is downward → panel.
            if (flickDown || dy > downThreshold) {
                unmaximizePanel();
            }
            // else: snap back to ultra (cleared transform handles it).
        } else {
            // From panel: up → ultra, down → strip, neither → snap back.
            if (flickUp || dy < upThreshold) {
                clearPanelDragPreviewAfterTransition();
                maximizePanel();
            } else if (flickDown || dy > downThreshold) {
                clearPanelDragPreviewAfterTransition();
                minimizePanel();
            } else {
                clearPanelDragPreviewAfterTransition();
                requestAnimationFrame(function () {
                    map.invalidateSize({ pan: false, debounceMoveend: true });
                });
            }
        }
        axis = null;
    }

    function cancelPanelDrag() {
        isDragging = false;
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
    var panel = document.getElementById("resultPanel");

    function cleanup(e) {
        if (e.propertyName !== "transform") return;

        document.body.classList.remove("dragging-panel");
        document.body.classList.remove("dragging-panel-up");

        panel.removeEventListener("transitionend", cleanup);
    }

    panel.addEventListener("transitionend", cleanup)
}
