/*
 * Result panel controller.
 *
 * The panel has three visible states: full panel, minimized strip, and ultra
 * panel on touch devices. This class keeps those transitions in one place so
 * the rest of the app can simply call panel.open(), panel.minimize(),
 * panel.close(), or panel.startLoading().
 *
 * It also owns the panel-specific history behavior on touch devices. That lets
 * the Android back button close temporary UI states in the same order the user
 * opened them.
 */

class Panel {
    // Cache the panel-related DOM nodes on the instance for shorter methods below.
    constructor(map) {
        this.map = map;

        this.panel = elements.panel;
        this.strip = elements.strip;
        this.content = elements.content;
        this.photo = elements.photo;
        this.method = elements.panelMethod;
        this.placeName = elements.placeName;
        this.moreContent = elements.moreContent;
        this.learnMore = elements.learnMore;
        this.mapEl = elements.mapEl;
        this.wrapper = elements.wrapper;
        this.welcome = elements.welcome;
        this.wiki = elements.wiki;
        this.geoInfo = elements.geoInfo;
        this.panelGlobe = elements.panelGlobe;
        this.closeBtn = elements.panelClose;
        this.stripCloseBtn = elements.stripClose;
        this.toggleBtn = elements.panelToggle;
        this.stripToggleBtn = elements.stripToggle;
        this.stripPlaceName = elements.stripPlaceName;
        this.locateHint = elements.locateHint;

        /*
         * Panel-local state.
         *
         * These values describe UI behavior, not the current photo result. The actual
         * result data lives in currentResult so reruns and map logic can share it.
         */
        this.moreContentIsOpen = false;
        this.lockedPhotoHeight = null;
        this.handlingPopstate = false;
        this.scrollHintShown = false;

        this.wireEvents();
    }

    /**
     * Wires panel controls once when the Panel instance is created.
     * Arrow functions keep `this` bound to the Panel instance instead of the clicked
     * button.
     */
    wireEvents() {
        this.closeBtn.addEventListener("click", () => this.close());
        this.stripCloseBtn.addEventListener("click", () => this.closeStrip());
        this.toggleBtn.addEventListener("click", () => this.minimize());
        this.stripToggleBtn.addEventListener("click", () => this.open());
        this.learnMore.addEventListener("click", () => this.toggleMoreContent());

        /*
         * Touch devices use gestures and browser history as part of the panel state
         * flow. Desktop keeps normal button controls only.
         */
        if (isTouchDevice) {
            window.addEventListener("popstate", () => this.handlePopstate());
            attachPanelGestures();
            attachStripGestures();
        }
    }

    /**
     * Reads the current panel state from body classes.
     * CSS already uses these classes to render the states, so JS treats them as the
     * source of truth instead of maintaining a second state variable.
     */
    get state() {
        if (document.body.classList.contains("ultra-open")) return "ultra";
        if (document.body.classList.contains("panel-open")) return "panel";
        if (document.body.classList.contains("strip-open")) return "strip";
        return "closed";
    }

    // Convenience getters keep call sites readable without duplicating class checks.
    get isVisible() { return this.state !== "closed"; }
    get isUltra() { return this.state === "ultra"; }
    get isOpen() { return this.state === "panel"; }
    get isStrip() { return this.state === "strip"; }

    /**
     * Opens the result panel and renders the current result into it.
     * The order matters: history first, content reset, classes next, then layout
     * fixes after the panel is in its target state.
     */
    open() {
        this.pushPanelHistory();
        this.resetPanel();
        this.renderPanelContent();
        this.setPanelOpenState();
        this.syncMoreContentState();
        this.updateUiAfterOpen();
    }

    /**
     * Adds mobile history entries for panel navigation.
     * Opening from closed needs two back steps later: panel to strip, then strip to
     * closed. Opening from strip only needs one.
     */
    pushPanelHistory() {
        if (!isTouchDevice) return;

        if (this.isStrip) {
            history.pushState({}, "");
            return;
        }

        if (!this.isVisible) {
            history.pushState({}, "");
            history.pushState({}, "");
        }
    }

