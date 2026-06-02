/*
 * Touch and responsive layout helpers.
 *
 * This file owns the mobile interaction model: touch detection, compact layout
 * switching, swipe gestures, and map recentering when the panel covers part of
 * the screen. The rest of the app can ask simple questions like isMobileMode()
 * or call recenterForPanelState() without knowing the gesture details.
 */

const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouchDevice) document.body.classList.add("touch");

/*
 * ── MOBILE UI MODE ─────────────────────────────────────────────────
 * Mobile UI applies to all touch devices regardless of screen size, plus
 * non-touch devices under the size threshold. This is computed in JS
 * (not media queries) because media queries can't read touch capability
 * reliably across browsers, and we want a single source of truth.
 */

/**
 * Updates the body class used by CSS to switch between desktop and compact UI.
 * This runs from JS because CSS alone cannot reliably combine touch capability
 * and viewport size into one shared app state.
 */
function updateMobileMode() {
    const isMobileSize = window.innerWidth <= MOBILE_MAX_WIDTH || window.innerHeight <= LANDSCAPE_MAX_HEIGHT;
    document.body.classList.toggle("mobile-display", isTouchDevice || isMobileSize);
}

/**
 * Returns true when the app is currently using the compact layout.
 */
function isMobileMode() {
    return document.body.classList.contains("mobile-display");
}

updateMobileMode();

/*
 * ── STRIP GESTURES ─────────────────────────────────────────────────
 * The strip (minimized panel) responds to two gestures:
 *   • swipe UP   → open the full panel
 *   • swipe LEFT or RIGHT → close the result entirely
 * History is handled inside panel.open() and panel.closeStrip(), so this
 * function never touches history itself.
 */

/**
 * Attaches swipe gestures to the minimized result strip.
 * The strip previews the next state while dragging so the user can see whether
 * the gesture will open the panel or dismiss the result before releasing.
 */
