/*
 * Shared UI helpers.
 *
 * This file handles the interface around the result: loading states, errors,
 * dropdowns, theme and map view toggles, resize updates, and language selection.
 * The result panel and location logic are handled in their own files.
 */

let resizeTimeout;

/*
 * Leaflet marker icons for the photo result.
 *
 * The marker switches with the map theme so it stays visible on both light and
 * dark base layers. Satellite mode uses the light icon because it has
 * the best contrast over imagery.
 */
const cameraIconLight = new L.Icon({
    iconUrl: 'https://antonin-gg.github.io/geolocator/docs/cameraIconLight.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [31, 41],
    iconAnchor: [15, 41],
    popupAnchor: [1, -41],
    shadowSize: [41, 41]
});

const cameraIconDark = new L.Icon({
    iconUrl: 'https://antonin-gg.github.io/geolocator/docs/cameraIconDark.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [31, 41],
    iconAnchor: [15, 41],
    popupAnchor: [1, -41],
    shadowSize: [41, 41]
});

/**
 * Shows the centered welcome-screen loading state.
 * This is used when no panel or strip is currently visible, so the search
 * feedback appears in the main upload area instead of inside the panel.
 */
function startWelcomeLoading() {
    isSearching = true;

    elements.welcome.style.display = "none";

    elements.searching.style.display = "flex";

    elements.searchingText
        .classList.add("searching-active");

    elements.searchingGlobe
        .classList.add("globe-active");
}

/**
 * Clears all loading indicators.
 * Search feedback can appear either in the welcome area or inside the panel, so
 * this function resets both places to avoid stale shimmer or globe animations.
 */
function endLoading() {
    isSearching = false;

    elements.searching
        .style.display = "none";

    elements.searchingText
        .classList.remove("searching-active");

    elements.searchingGlobe
        .classList.remove("globe-active");

    elements.placeName
        .classList.remove("loading");

    elements.panelGlobe
        .classList.remove("globe-active");
}

/**
 * Displays a temporary app-level error.
 * Any open result UI is closed first so the message has a clear place to appear
 * and cannot be confused with stale result content.
 */
function showError(message) {
    endLoading();
    if (panel.isOpen || panel.isUltra) panel.close();
    else if (panel.isStrip) panel.closeStrip();

    elements.welcome.style.display = "none";
    elements.noData.style.display = "block";
    elements.noData.textContent = message;
    setTimeout(() => {
        elements.noData.style.display = "none";
        elements.noData.textContent = null;
        elements.welcome.style.display = "block";
    }, ERROR_DISPLAY_MS);
}

/**
 * Gives the desktop toggle labels equal width.
 * The dropdown chevrons then line up visually even when translated labels have
 * different lengths.
 */
function alignToggleChevrons() {

    if (isMobileMode()) return;

    const toggles = [
        document.querySelector("#showToggleView .toggle-text"),
        document.querySelector("#showToggleTheme .toggle-text"),
        document.querySelector("#showToggleLanguage .toggle-text")
    ];

    toggles.forEach(function (t) { t.style.minWidth = ""; });

    let maxWidth = 0;
    toggles.forEach(function (t) {
        if (t.offsetWidth > maxWidth) maxWidth = t.offsetWidth;
    });

    toggles.forEach(function (t) {
        t.style.minWidth = maxWidth + "px";
    });
}

/**
 * Refreshes toggle labels and mobile icons from the current app state.
 * This is called after theme, map view, language, and layout changes so controls
 * always describe the action they will perform next.
 */
function updateToggles() {
    document.querySelector("#toggleView .desktop-toggle-label").textContent =
        isSatellite ? translate("map") : translate("satellite");

    document.querySelector("#toggleTheme .desktop-toggle-label").textContent =
        isDark ? translate("light") : translate("dark");

    document.querySelector("#showToggleLanguage .desktop-toggle-label").textContent =
        translate("language");

    document.querySelector("#toggleView .mobile-toggle-label").innerHTML =
        isSatellite ? ICONS.map : ICONS.satellite;

    document.querySelector("#toggleTheme .mobile-toggle-label").innerHTML =
        isDark ? ICONS.sun : ICONS.moon;

    document.querySelector("#showToggleLanguage .mobile-toggle-label").innerHTML =
        ICONS.language;
}

/**
 * Chooses which upload control should be visible.
 * On compact layouts, the main upload button is hidden while a result is open so
 * the smaller panel control can stay reachable without covering content.
 */
function updateUploadButtons() {
    const isMobile = isMobileMode();

    const showMobileUpload = isMobile && panel.isVisible;

    elements.uploadLabel.classList.toggle("mobile-hidden", showMobileUpload);
    elements.uploadLabelPanel.classList.toggle("visible", showMobileUpload);
}

/**
 * Returns a polygon color with enough contrast for the active map layer.
 * Satellite imagery needs a brighter color than the map themes.
 */
function getPolygonColor() {
    if (isSatellite) return "#ffdd00";
    if (isDark) return "#7ab8ff";
    return "#4a90d9";
}

/**
 * Opens or closes one dropdown and closes the others.
 * The language dropdown participates in mobile history so the Android back
 * button can close it like a temporary overlay.
 */
function openDropdown(which) {
    const config = DROPDOWNS[which];
    if (!config) return;

    closeOtherDropdowns(which);

    config.content.classList.toggle(config.hiddenClass);

    const isOpen = isDropdownOpen(which);

    if (which === "language") {
        if (isOpen) {
            config.content.scrollTop = 0;

            if (isTouchDevice) {
                history.pushState({}, "");
            }
        } else if (isTouchDevice && !panel.handlingPopstate) {
            panel.setHandlingPopstate();
            history.back();
        }
    }

    config.trigger.classList.toggle("dropdown-open", isOpen);
}