    /**
     * Resets transient panel UI before rendering.
     * Reopened or rerendered panel content should start from the top, instead of
     * preserving the previous scroll position. The marker popup is also closed
     * because the full panel becomes the main photo preview again.
     */
    resetPanel() {
        this.content.scrollTop = 0;

        if (currentResult.marker) {
            currentResult.marker.closePopup();
        }
    }

    /**
     * Renders the currentResult fields into the panel.
     * The sentence comes from either AI or EXIF flow, while this method only handles
     * presentation details such as bolding the short place name.
     */
    renderPanelContent() {
        this.photo.innerHTML = currentResult.photoHtml;

        /*
         * When more content is already open, the photo height was locked before the
         * panel rerender. Reapplying those inline limits prevents the image from jumping
         * during language reruns or panel state changes.
         */
        if (this.moreContentIsOpen && this.lockedPhotoHeight) {
            const img = this.photo.querySelector("img");

            if (img) {
                img.style.maxHeight = this.lockedPhotoHeight + "px";
                img.style.width = "100%";
                img.style.height = "auto";
                img.style.maxWidth = "100%";
                img.style.objectFit = "contain";
                img.style.display = "block";
            }
        }

        const sentence = currentResult.sentence || "";
        const shortName = currentResult.shortName || currentResult.placeName || "";

        const boldedSentence = shortName
            ? sentence.replace(shortName, "<strong>" + shortName + "</strong>")
            : sentence;

        if (boldedSentence === sentence) {
            this.placeName.innerHTML = "<strong>" + sentence + "</strong>";
        } else {
            this.placeName.innerHTML = boldedSentence;
        }

        this.method.textContent = currentResult.method;
    }

    /**
     * Applies the DOM classes for the panel state.
     * Map and wrapper classes are separate from the panel's own open class because
     * they control layout outside the panel.
     */
    setPanelOpenState() {
        this.panel.classList.add("open");
        this.mapEl.classList.add("panel-open");
        this.wrapper.classList.add("panel-open");
        document.body.classList.add("panel-open");

        document.body.classList.remove("strip-open");

        this.strip.style.display = "none";
        this.welcome.style.display = "none";
    }

    /**
     * Restores the learn-more section when the panel is reopened or rerendered.
     * If the user minimized the panel with extra content open, reopening it should
     * keep that expanded state and restore scrollability instead of silently
     * collapsing the section.
     */
    syncMoreContentState() {
        if (this.moreContentIsOpen) {
            this.moreContent.classList.remove("collapsed");
            this.content.classList.add("scrollable");
            this.learnMore.classList.add("expanded");
            return;
        }

        this.moreContent.classList.add("collapsed");
        this.content.classList.remove("scrollable");
        this.learnMore.classList.remove("expanded");

        setTimeout(() => {
            this.lockPhotoSize(true);
        }, 50);
    }

    /**
     * Locks the photo preview to the space left by the visible panel content.
     * The panel mixes fixed elements, optional loading text, and optional more
     * content. Measuring after render keeps the photo large when there is room, but
     * allows scrolling when text or geo info would otherwise overflow.
     *
     * @param {boolean} force Whether to recalculate even when more content is open.
     */
    lockPhotoSize(force) {
        if (this.moreContentIsOpen && !force) return;

        const img = this.photo.querySelector("img");

        if (!img) return;

        this.content.classList.remove("scrollable");
        this.photo.classList.remove("locked");
        img.style.removeProperty("max-height");

        /*
         * Wait one frame so the browser has applied the latest content and class
         * changes before we measure heights.
         */
        requestAnimationFrame(() => {
            const minPhotoHeight = 160;

            const contentHeight = this.content.clientHeight;
            let usedHeight = 0;

            const gap = 14;
            const visibleChildren = Array.from(this.content.children).filter((child) => {
                return child !== this.photo &&
                    child.id !== "moreContent" &&
                    getComputedStyle(child).display !== "none";
            });

            visibleChildren.forEach(function (child) {
                usedHeight += child.offsetHeight;
            });

            usedHeight += Math.max(0, visibleChildren.length) * gap;

            /*
             * During loading, result text has not fully arrived yet. Reserve enough space so
             * the photo does not expand and then suddenly shrink when the result appears.
             */
            let reservedResultHeight = 0;

            if (isSearching) {
                reservedResultHeight += 30;
                reservedResultHeight += 30;
                reservedResultHeight += 28;
                if (isMobileMode()) {
                    reservedResultHeight += 140;
                }
            }

            let availablePhotoHeight = contentHeight - usedHeight - reservedResultHeight - 20;

            let hitMinPhotoHeight = false;

            if (availablePhotoHeight < minPhotoHeight) {
                availablePhotoHeight = minPhotoHeight;
                hitMinPhotoHeight = true;
            }

            this.lockedPhotoHeight = availablePhotoHeight;
            this.photo.style.setProperty("--locked-photo-height", this.lockedPhotoHeight + "px");

            this.photo.classList.add("locked");

            if (this.moreContentIsOpen || hitMinPhotoHeight) {
                this.content.classList.add("scrollable");
            } else {
                this.content.classList.remove("scrollable");
            }
        });
    }