function attachStripGestures() {
    let startX, startY, startTime;
    let axis = null;
    let isDragging = false;
    let panelH = 0;

    elements.strip.addEventListener("touchstart", function (e) {

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
        axis = null;
        isDragging = true;
        panelH = isLandscape()
            ? elements.panel.getBoundingClientRect().width
            : elements.panel.getBoundingClientRect().height;
        elements.strip.style.transition = "none";
        elements.panel.style.transition = "none";
    }, { passive: true });

    elements.strip.addEventListener("touchmove", function (e) {
        if (!isDragging) return;

        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;

        /*
         * Axis lock: the first meaningful movement decides whether this
         * is a horizontal or vertical gesture, and we commit to that axis
         * for the rest of the drag. This stops diagonal drags from feeling
         * ambiguous — once you start going sideways, it stays sideways.
         */
        if (!axis) {
            if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
            axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        }

        /*
         * preventDefault stops the browser from scrolling the page or
         * triggering pull-to-refresh while the user is dragging the strip.
         */
        e.preventDefault();

        if (isLandscape()) {
            if (axis === "h") {
                if (dx > 0) {
                    // In landscape, the strip opens sideways because the panel slides from the left.
                    elements.strip.style.opacity = 1 - Math.min(dx / panelH, 1);
                    elements.panel.style.transform = "translateX(" + Math.min(0, -panelH + dx) + "px)";
                } else {
                    elements.strip.style.transform = "translateX(" + dx * DOWN_DRAG_RESISTANCE + "px)";
                }
            } else {
                // In portrait, dragging up reveals the panel that is hidden below the screen.
                elements.strip.style.transform = "translateY(" + dy + "px)";
                elements.strip.style.opacity = 1 - Math.min(Math.abs(dy) / CLOSE_FADE_DISTANCE, 1) * CLOSE_FADE_OPACITY;
            }
            return;
        }

        if (axis === "v") {
            /*
             * Only upward drag is meaningful (opening the panel).
             * Downward gets heavy resistance (×0.2) so it barely moves
             * as there's nothing below the strip to reveal.
             */
            if (dy < 0) {
                // Upward: strip fades out, panel slides in from bottom
                const progress = Math.min(Math.abs(dy) / panelH, 1);
                elements.strip.style.opacity = 1 - progress;
                elements.strip.style.transform = "";
                elements.panel.style.transform = "translateY(" + Math.max(0, panelH + dy) + "px)";
            } else {
                // Downward: light resistance on strip only, no panel movement
                elements.strip.style.transform = "translateY(" + dy * DOWN_DRAG_RESISTANCE + "px)";
                elements.strip.style.opacity = "";
            }
        } else {
            /*
             * Horizontal: the strip slides with the finger and fades out,
             * previewing the "close" action visually before release.
             */
            elements.strip.style.transform = "translateX(" + dx + "px)";
            elements.strip.style.opacity = 1 - Math.min(Math.abs(dx) / CLOSE_FADE_DISTANCE, 1) * CLOSE_FADE_OPACITY;
        }
    }, { passive: false });

    elements.strip.addEventListener("touchend", function (e) {
        if (!isDragging) return;
        isDragging = false;

        // Reset inline preview styles so CSS controls the final animation again.
        elements.strip.style.transition = "";
        elements.panel.style.transition = "";

        /*
         * No axis means the finger never moved past AXIS_LOCK. It is treated as a
         * tap, not a swipe, and nothing is done.
         */
        if (!axis) {
            elements.strip.style.transform = "";
            elements.strip.style.opacity = "";
            elements.panel.style.transform = "";
            return;
        }
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        const dt = Date.now() - startTime;
        const vx = Math.abs(dx) / dt;   // horizontal speed
        const vy = Math.abs(dy) / dt;   // vertical speed

        if (isLandscape()) {
            // Landscape gestures use horizontal motion as the main panel axis.
            if (axis === "h") {
                if (dx > SWIPE_DISTANCE || vx > SWIPE_VELOCITY) {
                    panel.open();
                    elements.panel.style.transform = "";
                    recenterForPanelState();
                } else {
                    elements.strip.style.opacity = ""; elements.panel.style.transform = "";
                }
            } else {
                if (Math.abs(dy) > CLOSE_SWIPE_DISTANCE || vy > SWIPE_VELOCITY) panel.closeStrip();
            }
            axis = null;
            return;
        }

        if (axis === "v") {
            elements.strip.style.transform = "";
            elements.strip.style.opacity = "";
            /*
             * Commit to opening the panel if the drag was far enough or
             * fast enough (a quick flick shouldn't need full distance).
             */
            if (dy < -SWIPE_DISTANCE || vy > SWIPE_VELOCITY) {
                panel.open();
                elements.panel.style.transform = "";
                recenterForPanelState();
            }
            /*
             * Otherwise the cleared transform + restored transition let the
             * strip ease back to its resting position, a natural snap-back.
             */
        } else {
            elements.strip.style.transform = "";
            elements.strip.style.opacity = "";
            elements.panel.style.transform = "";
            // Horizontal swipe past distance or velocity closes the result.
            if (Math.abs(dx) > CLOSE_SWIPE_DISTANCE || vx > SWIPE_VELOCITY) {
                panel.closeStrip();
            }
            // Otherwise: snap back, same as above.
        }
        axis = null;
    }, { passive: true });

    elements.strip.addEventListener("touchcancel", function () {
        if (!isDragging) return;
        isDragging = false;
        axis = null;
        elements.strip.style.transition = "";
        elements.strip.style.transform = "";
        elements.strip.style.opacity = "";
        elements.panel.style.transition = "";
        elements.panel.style.transform = "";
    }, { passive: true });
}

/*
 * ── PANEL GESTURES ─────────────────────────────────────────────────
 * The panel responds to vertical drags:
 *   • from panel,  swipe UP   → ultra
 *   • from panel,  swipe DOWN → strip
 *   • from ultra,  swipe DOWN → panel
 *
 * The panel visually follows the finger during the drag (drag-follow),
 * then on release either commits to a new state or snaps back.
 *
 * Two zones can initiate a drag:
 *   • the handle (always draggable)
 *   • the panel body, but only when the content isn't scrollable.
 *     If it's scrollable, a downward drag should scroll the content,
 *     not move the panel.
 *
 * History is handled inside maximizePanel / unmaximizePanel /
 * minimizePanel, so this function never touches history itself.
 */