/**
 * Closes a dropdown if it is open.
 * For mobile language overlays, closing also unwinds the history entry that was
 * added when the dropdown opened.
 */
function closeDropdown(which) {
    const config = DROPDOWNS[which];
    if (!config) return;

    if (config.content.classList.contains(config.hiddenClass)) return;

    config.content.classList.add(config.hiddenClass);
    config.trigger.classList.remove("dropdown-open");

    if (config.usesHistory && isTouchDevice && !panel.handlingPopstate) {
        panel.setHandlingPopstate();
        history.back();
    }
}

function closeOtherDropdowns(exceptWhich) {
    Object.keys(DROPDOWNS).forEach(function (key) {
        if (key === exceptWhich) return;
        closeDropdown(key);
    });
}

function closeAllDropdowns() {
    Object.keys(DROPDOWNS).forEach(closeDropdown);
}

function isDropdownOpen(which) {
    const config = DROPDOWNS[which];
    return config && !config.content.classList.contains(config.hiddenClass);
}

/**
 * Applies the visual theme without changing the map base layer.
 */
function applyTheme() {
    document.body.classList.toggle("dark", isDark);
    if (currentResult.marker && !isSatellite) currentResult.marker.setIcon(isDark ? cameraIconDark : cameraIconLight);
    if (currentResult.polygon) currentResult.polygon.setStyle({ color: getPolygonColor() });
}

/**
 * Switches between light and dark themes.
 * Satellite mode keeps its imagery layer, but the rest of the UI still updates
 * so controls, markers, and polygons stay readable.
 */
function toggleTheme() {
    isDark = !isDark;

    if (!isSatellite) {
        if (isDark) {
            map.removeLayer(mapLayerLight);
            mapLayerDark.addTo(map);
        } else {
            map.removeLayer(mapLayerDark);
            mapLayerLight.addTo(map);
        }
    }

    applyTheme();
    updateToggles();

    localStorage.setItem("isDark", isDark);
}

/**
 * Switches between the map layer and satellite imagery.
 * Marker and polygon colors are updated at the same time because their contrast
 * requirements change with the base layer.
 */
function toggleMapView() {
    isSatellite = !isSatellite;

    if (isSatellite) {
        if (isDark) {
            map.removeLayer(mapLayerDark);
            if (currentResult.marker) currentResult.marker.setIcon(cameraIconLight);
        } else {
            map.removeLayer(mapLayerLight);
        }

        satelliteLayer.addTo(map);
    } else {
        map.removeLayer(satelliteLayer);

        if (isDark) {
            mapLayerDark.addTo(map);
            if (currentResult.marker) currentResult.marker.setIcon(cameraIconDark);
        } else {
            mapLayerLight.addTo(map);
        }
    }

    updateToggles();

    if (currentResult.polygon) {
        currentResult.polygon.setStyle({ color: getPolygonColor() });
    }

    localStorage.setItem("isSatellite", isSatellite);
}

/*
 * Resize can trigger several expensive layout operations. Debouncing keeps the
 * panel, map, and geo info from recalculating on every single resize event while
 * still reacting quickly after the viewport settles.
 */
window.addEventListener("resize", function () {

    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(function () {

        updateMobileMode();

        if (panel.isOpen) {

            panel.open();

            setTimeout(function () {
                panel.lockPhotoSize(true);
                panel.balanceGeoInfoLayout();

                if (panel.moreContentIsOpen) {
                    elements.content.classList.add("scrollable");
                }
            }, 80);

        }

        updateUploadButtons();
        updateLocateUserButton();
        alignToggleChevrons();
        map.invalidateSize();

    }, 150);

    updateToggles();
});

/*
 * Control event wiring.
 *
 * Each handler keeps the same rhythm: open the menu, apply the action, then
 * close the menu when the selection is complete.
 */
elements.showTheme.addEventListener("click", function () {
    openDropdown("theme");
});

elements.toggleTheme.addEventListener("click", function () {

    closeOtherDropdowns("theme");

    toggleTheme();

    closeDropdown("theme");

});

elements.showView.addEventListener("click", function () {
    openDropdown("view");
});

elements.toggleView.addEventListener("click", function () {

    closeOtherDropdowns("view");

    toggleMapView();

    closeDropdown("view");

});

elements.showLang.addEventListener("click", function () {
    openDropdown("language");
});

document.querySelectorAll(".lang-option").forEach(function (button) {

    button.addEventListener("click", function () {
        document.querySelector('[data-lang="' + uiLang + '"]').classList.remove("active-lang");

        uiLang = this.getAttribute("data-lang");

        changeLanguage();

        closeDropdown("language");

        document.querySelector('[data-lang="' + uiLang + '"]').classList.add("active-lang");

        localStorage.setItem("uiLang", uiLang);

        if (panel.isVisible && currentResult.imageFile) {
            rerunSearch();
        }
    });

});

/*
 * Clicking outside the control stack closes open dropdowns. The wrapper stops
 * propagation so clicks inside a dropdown can still select options normally.
 */
document.addEventListener("click", function (e) {
    const clickedInsideToggles = e.target.closest("#wrapperToggles");

    if (!clickedInsideToggles) {
        closeAllDropdowns();
    }
});

elements.wrapperToggles.addEventListener("click", function (e) {
    e.stopPropagation();
});