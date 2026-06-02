/*
 * User location and distance preview.
 *
 * This file handles the optional "show distance from you" flow. It adds the locate
 * button when a mappable result exists, it asks for the user's browser location
 * and runs the short map preview that flies from the user position to the photo
 * result and back.
 *
 * The preview uses a token so older timeouts and map move events cannot keep
 * writing after a newer preview or search has started.
 */

// Cached user-location state and temporary layers used by the distance preview.
let userCoordinates = null;
let userCoordinatesRequest = null;
let locateHintShown = false;
let hasAcceptedLocationOnce = false;
let userMarker = null;
let userDistanceLine = null;
let userDistanceLabel = null;
let locationPreviewTimeout1 = null;
let locationPreviewTimeout2 = null;
let locationPreviewInProgress = false;

/*
 * Incremented whenever a preview starts or is stopped.
 * Delayed callbacks compare their captured token to this value before touching
 * the map, which prevents old preview steps from running after cancellation.
 */
let _previewToken = 0;

let locateButtonTimeout = null;
let hintHideTimeout = null;

/*
 * Leaflet marker for the user's current position.
 * The visual dot is styled in CSS so it can stay consistent with the distance
 * line and label.
 */
const userLocationIcon = L.divIcon({
    className: "user-location-marker",
    html: '<div class="user-location-dot"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
});

/**
 * Gets the user's current coordinates.
 * A successful result is cached, and an in-flight request is reused so repeated
 * clicks do not open multiple browser geolocation prompts.
 *
 * @returns {Promise<number[]|null>} [latitude, longitude], or null if unavailable.
 */
function getUserCoordinates() {
    // Reuse the last accepted location so later previews start instantly.
    if (userCoordinates) {
        return Promise.resolve(userCoordinates);
    }

    // Reuse the same permission request if the user clicks twice while it is pending.
    if (userCoordinatesRequest) {
        return userCoordinatesRequest;
    }

    userCoordinatesRequest = new Promise(function (resolve) {
        if (!("geolocation" in navigator)) {
            userCoordinatesRequest = null;
            resolve(null);
            return;
        }

        /*
         * A recent cached browser position is good enough for this distance preview.
         * High accuracy is not needed and can make the permission flow slower.
         */
        navigator.geolocation.getCurrentPosition(
            function (position) {
                userCoordinates = [
                    position.coords.latitude,
                    position.coords.longitude
                ];


                userCoordinatesRequest = null;
                resolve(userCoordinates);
            },
            function (err) {
                console.warn("Geolocation failed:", err);
                userCoordinatesRequest = null;
                resolve(null);
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 600000
            }
        );
    });

    return userCoordinatesRequest;
}

/**
 * Shows or hides the locate-user buttons.
 * The button only appears when the browser supports geolocation, a result is
 * visible, no search is running, and the current result has map coordinates.
 */
function updateLocateUserButton() {
    const desktopButton = elements.locateBtn;
    const mobileButton = elements.locateBtnMobile;
    if (!desktopButton || !mobileButton) return;

    const hasMappableResult = currentResult.hasLocation();

    const shouldShow = (panel.isVisible) && !isSearching && hasMappableResult;

    clearTimeout(locateButtonTimeout);

    if (!("geolocation" in navigator) || !shouldShow) {
        desktopButton.classList.remove("visible");
        mobileButton.classList.remove("visible");
        return;
    }

    /*
     * Delay the reveal slightly so it does not compete with the panel opening
     * animation or the result loading transition.
     */
    locateButtonTimeout = setTimeout(function () {
        desktopButton.classList.add("visible");
        mobileButton.classList.add("visible");

        // Show the hint only once so it teaches the feature without becoming noisy.
        if (!locateHintShown) {
            showLocateUserHint();
            locateHintShown = true;
        }
    }, LOCATE_BTN_DELAY_MS);
}

/**
 * Runs the animated distance preview between the user and the photo result.
 * The map first centers on the user, then frames both points, shows the distance
 * line, and finally returns to the result.
 */
