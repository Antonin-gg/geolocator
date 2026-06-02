/*
 * Photo locating flow.
 *
 * This file coordinates the full upload flow. It validates the selected image,
 * shows the loading UI, tries EXIF GPS first, and falls back to AI recognition
 * when the photo has no usable coordinates.
 *
 * Each search gets a currentSearchId. If another photo is uploaded while older
 * EXIF, AI, geocoding, wiki, or geo info requests are still running, those older
 * steps stop before they can update the current result.
 */

/**
 * Starts a new photo search from the file input.
 * The file is validated first, then the result state is reset and a fresh search
 * ID is captured. Every async branch receives that ID so stale searches cannot
 * overwrite the current result.
 *
 * @param {HTMLInputElement} input File input that triggered the upload.
 */
async function locateImage(input) {

    const image = input.files[0];

    /*
     * Keep this stricter than image/* so SVG, GIF, TIFF, and other awkward formats
     * do not reach preview, EXIF parsing, or the AI request.
     */
    const allowedImageTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
        "image/avif"
    ];

    if (!image) return;

    if (!allowedImageTypes.includes(image.type)) {
        showError(error("file"));
        input.value = "";
        return;
    }

    // A new result should be allowed to show the small scroll hint again.
    panel.scrollHintShown = false;

    /*
     * From this point on, every awaited step must check searchId before writing to
     * currentResult, the panel, the map, or other UI.
     */
    const searchId = startNewSearch();

    currentResult.reset();

    currentResult.imageFile = image;
    // The object URL is stored on currentResult so reset() can revoke it later.
    currentResult.photoObjectUrl = URL.createObjectURL(image);
    const photoImgHtml = '<img src="' + currentResult.photoObjectUrl + '" style="border-radius:4px;margin-top:6px;">';
    currentResult.photoHtml = photoImgHtml;

    /*
     * If a result UI is already visible, load inside the panel. Otherwise use the
     * welcome-screen loading state.
     */
    if (panel.isVisible) {
        isSearching = true;
        panel.startLoading(photoImgHtml);
    } else startWelcomeLoading();

    /*
     * EXIF GPS is the best path when available because it gives exact coordinates
     * without relying on visual guessing.
     */
    let photoLatLng = null;
    try {
        photoLatLng = await exifr.gps(image);
    } catch (e) {
        console.warn("EXIF GPS read failed:", e);
    }

    // The user may have uploaded another photo while EXIF parsing was running.
    if (!isCurrentSearch(searchId)) return;

    if (photoLatLng && photoLatLng.latitude && photoLatLng.longitude) {

        await placeMarkerFromEXIF(photoLatLng, photoImgHtml, searchId);

    }

    else {

        await placeMarkerFromAI(image, photoImgHtml, searchId);

    }
    input.value = "";
}

/**
 * Builds a result from EXIF GPS coordinates.
 * The coordinates come directly from the image, then reverse geocoding gives a
 * readable place name for the panel and geo info.
 *
 * @param {Object} photoCoordinates EXIF coordinates from exifr.gps().
 * @param {string} photoHtml HTML preview for the uploaded photo.
 * @param {number} searchId Search token captured when this upload started.
 */
async function placeMarkerFromEXIF(photoCoordinates, photoHtml, searchId) {

    // Reverse geocoding turns exact EXIF coordinates into a readable place name.
    const url = "https://nominatim.openstreetmap.org/reverse?lat=" +
        photoCoordinates.latitude + "&lon=" + photoCoordinates.longitude +
        "&format=json&zoom=18&addressdetails=1&accept-language=" + uiLang;

    const response = await fetch(url);
    // Another upload may have started while the network request was in flight.
    if (!isCurrentSearch(searchId)) return;

    if (!response.ok) {
        showError(error("network"));
        return;
    }

    const result = await response.json();
    // Another upload may have started while the response body was being parsed.
    if (!isCurrentSearch(searchId)) return;

    // From here on, this search is still current, so it can safely replace the result.
    currentResult.clearLayers();
    panel.moreContentIsOpen = false;

    const exifPlace = buildExifPlaceName(result);

    const placeName = exifPlace.placeName;
    const shortName = exifPlace.shortName;
    const countryCode = exifPlace.countryCode;
    const sentence = exifPlace.sentence;

    currentResult.setFromExif(placeName, shortName, translate("methodGPS"), sentence, photoCoordinates, photoHtml);
    currentResult.confidence = "city";

    /*
     * Build optional wiki and geo cards before opening the panel so the panel can
     * measure its final content correctly.
     */
    await buildMoreInfo(null, shortName, photoCoordinates.latitude, photoCoordinates.longitude, "city", countryCode, searchId);
    // Wiki, weather, and altitude requests may have taken long enough for a newer search to start.
    if (!isCurrentSearch(searchId)) return;

    elements.welcome.style.display = "none";
    endLoading();

    panel.open();

    currentResult.marker = L.marker([photoCoordinates.latitude, photoCoordinates.longitude], { icon: isDark && !isSatellite ? cameraIconDark : cameraIconLight }).addTo(map);

    flyToPoint(currentResult.lat, currentResult.lng, DEFAULT_ZOOM);
}

