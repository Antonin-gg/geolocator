/*
 * Shared app state.
 *
 * The app is split across plain script files, so these values act as the small
 * shared state layer between UI controls, the map, the panel, geocoding, wiki,
 * and upload flows.
 *
 * Most booleans here describe user preferences or the current display mode.
 * The currentResult object is the single source of truth for the photo result
 * currently shown on the map and in the panel.
 */

let isSatellite = false;
let isDark = true;
let uiLang = "en";
let isSearching = false;
let isImperial = false;

/*
 * Incremented at the start of every new search.
 *
 * Async search flows can overlap if the user uploads another image while the
 * previous AI, EXIF, geocoding, or wiki requests are still running. Each flow
 * captures the current ID and checks it after awaits before writing back to the
 * UI. Older searches then quietly stop instead of overwriting the newer result.
 */
let currentSearchId = 0;

/*
 * Cascade flags shared between geocoding and wiki.
 *
 * If geocoding or wiki search had to use a fallback query, the wiki cascade waits
 * a little longer before accepting an English result. That gives safer local
 * language searches a chance to run at the matching fallback level.
 */
let didGeocodingFallBack = 0;
let wikiQueryWasBlacklisted = 0;

/*
 * Single source of truth for the active result displayed by the app:
 * map layers, display text, coordinates, and source image.
 */
const currentResult = {
    marker: null,
    polygon: null,
    placeName: null,
    shortName: null,
    sentence: null,
    method: null,
    lat: null,
    lng: null,
    confidence: null,
    isAI: false,
    photoHtml: null,
    photoObjectUrl: null,
    imageFile: null,

    /**
     * Removes only the Leaflet layers for the current result.
     * The photo and metadata stay intact so a rerun, such as a language change,
     * can reuse the same image.
     */
    clearLayers() {
        if (this.marker) {
            map.removeLayer(this.marker);
            this.marker = null;
        }
        if (this.polygon) {
            map.removeLayer(this.polygon);
            this.polygon = null;
        }
    },

    /**
     * Fully clears the active result.
     * This is used when the user closes the result or starts a new upload. The
     * object URL is revoked here so replaced previews do not keep browser memory.
     */
    reset() {
        if (this.photoObjectUrl) {
            URL.revokeObjectURL(this.photoObjectUrl);
        }
        this.clearLayers();
        this.placeName = null;
        this.shortName = null;
        this.sentence = null;
        this.method = null;
        this.lat = null;
        this.lng = null;
        this.confidence = null;
        this.isAI = false;
        this.photoHtml = null;
        this.photoObjectUrl = null;
        this.imageFile = null;
    },

    /**
     * Returns true when the result can be shown on the map.
     * Unknown and space results intentionally have no coordinates.
     */
    hasLocation() {
        return this.lat != null && this.lng != null;
    },

    /**
     * Stores a result produced by the AI plus geocoding.
     * The AI provides the sentence and method, while the geocoder provides the
     * coordinates and display name used by the map.
     */
    setFromAI(aiResult, location, photoHtml) {
        Object.assign(this, {
            placeName: location.shortName,
            shortName: location.shortName,
            method: aiResult.method,
            sentence: aiResult.displaySentence,
            lat: location.lat,
            lng: location.lng,
            isAI: true,
            photoHtml,
        });
    },

    /**
     * Stores a result produced from EXIF GPS metadata.
     * The coordinates come directly from the image file, while the readable place
     * name is built from reverse geocoding.
     */
    setFromExif(placeName, shortName, method, sentence, photoCoordinates, photoHtml) {
        Object.assign(this, {
            placeName, shortName, method, sentence,
            lat: photoCoordinates.latitude,
            lng: photoCoordinates.longitude,
            isAI: false,
            photoHtml,
        });
    }
};

/*
 * Dropdown wiring data.
 *
 * The dropdown helpers use this map so theme, view, and language menus can share
 * the same open and close logic. Language is the only dropdown that participates
 * in mobile history, because it behaves like a temporary overlay.
 */
const DROPDOWNS = {
    theme: {
        content: elements.toggleTheme,
        trigger: elements.showTheme,
        hiddenClass: "hidden-theme"
    },
    view: {
        content: elements.toggleView,
        trigger: elements.showView,
        hiddenClass: "hidden-view"
    },
    language: {
        content: elements.langOptions,
        trigger: elements.showLang,
        hiddenClass: "hidden-language",
        usesHistory: true
    }
};