function showUserLocationPreview() {
    if (locationPreviewInProgress) return;
    if (!userCoordinates || !currentResult.hasLocation()) return;

    // Capture a token so delayed steps can stop if this preview is cancelled.
    const token = ++_previewToken;

    locationPreviewInProgress = true;

    // Clear any leftover timers before starting a fresh preview sequence.
    if (locationPreviewTimeout1) {
        clearTimeout(locationPreviewTimeout1);
    }
    if (locationPreviewTimeout2) {
        clearTimeout(locationPreviewTimeout2);
    }

    const userLat = userCoordinates[0];
    const userLng = userCoordinates[1];

    // Reuse the marker object when possible, but always move it to the latest coordinates.
    if (!userMarker) {
        userMarker = L.marker([userLat, userLng], {
            icon: userLocationIcon,
            interactive: false,
            zIndexOffset: 1000
        }).addTo(map);
    } else {
        userMarker.setLatLng([userLat, userLng]);
        userMarker.addTo(map);
    }

    // These bounds frame the relationship between the user and the result.
    const bounds = L.latLngBounds([
        [currentResult.lat, currentResult.lng],
        [userLat, userLng]
    ]);

    /*
     * Lock interaction during the scripted preview so user gestures do not fight the
     * chained map animations.
     */
    map.setView(offsetCenterForPanel(L.latLng(userLat, userLng), DEFAULT_ZOOM), DEFAULT_ZOOM);
    lockMapInteraction();

    // Hide smaller polygons during the preview because they can lag during fly animations.
    // Country outlines are kept because they give useful context at this scale.
    if (currentResult.polygon && currentResult.confidence !== "country") map.removeLayer(currentResult.polygon);

    /*
     * Give the user a moment to see their own position before flying out to the
     * two-point distance view.
     */
    locationPreviewTimeout1 = setTimeout(function () {
        map.flyToBounds(bounds, visiblePadding());
        /*
         * Distance graphics are added only after the bounds animation finishes, otherwise
         * the line can appear while the map is still moving.
         */
        map.once("moveend", function () {
            if (_previewToken !== token) return;
            showUserDistanceLine(userLat, userLng);
            locationPreviewTimeout2 = setTimeout(function () {
                if (_previewToken !== token) return;
                // Fade the distance graphics before removing them so the return flight feels less abrupt.
                if (userDistanceLine) {
                    const lineEl = userDistanceLine.getElement();
                    if (lineEl) lineEl.classList.add("fading-out");
                }
                if (userDistanceLabel) {
                    const labelEl = userDistanceLabel.getElement();
                    if (labelEl) labelEl.classList.add("fading-out");
                }
                setTimeout(function () {
                    if (_previewToken !== token) return;
                    if (userDistanceLine) {
                        map.removeLayer(userDistanceLine);
                        userDistanceLine = null;
                    }
                    if (userDistanceLabel) {
                        map.removeLayer(userDistanceLabel);
                        userDistanceLabel = null;
                    }
                    // Return to the result framing, using polygon bounds when an outline is available.
                    if (currentResult.polygon) {
                        map.flyToBounds(currentResult.polygon.getBounds(), visiblePadding());
                    } else {
                        map.flyTo(offsetCenterForPanel(L.latLng(currentResult.lat, currentResult.lng), DEFAULT_ZOOM), DEFAULT_ZOOM)
                    }
                }, PREVIEW_FADE_MS);
                /*
                 * Cleanup waits for the return animation to finish so the user marker does not
                 * disappear while it is still visible on screen.
                 */
                map.once("moveend", function () {
                    if (_previewToken !== token) return;
                    if (userMarker) {
                        map.removeLayer(userMarker);
                    }
                    if (currentResult.polygon) currentResult.polygon.addTo(map);
                    locationPreviewInProgress = false;
                    unlockMapInteraction();
                });
            }, PREVIEW_LINE_HOLD_MS);
        });

    }, PREVIEW_START_DELAY_MS);
    /*
     * Safety unlock in case a moveend event is missed or the animation is interrupted.
     * Without this, the map could remain locked after a failed preview sequence.
     */
    setTimeout(function () {
        if (locationPreviewInProgress) {
            locationPreviewInProgress = false;
            if (userMarker) map.removeLayer(userMarker);
            if (currentResult.polygon) currentResult.polygon.addTo(map);
            unlockMapInteraction();
        }
    }, PREVIEW_SAFETY_MS);
}