/**
 * Builds display text for an EXIF-based result.
 * Reverse geocoding can return different address levels depending on the place,
 * so this picks the most readable city-like label and adds street detail when
 * available.
 *
 * @param {Object} result Nominatim reverse-geocoding result.
 * @returns {Object} Display names, country code, and localized sentence.
 */
function buildExifPlaceName(result) {
    let placeName = translate("unknownLocationShort");
    let shortName = translate("unknownLocationShort");
    if (result && result.address) {
        const address = result.address;
        // Prefer city-like fields, but fall back to Nominatim's display name when needed.
        const city = address.city || address.town || address.village || address.municipality || address.county || "";
        const country = address.country || "";
        shortName = city && country ? city + ", " + country : (result.display_name || "Unknown location");

        // Street detail is useful for GPS results because the coordinate can be precise.
        const streetName =
            address.road ||
            address.pedestrian ||
            address.footway ||
            address.path ||
            address.residential;

        const street = [address.house_number, streetName]
            .filter(Boolean)
            .join(" ");

        const prefix = street ? street + ", " : "";
        placeName = prefix + shortName;
    } else if (result && result.display_name) {
        placeName = result.display_name;
        shortName = result.display_name;
    }

    const countryCode = (result && result.address && result.address.country_code)
        ? result.address.country_code.toUpperCase()
        : null;

    const sentence = translate("photoTakenIn").replace("{place}", placeName);

    return {
        "placeName": placeName,
        "shortName": shortName,
        "countryCode": countryCode,
        "sentence": sentence
    };
}

/**
 * Builds a result from AI visual recognition.
 * The AI identifies a place and confidence level, geocoding turns that into map
 * data, and the panel is opened only after the result has survived all checks.
 *
 * @param {File} image Uploaded image file.
 * @param {string} photoHtml HTML preview for the uploaded photo.
 * @param {number} searchId Search token captured when this upload started.
 */
