// Cached DOM element references, looked up once at load.
// This file is loaded before every other script (see index.html), so `elements`
// is available at both load time and runtime across all files.
// (clearGeoItem in geoinfo.js still looks up by dynamic id on purpose.)
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
