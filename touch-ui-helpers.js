var isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouchDevice) document.body.classList.add("touch");

var historyDepth = 0;

function maximizePanel() {
    document.body.classList.add("ultra-open");
    history.pushState({}, "");
    historyDepth++;
    setTimeout(function() {
        lockPanelPhotoSize(true);
        balanceGeoInfoLayout();
    }, 300);
}

function unmaximizePanel() {
    document.body.classList.remove("ultra-open");
    setTimeout(function() {
        lockPanelPhotoSize(true);
        balanceGeoInfoLayout();
    }, 300);
}

window.addEventListener("popstate", function () {
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
});

var SWIPE_THRESHOLD = 50;
var SWIPE_VELOCITY = 0.3;
var AXIS_LOCK_THRESHOLD = 8;

function attachStripGestures() {
    var strip = document.getElementById("resultStrip");
    var startX, startY, startTime;
    var axis = null;
    var isDragging = false;

    var STRIP_HEIGHT = 52;  // matches your CSS

    strip.addEventListener("touchstart", function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        axis = null;
        isDragging = true;
        strip.style.transition = "none";
    }, { passive: true });

    strip.addEventListener("touchmove", function(e) {
        if (!isDragging) return;

        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;

        if (!axis) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        }

        e.preventDefault();

        if (axis === "v") {
            // upward drag only — resistance on downward
            var clampedDy = dy < 0 ? dy : dy * 0.2;
            strip.style.transform = "translateY(" + clampedDy + "px)";
        } else {
            // horizontal — slide strip away
            strip.style.transform = "translateX(" + dx + "px)";
            // fade out as it slides
            var progress = Math.min(Math.abs(dx) / 120, 1);
            strip.style.opacity = 1 - progress * 0.6;
        }
    }, { passive: false });

    strip.addEventListener("touchend", function(e) {
        if (!isDragging) return;
        isDragging = false;

        strip.style.transition = "";
        strip.style.transform = "";
        strip.style.opacity = "";

        if (!axis) return;

        var dx = e.changedTouches[0].clientX - startX;
        var dy = e.changedTouches[0].clientY - startY;
        var dt = Date.now() - startTime;
        var vx = Math.abs(dx) / dt;
        var vy = Math.abs(dy) / dt;

        if (axis === "v") {
            if (dy < -40 || vy > 0.4) {
                openPanel(currentPlaceName, currentPhotoHtml, currentMethod, currentShortName, currentIsAI);
                pushPanelHistory(1);
            }
            // else snap back — transition + empty transform handles it
        } else {
            if (Math.abs(dx) > 80 || vx > 0.4) {
                closeStrip();
                clearPanelHistory();
            }
        }
    }, { passive: true });
}

function attachPanelGestures() {
    var handle = document.getElementById("panelHandle");
    var panel = document.getElementById("resultPanel");
    var content = document.getElementById("panelContent");

    var startY, startTime;
    var currentDragY = 0;
    var isDragging = false;

    // Snap points relative to current panel position (positive = down)
    // We work in terms of how far from resting position the panel is dragged
    var SNAP_RESISTANCE = 0.4;  // dampens drag beyond natural bounds

    function getPanelHeight() {
        return panel.getBoundingClientRect().height;
    }

    function getUltraExtraHeight() {
        // how much taller ultra is compared to panel
        // ultra = 100dvh - 30px, panel = 50dvh (portrait) or full (landscape)
        var panelH = getPanelHeight();
        var ultraH = window.innerHeight - 30;
        return ultraH - panelH;
    }

    function applyDragOffset(dy) {
        // no transition during drag
        panel.style.transition = "none";
        panel.style.transform = "translateY(" + dy + "px)";
    }

    function snapToState(targetState) {
        panel.style.transition = "";  // restore CSS transition
        panel.style.transform = "";   // let CSS handle final position

        if (targetState === "ultra") {
            if (!document.body.classList.contains("ultra-open")) {
                maximizePanel();
            }
        } else if (targetState === "panel") {
            if (document.body.classList.contains("ultra-open")) {
                unmaximizePanel();
            }
            // already panel-open, just removing transform is enough
        } else if (targetState === "strip") {
            if (document.body.classList.contains("ultra-open")) {
                unmaximizePanel();
            }
            minimizePanel();
            popPanelHistory();
        }
    }

    function onDragStart(e) {
        // check if we should handle this touch
        var isHandle = e.target.closest("#panelHandle");
        var isScrollable = content.classList.contains("scrollable");

        if (!isHandle && isScrollable) return;  // let content scroll

        startY = e.touches[0].clientY;
        startTime = Date.now();
        currentDragY = 0;
        isDragging = true;
    }

    function onDragMove(e) {
        if (!isDragging) return;

        var isHandle = e.target.closest("#panelHandle");
        var isScrollable = content.classList.contains("scrollable");
        if (!isHandle && isScrollable) {
            isDragging = false;
            return;
        }

        e.preventDefault();

        var dy = e.touches[0].clientY - startY;
        currentDragY = dy;

        var isUltra = document.body.classList.contains("ultra-open");

        // Apply resistance at bounds
        // Can't drag further up than ultra, can't drag further down than strip
        if (isUltra && dy < 0) {
            // already at top — resistance going further up
            currentDragY = dy * SNAP_RESISTANCE;
        } else if (!isUltra && dy < 0) {
            // dragging up toward ultra — free movement
            // but add slight resistance past ultra threshold
            var ultraThreshold = -getUltraExtraHeight();
            if (dy < ultraThreshold) {
                currentDragY = ultraThreshold + (dy - ultraThreshold) * SNAP_RESISTANCE;
            }
        } else if (dy > 0) {
            // dragging down — free movement toward strip
            // add resistance past strip threshold
            var stripThreshold = getPanelHeight();
            if (dy > stripThreshold) {
                currentDragY = stripThreshold + (dy - stripThreshold) * SNAP_RESISTANCE;
            }
        }

        applyDragOffset(currentDragY);
    }

    function onDragEnd(e) {
        if (!isDragging) return;
        isDragging = false;

        var dy = e.changedTouches[0].clientY - startY;
        var dt = Date.now() - startTime;
        var vy = dy / dt;  // signed velocity — negative = upward

        var isUltra = document.body.classList.contains("ultra-open");
        var panelH = getPanelHeight();
        var ultraExtra = getUltraExtraHeight();

        // Velocity threshold overrides distance threshold
        var VELOCITY_THRESHOLD = 0.4;  // px/ms
        var isFlickUp = vy < -VELOCITY_THRESHOLD;
        var isFlickDown = vy > VELOCITY_THRESHOLD;

        // Distance thresholds — 30% of travel distance
        var upThreshold = -ultraExtra * 0.3;
        var downThreshold = panelH * 0.3;

        var targetState;

        if (isUltra) {
            if (isFlickDown || dy > downThreshold) {
                targetState = "panel";
            } else {
                targetState = "ultra";  // snap back
            }
        } else {
            // currently panel
            if (isFlickUp || dy < upThreshold) {
                targetState = "ultra";
            } else if (isFlickDown || dy > downThreshold) {
                targetState = "strip";
            } else {
                targetState = "panel";  // snap back
            }
        }

        snapToState(targetState);
    }

    panel.addEventListener("touchstart", onDragStart, { passive: true });
    panel.addEventListener("touchmove", onDragMove, { passive: false });
    panel.addEventListener("touchend", onDragEnd, { passive: true });
}