async function placeMarkerFromAI(image, photoHtml, searchId) {

    // Reset cascade flags so each AI search starts clean.
    didGeocodingFallBack = 0;

    panel.moreContentIsOpen = false;

    elements.welcome.style.display = "none";

    try {

        const aiResult = await aiLocator(image, searchId);

        // The AI call is the slowest step, so always check searchId immediately after it.
        if (!isCurrentSearch(searchId)) return;

        if (!aiResult) return;

        /*
         * Store the AI text early so unknown or geocoding-failure states can still show
         * a meaningful method and sentence.
         */
        const aiPlace = aiResult.place || "";

        const aiConfidence = aiResult.confidence || "";
        currentResult.confidence = aiConfidence;
        currentResult.method = aiResult.method;
        currentResult.photoHtml = photoHtml;
        currentResult.sentence = aiResult.displaySentence;

        // Unknown results stop here because there is no safe place to geocode or map.
        if (aiPlace.toLowerCase().trim() === "unknown" ||
            aiPlace === "" ||
            aiConfidence.toLowerCase().trim() === "unknown" ||
            aiConfidence === "") {

            if (!isCurrentSearch(searchId)) return;
            showUnknownResult();
            return;
        }

        /*
         * Some AI answers include "city" as a descriptor. Removing it avoids confusing
         * geocoders while keeping the actual place name.
         */
        const queryLocation = aiPlace.replace(/\bcity\b,?\s*/i, "");

        // Geocoding is the step that turns the AI place string into usable map data.
        const location = await getLocationData(queryLocation, aiConfidence, aiResult.countryCode);
        if (!isCurrentSearch(searchId)) return;

        if (!location) {
            showUnknownResult(true);
            return;
        }

        currentResult.clearLayers();
        currentResult.setFromAI(aiResult, location, photoHtml);

        /*
         * Build optional info before opening the panel so photo sizing and learn-more
         * visibility are based on the final content.
         */
        await buildMoreInfo(aiResult.place, location.shortName, location.lat, location.lng, aiConfidence, aiResult.countryCode, searchId);

        if (!isCurrentSearch(searchId)) return;

        if (location.showPolygon && location.polygon) {
            currentResult.polygon = L.geoJSON(location.polygon, {
                style: { color: getPolygonColor(), weight: 2, fillOpacity: 0.15 }
            });
            /*
             * Country polygons are useful context during the fly. Smaller polygons can lag
             * during fly animations, so they are added only after the map settles.
             */
            if (aiConfidence === "country") currentResult.polygon.addTo(map);
        }

        panel.open();

        currentResult.marker = L.marker([location.lat, location.lng], { icon: isDark && !isSatellite ? cameraIconDark : cameraIconLight }).addTo(map);

        flyToLocation(location, aiConfidence);

        /*
         * Reveal non-country polygons only after the fly animation finishes. The guard
         * prevents closed, replaced, or preview-interrupted results from adding stale
         * polygons back onto the map.
         */
        if (currentResult.polygon && aiConfidence !== "country") {
            const polygonToShow = currentResult.polygon;
            map.once("moveend", function () {
                if (!isCurrentSearch(searchId)) return;
                if (currentResult.polygon === polygonToShow && !locationPreviewInProgress) {
                    polygonToShow.addTo(map);
                }
            });
        }
        /*
         * Any unexpected failure in the AI branch becomes an unknown result instead of
         * leaving the app stuck in loading state.
         */
    } catch (e) {
        if (!isCurrentSearch(searchId)) return;

        console.warn("placeMarkerFromAI failed:", e);

        currentResult.confidence = "unknown";
        currentResult.method = error("network");
        currentResult.photoHtml = photoHtml;

        showUnknownResult(true);
        /*
         * Do not clear loading for a newer search. The newer search owns the current UI.
         */
    } finally {
        if (!isCurrentSearch(searchId)) return;

        elements.welcome.style.display = "none";
        endLoading();
    }
}

/**
 * Sends the image to the AI worker and parses the structured JSON result.
 * The worker hides the API key, while Structured Outputs keeps the response
 * shape predictable for the rest of the flow.
 *
 * @param {File} image Uploaded image file.
 * @param {number} searchId Search token captured when this upload started.
 * @returns {Promise<Object|null>} AI result object, or null on network failure.
 */
async function aiLocator(image, searchId) {
    // Language instructions are appended per request because the UI language can change.
    const promptWithLang = AI_PROMPT + "\n\n" + languageInstructions[uiLang];

    // The Responses request uses a data URL so the worker can forward the image directly.
    const imageBase64 = await new Promise(function (resolve) {
        const reader = new FileReader();
        reader.onload = function (e) { resolve(e.target.result); };
        reader.readAsDataURL(image);
    });
    if (!isCurrentSearch(searchId)) return null;

    let aiResponse;

    try {
        /*
         * The worker forwards a structured-output request. The schema mirrors the fields
         * expected by placeMarkerFromAI().
         */
        aiResponse = await fetch(AI_WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: AI_MODEL,
                max_completion_tokens: 800,
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "geolocation",
                        strict: true,
                        schema: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                                place: { type: "string" },
                                countryCode: { type: "string" },
                                confidence: { type: "string", enum: ["landmark", "city", "region", "country", "unknown", "space"] },
                                method: { type: "string" },
                                displaySentence: { type: "string" }
                            },
                            required: ["place", "countryCode", "confidence", "method", "displaySentence"]
                        }
                    }
                },
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: promptWithLang },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageBase64,
                                detail: "high"
                            }
                        }
                    ]
                }]
            })
        });
        if (!isCurrentSearch(searchId)) return null;
    } catch (e) {
        if (!isCurrentSearch(searchId)) return null;
        console.error(e);
        showError(error("network"));
        return null;
    }

    if (!aiResponse.ok) {
        showError(error("network"));
        return null;
    }

    let data;

    /*
     * Structured Outputs should return valid JSON, but refusals, truncation, worker
     * bugs, or provider changes can still break parsing.
     */
    try {
        data = await aiResponse.json();
        if (!isCurrentSearch(searchId)) return null;

        const raw = data.choices[0].message.content;
        return JSON.parse(raw);
    } catch (e) {
        console.warn("aiLocator failed to parse AI response:", e, data);

        return {
            place: "unknown",
            countryCode: "",
            confidence: "unknown",
            method: error("network"),
            displaySentence: ""
        };
    }

}