    /**
     * Refreshes shared UI after the full panel opens.
     * Desktop Leaflet maps need an invalidateSize after the CSS transition because
     * the map width changes when the panel pushes it aside.
     */
    updateUiAfterOpen() {
        updateUploadButtons();
        updateLocateUserButton();

        if (!isTouchDevice) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, PANEL_TRANSITION_MS);
        }

        this.showScrollHint();
    }

    /**
     * Closes the result completely.
     * This is a destructive close: it clears the current result, map layers, preview
     * state, and extra content.
     */
    close() {
        stopUserLocationPreview();

        this.popPanelHistory(true);

        this.setPanelClosedState();

        this.updateUiAfterClose();

        this.closeMoreContent();
    }

    /**
     * Applies the closed state and clears the active result.
     * Ultra classes are removed here too so an error or close from ultra cannot
     * leave the body in a stale visual state.
     */
    setPanelClosedState() {
        this.panel.classList.remove("open");
        this.mapEl.classList.remove("panel-open");
        this.wrapper.classList.remove("panel-open");
        document.body.classList.remove("panel-open");
        document.body.classList.remove("ultra-open");
        document.body.classList.remove("ultra-collapsing");

        currentResult.reset();
        this.locateHint.classList.remove("visible");
    }

    /**
     * Removes the mobile history entries created when the panel opened.
     * closingPanel means the user is leaving the result entirely, so the strip entry
     * is also removed.
     *
     * @param {boolean} closingPanel Whether the full result is being closed.
     */
    popPanelHistory(closingPanel) {
        if (isTouchDevice && !this.handlingPopstate) {
            this.handlingPopstate = true;
            history.back();
            if (closingPanel) history.back();
        }
    }

    /**
     * Restores the surrounding UI after the panel transition ends.
     * The welcome message waits for the transition so it does not flash underneath
     * the closing panel.
     */
    updateUiAfterClose() {
        updateUploadButtons();

        updateLocateUserButton();

        setTimeout(() => {
            if (!isTouchDevice) this.map.invalidateSize();
            this.welcome.style.display = "block";
        }, PANEL_TRANSITION_MS);
    }

    /**
     * Returns a compact image preview for the marker popup.
     * The panel photo HTML may have layout styles meant for the panel, so the popup
     * gets its own safer inline image constraints.
     */
    getPopupPhotoHtml() {
        return currentResult.photoHtml.replace(
            "<img ",
            '<img style="max-width:100%;height:auto;border-radius:4px;" '
        );
    }

    /**
     * Moves from the full panel to the minimized strip.
     * The result stays active on the map, but the panel content is hidden and the
     * marker popup becomes the compact photo preview.
     */
    minimize() {
        this.popPanelHistory();

        this.setStripOpenState();

        this.renderStripContent();

        this.updateUiAfterStripOpen();
    }

    /**
     * Applies the minimized strip state.
     * The result is still active, so currentResult is not cleared here.
     */
    setStripOpenState() {
        this.panel.classList.remove("open");
        this.mapEl.classList.remove("panel-open");
        this.wrapper.classList.remove("panel-open");
        document.body.classList.remove("panel-open");

        this.strip.style.display = "flex";
        this.strip.style.opacity = "";
        this.strip.style.transform = "";

        document.body.classList.add("strip-open");
    }

    /**
     * Updates the strip label.
     * During a search, the strip shows loading text because the final short name is
     * not available yet.
     */
    renderStripContent() {
        if (isSearching) {
            this.stripPlaceName.textContent = translate("searching");
        } else {
            this.stripPlaceName.textContent = currentResult.shortName;
        }
    }

    /**
     * Finishes the strip transition.
     * On desktop the map size changes with the panel, and the marker popup gives a
     * small visual reminder of the hidden result.
     */
    updateUiAfterStripOpen() {
        setTimeout(() => {
            if (!isTouchDevice) this.map.invalidateSize();

            if (currentResult.marker) {
                const popupWidth = Math.min(550, Math.round(window.innerWidth * 0.55));
                const miniPopup = L.popup({
                    closeButton: false,
                    maxWidth: popupWidth,
                    closeOnClick: false,
                    autoClose: false,
                    autoPan: false
                })
                    .setContent(this.getPopupPhotoHtml());

                currentResult.marker.bindPopup(miniPopup).openPopup();
            }
        }, PANEL_TRANSITION_MS);
    }

    /**
     * Closes the minimized result completely.
     * Like close(), this is destructive and clears the active result.
     */
    closeStrip() {
        this.popPanelHistory();

        stopUserLocationPreview();

        this.setStripClosedState();

        this.updateUiAfterStripClose();

        this.closeMoreContent();
    }

    /**
     * Applies the fully closed strip state.
     */
    setStripClosedState() {
        this.strip.style.display = "none";
        document.body.classList.remove("strip-open");

        currentResult.reset();
        this.locateHint.classList.remove("visible");
    }

    /**
     * Restores the main upload UI after the strip is dismissed.
     */
    updateUiAfterStripClose() {
        updateUploadButtons();

        this.welcome.style.display = "block";

        updateLocateUserButton();
    }

    /**
     * Expands the panel into ultra mode on touch devices.
     * A history entry is added so the back button can return to normal panel mode.
     */
    maximize() {
        document.body.classList.add("ultra-open");
        history.pushState({}, "");
        setTimeout(() => {
            this.lockPhotoSize(true);
            this.balanceGeoInfoLayout();
        }, PANEL_TRANSITION_MS);
    }

    /**
     * Leaves ultra mode and returns to the normal panel.
     * The temporary ultra-collapsing class keeps CSS transitions stable while the
     * panel shrinks back down.
     */
    unmaximize() {
        document.body.classList.add("ultra-collapsing");
        document.body.classList.remove("ultra-open");
        if (!this.handlingPopstate) {
            this.handlingPopstate = true;
            history.back();
        }
        setTimeout(() => {
            this.lockPhotoSize(true);
            this.balanceGeoInfoLayout();
            document.body.classList.remove("ultra-collapsing");
        }, PANEL_TRANSITION_MS);
    }

    /**
     * Clears expandable panel content.
     * Geo info and wiki content are built per result, so they are reset whenever the
     * result closes or a new search starts.
     */
    closeMoreContent() {
        closeGeoInfo();
        this.closeWiki();
    }

    /**
     * Opens or closes the learn-more section.
     * Scrollability is recalculated after the CSS transition starts because the
     * extra content changes the panel height requirements.
     */
    toggleMoreContent() {
        this.moreContent.classList.toggle("collapsed");
        this.learnMore.classList.toggle("expanded");

        this.moreContentIsOpen = !this.moreContent.classList.contains("collapsed");

        setTimeout(() => {
            if (this.moreContentIsOpen || this.content.scrollHeight > this.content.clientHeight) {
                this.content.classList.add("scrollable");
            } else {
                this.content.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => {
                    this.content.classList.remove("scrollable");
                }, PANEL_TRANSITION_MS);
            }
        }, 250);

        // Bring the first extra-info block into view so the button feels connected to the revealed content.
        if (this.moreContentIsOpen) {
            setTimeout(() => {
                this.geoInfo.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
        }
    }

    /**
     * Gives a subtle scroll hint on small layouts.
     * Some panels look static even when more content is available below the fold, so
     * a short nudge teaches the user that the panel can scroll.
     */
    showScrollHint() {
        if (this.scrollHintShown) return;
        if (window.innerWidth > 768 && window.innerHeight > 500) return;

        if (this.content.scrollHeight <= this.content.clientHeight) return;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        setTimeout(() => {
            this.content.scrollTo({ top: 40, behavior: "smooth" });
        }, 400);

        setTimeout(() => {
            this.content.scrollTo({ top: 0, behavior: "smooth" });
        }, 1000);

        this.scrollHintShown = true;
    }

    /**
     * Adjusts geo info columns to avoid awkward last rows.
     * The default flex layout is good most of the time, but 4, 5, or 6 active cards
     * can leave an unbalanced final row depending on the panel width.
     */
    balanceGeoInfoLayout() {
        const container = this.geoInfo;
        const activeItems = container.querySelectorAll(":scope > div.active");
        const total = activeItems.length;
        if (total === 0) return;

        container.style.removeProperty("--geo-cols");

        const firstTop = activeItems[0].offsetTop;
        let perRow = 0;
        for (let i = 0; i < activeItems.length; i++) {
            if (activeItems[i].offsetTop === firstTop) perRow++;
            else break;
        }

        let forcedCols = null;
        if (perRow === 3 && total === 4) forcedCols = 2;
        if ((perRow === 4 && total >= 5) || (perRow === 5 && total === 6)) forcedCols = 3;

        if (forcedCols !== null) {
            container.style.setProperty("--geo-cols", forcedCols);
        }
    }

    /**
     * Shows the in-panel loading state for a new search.
     * Existing layers and previews are cleared immediately so stale results do not
     * remain visible while the next AI or EXIF flow is running.
     *
     * @param {string} photoHtml HTML for the uploaded photo preview.
     */
    startLoading(photoHtml) {
        currentResult.clearLayers();
        stopUserLocationPreview();
        map.stop();

        this.closeMoreContent();

        this.locateHint.classList.remove("visible");
        clearTimeout(locateButtonTimeout);

        this.photo.innerHTML = photoHtml;
        this.placeName.innerHTML = "<strong> " + translate("searching") + "</strong>";
        this.placeName.classList.add("loading");
        this.panelGlobe.classList.add("globe-active");
        this.method.textContent = "";

        setTimeout(() => {
            this.lockPhotoSize(true);
        }, 50);

        /*
         * If a new search starts while the strip is open, promote it back to the panel.
         * Loading needs more room than the minimized strip can provide.
         */
        if (this.isStrip) {

            if (isTouchDevice) this.pushPanelHistory();

            this.strip.style.display = "none";
            document.body.classList.remove("strip-open");
            this.panel.classList.add("open");
            this.mapEl.classList.add("panel-open");
            this.wrapper.classList.add("panel-open");
            document.body.classList.add("panel-open");
        }

        this.welcome.style.display = "none";

        updateUploadButtons();
        updateLocateUserButton();

        if (!isTouchDevice) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, PANEL_TRANSITION_MS);
        }
    }

    /**
     * Handles Android/browser back navigation for temporary UI states.
     * Back closes the topmost layer first: language dropdown, ultra mode, full
     * panel, then minimized strip.
     */
    handlePopstate() {
        if (this.handlingPopstate) {
            this.handlingPopstate = false;
            return;
        }
        this.handlingPopstate = true;
        if (!elements.langOptions.classList.contains("hidden-language")) {
            elements.langOptions.classList.add("hidden-language");
            elements.showLang.classList.remove("dropdown-open");
        } else if (this.isUltra) {
            this.unmaximize();
        } else if (this.isOpen) {
            this.minimize();
            recenterForPanelState();
        } else if (this.isStrip) {
            this.closeStrip();
        }
        this.handlingPopstate = false;
    }

    /**
     * Clears the wiki section and collapses the learn-more area when needed.
     * The geo info reset happens separately in closeGeoInfo(), but the button and
     * scroll state are shared by both sections.
     */
    closeWiki() {
        this.moreContentIsOpen = false;

        if (this.learnMore.style.display === "inline-block" ||
            this.learnMore.style.display === "block" ||
            this.learnMore.style.display === "flex") {
            if (!this.moreContent.classList.contains("collapsed")) {
                this.moreContent.classList.add("collapsed");
                this.learnMore.classList.remove("expanded");
            }
            this.wiki.innerHTML = "";

            this.learnMore.style.display = "none";
            this.content.classList.remove("scrollable");
        }

    }
}