/**
 * Cancels any active location preview and removes its temporary map layers.
 * This is called when the result closes, a new search starts, or another map
 * flow needs to take over.
 */
function stopUserLocationPreview() {
    ++_previewToken;
    locationPreviewInProgress = false;

    clearTimeout(locationPreviewTimeout1);
    clearTimeout(locationPreviewTimeout2);
    locationPreviewTimeout1 = null;
    locationPreviewTimeout2 = null;

    // Stop any in-flight Leaflet animation from the preview before clearing layers.
    map.stop();

    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }

    if (userDistanceLine) {
        map.removeLayer(userDistanceLine);
        userDistanceLine = null;
    }

    if (userDistanceLabel) {
        map.removeLayer(userDistanceLabel);
        userDistanceLabel = null;
    }

    unlockMapInteraction();
}

/**
 * Draws the dashed line and label between the result and the user.
 * The distance value comes from geoInfoCache so it matches the distance card and
 * the current unit preference.
 */
function showUserDistanceLine(userLat, userLng) {
    if (userDistanceLine) map.removeLayer(userDistanceLine);
    if (userDistanceLabel) map.removeLayer(userDistanceLabel);

    userDistanceLine = L.polyline(
        [[currentResult.lat, currentResult.lng], [userLat, userLng]],
        {
            className: "user-distance-line",
            weight: 3,
            interactive: false
        }
    ).addTo(map);

    // Place the label halfway along the line so it reads as a relationship, not a marker.
    const midLat = (currentResult.lat + userLat) / 2;
    const midLng = (currentResult.lng + userLng) / 2;

    const distance = formatDistance(geoInfoCache.distanceKm);

    userDistanceLabel = L.marker([midLat, midLng], {
        interactive: false,
        icon: L.divIcon({
            className: "distance-line-label",
            html: '<div>' + distance + '</div>',
            iconSize: null
        })
    }).addTo(map);
}

/**
 * Temporarily disables map interaction during distance preview animations.
 * This keeps user gestures from interrupting the sequence halfway through.
 */
function lockMapInteraction() {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if (map.tap) map.tap.disable();
}

/**
 * Restores normal map interaction after a preview finishes or is cancelled.
 */
function unlockMapInteraction() {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();
}

/**
 * Shows the locate-user hint for a few seconds.
 * The hint is separate from the button visibility so it can be shown once when
 * the feature first becomes available.
 */
function showLocateUserHint() {
    const hint = elements.locateHint;
    if (!hint) return;

    clearTimeout(hintHideTimeout);
    hint.classList.add("visible");

    hintHideTimeout = setTimeout(function () {
        hint.classList.remove("visible");
    }, HINT_DURATION_MS);
}

/*
 * First click asks for permission and builds the distance card. Later clicks can
 * jump straight into the preview because the accepted coordinates are cached.
 */
elements.locateBtn.addEventListener("click", async function () {

    /*
     * Clear any previous failed or stale request before asking the browser again.
     * This makes the first accepted permission attempt the one that gets cached.
     */
    if (!hasAcceptedLocationOnce) {
        userCoordinates = null;
        userCoordinatesRequest = null;

        const coords = await getUserCoordinates();

        if (!coords) {
            updateLocateUserButton();
            return;
        }

        hasAcceptedLocationOnce = true;

        updateLocateUserButton();

        if (!panel.isVisible) return;

        if (!currentResult.hasLocation()) return;

        // Once permission is accepted, add the distance card to the current result.
        await buildDistanceItem(currentResult.lat, currentResult.lng);
        panel.balanceGeoInfoLayout();
    }

    showUserLocationPreview();
});

// Mobile and desktop buttons share the same behavior, so the mobile button delegates to the main one.
elements.locateBtnMobile.addEventListener("click", function () {
    elements.locateBtn.click();
});