/**
 * Opens the panel with an unknown-location result.
 * This is used both when the AI cannot identify the image and when geocoding
 * fails to map an otherwise identified place.
 *
 * @param {boolean} isGeocodingFailure Whether the AI found a place but geocoding failed.
 */
function showUnknownResult(isGeocodingFailure) {

    endLoading();

    currentResult.clearLayers();

    currentResult.lat = null;
    currentResult.lng = null;

    // Space results keep their AI sentence because they explain why the map cannot show them.
    if (currentResult.confidence !== "space") {
        currentResult.sentence = "<strong>" + translate("unknownLocation") + "</strong>";
    }
    currentResult.placeName = translate("unknownLocationShort");
    currentResult.shortName = translate("unknownLocationShort");
    currentResult.isAI = true;

    // For geocoding failures, avoid showing visual evidence for a place we failed to map.
    if (isGeocodingFailure) currentResult.method = "";

    panel.open();
}

/**
 * Moves the map to a geocoded location.
 * Bounds are preferred when available because they show the full area. Point
 * results use a confidence-based zoom level instead.
 */
function flyToLocation(location, confidence) {
    if (location.bounds) {
        map.flyToBounds(
            [
                [location.bounds[0], location.bounds[2]],
                [location.bounds[1], location.bounds[3]]
            ],
            visiblePadding()
        );
        return;
    }

    const z = getZoomLevel(confidence);
    flyToPoint(location.lat, location.lng, z);
}

/**
 * Flies to a point while accounting for the visible map area on touch layouts.
 */
function flyToPoint(lat, lng, zoom) {
    map.flyTo(
        offsetCenterForPanel(L.latLng(lat, lng), zoom),
        zoom
    );
}

/**
 * Rebuilds the current result after a language change.
 * The same image is reused, but EXIF, reverse geocoding, AI text, wiki, and geo
 * info may all need to be regenerated for the new UI language.
 */
async function rerunSearch() {
    if (!currentResult.imageFile) return;
    endLoading();
    panel.startLoading(currentResult.photoHtml);
    isSearching = true;
    panel.scrollHintShown = false;

    /*
     * A language rerun is still a new async search. It needs its own search ID so
     * older work cannot write back after the rerun starts.
     */
    const searchId = startNewSearch();

    let photoLatLng = null;

    try {
        photoLatLng = await exifr.gps(currentResult.imageFile);
    } catch (e) {
        console.warn("EXIF GPS read failed:", e);
    }
    if (!isCurrentSearch(searchId)) return;

    if (photoLatLng && photoLatLng.latitude && photoLatLng.longitude) {
        await placeMarkerFromEXIF(photoLatLng, currentResult.photoHtml, searchId);
    } else {
        await placeMarkerFromAI(currentResult.imageFile, currentResult.photoHtml, searchId);
    }
}

/**
 * Starts a new searchable flow and invalidates older async work.
 * Any function holding a previous search ID should stop before touching the UI.
 */
function startNewSearch() {
    currentSearchId++;
    return currentSearchId;
}

/**
 * Returns true when an async flow still belongs to the latest search.
 */
function isCurrentSearch(searchId) {
    return searchId === currentSearchId;
}