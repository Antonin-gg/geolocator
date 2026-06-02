/*
 * Central DOM cache.
 *
 * This file runs before the rest of the app, so shared UI elements are looked up
 * once and reused everywhere. Keeping the IDs in one place makes later HTML
 * changes safer, because most selector updates happen here instead of across
 * many files.
 *
 * A few dynamic elements may still be queried locally when their ID is built at
 * runtime. For example, clearGeoItem() in geoinfo.js intentionally looks up the
 * target by ID.
 */

const elements = {};
{
    const ids = {
        panel: "resultPanel",
        strip: "resultStrip",
        content: "panelContent",
        placeName: "panelPlaceName",
        langOptions: "languageOptions",
        welcome: "welcome",
        learnMore: "learnMore",
        showLang: "showToggleLanguage",
        toggleTheme: "toggleTheme",
        moreContent: "moreContent",
        panelGlobe: "panelSearchingGlobe",
        wrapper: "wrapper",
        toggleView: "toggleView",
        showView: "showToggleView",
        showTheme: "showToggleTheme",
        wiki: "panelWiki",
        noData: "noData",
        mapEl: "map",
        locateHint: "locateUserHint",
        photo: "panelPhoto",
        locateBtn: "locateUserButton",
        weather: "weather",
        toggleUnits: "toggleUnits",
        stripPlaceName: "stripPlaceName",
        searchingText: "searchingText",
        searchingGlobe: "searchingGlobe",
        searching: "searching",
        panelMethod: "panelMethod",
        geoInfo: "panelGeoInfo",
        locateBtnMobile: "locateUserButtonMobile",
        distance: "distance",
        altitude: "altitude",
        wrapperToggles: "wrapperToggles",
        time: "time",
        stripToggle: "stripToggle",
        stripClose: "stripClose",
        panelToggle: "panelToggle",
        panelClose: "panelClose",
        uploadLabelPanel: "imageInputLabelPanel",
        uploadLabel: "imageInputLabel",
        imageInput: "imageInput",
        country: "country",
        coordinates: "coordinates"
    };
    for (const k in ids) elements[k] = document.getElementById(ids[k]);
}

/*
 * On Android, adding a second, unusual MIME type nudges Chrome toward the system
 * file picker instead of the Android photo picker. That matters because the
 * photo picker strips GPS metadata for privacy, while the file picker keeps the
 * original file data that the EXIF branch needs.
 *
 * model/gltf+json is intentionally uncommon for normal phone photos, so it helps
 * trigger the file picker without making it likely that users will accidentally
 * select a non-image file. The selected file is still validated later with an
 * image allowlist.
 */
elements.imageInput.accept = /Android/i.test(navigator.userAgent)
    ? "image/*,model/gltf+json"
    : "image/*";