function attachPanelGestures() {
    let startX, startY, startTime;
    let isDragging = false;

    // body touch on scrollable content: wait for direction
    let deferring = false;

    let axis = null;

    /*
     * The amount of extra space between normal panel and ultra panel changes with
     * orientation and viewport size. Deriving thresholds from the live size keeps
     * the gesture proportional on phones, tablets, and rotated screens.
     */
    function getUltraExtraHeight() {
        if (isLandscape()) {
            const panelW = elements.panel.getBoundingClientRect().width;
            return (window.innerWidth - ULTRA_MAP_PEEK_PX) - panelW;
        }
        const panelH = elements.panel.getBoundingClientRect().height;
        return (window.innerHeight - ULTRA_MAP_PEEK_PX) - panelH;
    }

    /*
     * The handle is always allowed to move the panel. The panel body is only allowed
     * to start a drag directly when content is not scrollable, otherwise we wait and
     * let scroll position decide.
     */
    function onDragStart(e) {
        const isHandle = e.target.closest("#panelHandle");
        const isScrollable = elements.content.classList.contains("scrollable");

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

    // Panel movement has only one meaningful axis in each orientation.
    function lockAxis() {
        axis = isLandscape() ? "h" : "v";
    }

    function onDragMove(e) {
        if (!isDragging && !deferring) return;
        const landscape = isLandscape();
        const dy = e.touches[0].clientY - startY;
        const dx = e.touches[0].clientX - startX;
        const delta = landscape ? dx : dy;  // +right or +down = "minimize direction" in portrait, "expand" in landscape
        const isUltra = panel.isUltra;

        /*
         * When content is scrollable, the first pixels of movement are ambiguous. This
         * block lets normal content scrolling win unless the user is dragging past the
         * top or bottom edge, where moving the panel feels natural.
         */
        if (deferring) {
            if (Math.abs(delta) < AXIS_LOCK) return;
            if (!e.cancelable) { deferring = false; return; }

            /*
             * Landscape is mirrored from portrait: expanding means dragging right because
             * the panel grows from the left edge. Rubber-banding keeps overdrags visible
             * without letting the panel run away from its allowed range.
             */
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
                /*
                 * Portrait uses upward motion to expand and downward motion to minimize. The
                 * temporary body class fills the space behind the panel during upward drags so
                 * no map gap appears while the panel follows the finger.
                 */
            } else {
                const goingDown = dy > 0;
                const atTop = elements.content.scrollTop < 1;
                const atBottom = elements.content.scrollHeight - elements.content.scrollTop - elements.content.clientHeight < 1;
                if ((goingDown && atTop) || (!goingDown && atBottom)) {
                    isDragging = true; deferring = false; lockAxis();
                } else { deferring = false; return; }
            }
        }

        if (!isDragging) return;
        if (!e.cancelable) { isDragging = false; return; }
        e.preventDefault();

        let offset = delta;

        if (!axis) {
            if (Math.abs(delta) < AXIS_LOCK) return;
            lockAxis();
        } else {
            const extraSize = getUltraExtraHeight();
            const panelSize = landscape
                ? elements.panel.getBoundingClientRect().width
                : elements.panel.getBoundingClientRect().height;

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
                elements.panel.style.transition = "none";
                elements.panel.style.transform = "translateX(" + offset + "px)";
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
                elements.panel.style.transition = "none";
                elements.panel.style.transform = "translateY(" + offset + "px)";
            }
        }
    }

    /*
     * Release decides whether the drag commits or snaps back. Signed velocity is
     * used here because direction matters, unlike strip closing where only speed
     * away from rest is important.
     */
    function onDragEnd(e) {
        if (!isDragging && !deferring) return;
        const wasActive = isDragging;
        isDragging = false; deferring = false;
        elements.panel.style.transition = "";
        elements.panel.style.transform = "";
        if (!wasActive || !axis) return;

        const landscape = isLandscape();
        const delta = landscape
            ? e.changedTouches[0].clientX - startX
            : e.changedTouches[0].clientY - startY;
        const dt = Date.now() - startTime;
        const v = delta / dt;   // signed velocity

        const isUltra = document.body.classList.contains("ultra-open");
        const extraSize = getUltraExtraHeight();
        const panelSize = landscape
            ? elements.panel.getBoundingClientRect().width
            : elements.panel.getBoundingClientRect().height;

        if (landscape) {
            const flickExpand = v > SWIPE_VELOCITY;
            const flickMinimize = v < -SWIPE_VELOCITY;
            const expandThresh = extraSize * COMMIT_THRESHOLD_RATIO;
            const minimizeThresh = -panelSize * COMMIT_THRESHOLD_RATIO;

            if (isUltra) {
                if (flickMinimize || delta < minimizeThresh) panel.unmaximize();
            } else {
                if (flickExpand || delta > expandThresh) {
                    clearPanelDragPreviewAfterTransition();
                    panel.maximize();
                } else if (flickMinimize || delta < minimizeThresh) {
                    clearPanelDragPreviewAfterTransition();
                    panel.minimize();
                    recenterForPanelState();
                } else {
                    clearPanelDragPreviewAfterTransition();
                }
            }
        } else {
            // portrait (unchanged)
            const flickUp = v < -SWIPE_VELOCITY;
            const flickDown = v > SWIPE_VELOCITY;
            const upThresh = -extraSize * COMMIT_THRESHOLD_RATIO;
            const downThresh = panelSize * COMMIT_THRESHOLD_RATIO;

            if (isUltra) {
                if (flickDown || delta > downThresh) panel.unmaximize();
            } else {
                if (flickUp || delta < upThresh) {
                    clearPanelDragPreviewAfterTransition();
                    panel.maximize();
                } else if (flickDown || delta > downThresh) {
                    clearPanelDragPreviewAfterTransition();
                    panel.minimize();
                    recenterForPanelState();
                } else {
                    clearPanelDragPreviewAfterTransition();
                }
            }
        }
        axis = null;
    }

    // Touch cancellation can happen during browser interruptions, so clear previews defensively.
    function cancelPanelDrag() {
        isDragging = false;
        deferring = false;
        axis = null;
        elements.panel.style.transition = "";
        elements.panel.style.transform = "";
    }

    /*
     * The move listener must be non-passive because panel drags call
     * preventDefault(). Without that, the browser can scroll the page while the
     * panel is supposed to be following the finger.
     */
    elements.panel.addEventListener("touchstart", onDragStart, { passive: true });
    elements.panel.addEventListener("touchmove", onDragMove, { passive: false });
    elements.panel.addEventListener("touchend", onDragEnd, { passive: true });
    elements.panel.addEventListener("touchcancel", cancelPanelDrag, { passive: true });
}

/**
 * Clears the temporary drag-fill class after the panel transition ends.
 * The delay lets CSS finish the snap or commit animation before removing the
 * visual patch behind the moving panel.
 */
function clearPanelDragPreviewAfterTransition() {
    setTimeout(function () {
        document.body.classList.remove("dragging-panel-up");
    }, PANEL_TRANSITION_MS);
}

/**
 * Returns true when the viewport is wider than it is tall.
 * Gesture direction, panel placement, and map padding all depend on this.
 */
function isLandscape() {
    return window.innerWidth > window.innerHeight;
}

/**
 * Returns a shifted map center so the located point lands in the visible area.
 * On touch layouts the map remains full-screen, but the panel covers either the
 * bottom half in portrait or the left half in landscape.
 *
 * @param {L.LatLng} targetLatLng The real location to keep visible.
 * @param {number} zoom The destination zoom, needed because projection depends on zoom.
 * @returns {L.LatLng} The adjusted center to pass to setView() or flyTo().
 */
function offsetCenterForPanel(targetLatLng, zoom) {
    if (!isTouchDevice || !document.body.classList.contains("panel-open")) {
        return targetLatLng;
    }
    const pt = map.project(targetLatLng, zoom);
    const panelSize = elements.panel.getBoundingClientRect();
    if (isLandscape()) {
        pt.x -= panelSize.width / 2;    // center left of target → target shifts right into the visible right half
    } else {
        pt.y += panelSize.height / 2;   // center below target → target shifts up into the visible top half
    }
    return map.unproject(pt, zoom);
}

/**
 * Returns panel-aware padding for flyToBounds().
 * Bounds fitting uses absolute padding rather than a shifted center, which keeps
 * polygons and distance previews visible inside the unobscured map area.
 *
 * @returns {Object} Leaflet fitBounds padding options.
 */
function visiblePadding() {
    const pad = MAP_FIT_PADDING_PX;
    if (!isTouchDevice || !document.body.classList.contains("panel-open")) {
        return { paddingTopLeft: [pad, pad], paddingBottomRight: [pad, pad] };
    }
    const panelSize = elements.panel.getBoundingClientRect();
    if (isLandscape()) {
        return { paddingTopLeft: [panelSize.width + pad, pad], paddingBottomRight: [pad, pad] };
    }
    return { paddingTopLeft: [pad, pad], paddingBottomRight: [pad, panelSize.height + pad] };
}

/**
 * Reframes the current result after a panel state change.
 * Points are nudged by half the panel size, while polygons are refit with
 * panel-aware padding. This keeps the result visually centered in the part of
 * the map that the user can actually see.
 */
function recenterForPanelState() {
    if (!isTouchDevice || locationPreviewInProgress || !currentResult.hasLocation()) return;

    if (currentResult.polygon) {
        map.flyToBounds(currentResult.polygon.getBounds(), visiblePadding());
        return;
    }

    const panelSize = elements.panel.getBoundingClientRect();
    const sign = document.body.classList.contains("panel-open") ? 1 : -1;  // opening vs minimizing
    if (isLandscape()) {
        map.panBy([-sign * panelSize.width / 2, 0], { animate: true });
    } else {
        map.panBy([0, sign * panelSize.height / 2], { animate: true });
    }
}