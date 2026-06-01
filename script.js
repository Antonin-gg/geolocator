// ── CONSTANTS & CONFIG ─────────────────────────────────────────────
const OPENCAGE_API_KEY = "49b47c25108242779832267ff8062473";
const WORKER_URL = "https://geolocator-ai.a-gg.workers.dev";
const AI_MODEL = "gpt-5.5";
const AI_PROMPT = "Look at this image and identify where in the world it was taken.\n\nLANGUAGE — CRITICAL: All user-facing text fields (method, displaySentence) MUST be written in the language specified in the system instructions appended to this prompt. Only the \"place\" field stays in English (it is used for geocoding lookups, not displayed to the user). If you are uncertain which language to use, default to English. Never mix languages within a single response.\n\nRespond with ONLY a JSON object in this exact format, nothing else:\n{\n  \"place\": \"the most specific location name you can identify, ALWAYS in English for geocoding\",\n  \"countryCode\": \"ISO 3166-1 alpha-2 country code for the identified location, uppercase, or empty string if unknown\",\n  \"confidence\": \"landmark\" | \"city\" | \"region\" | \"country\" | \"unknown\" | \"space\",\n  \"method\": \"a single short sentence explaining the key visual evidence used to identify this location, written in the user's language\",\n  \"displaySentence\": \"a complete, grammatically natural sentence in the user's language announcing where the photo was taken, with the place name written naturally in that language and woven into the sentence. Empty string if confidence is unknown.\"\n}\n\nABSOLUTE RULE — check this first before anything else: If the image is clearly not a real photograph taken by a camera in the real world — this includes cartoons, illustrations, paintings, drawings, sketches, AI-generated images, screenshots of apps or websites, social media posts, food delivery or e-commerce interfaces, video game captures, memes, or any digital interface with visible UI elements — you MUST set confidence to \"unknown\", place to \"unknown\", countryCode to an empty string, method to \"This image is not a real photograph.\" (translated to the user's language), and displaySentence to an empty string. This rule applies ONLY when the image is clearly not a real-world camera photo. ATTENTION : If the image appears to be a real photo but the location cannot be identified, DO NOT SAY it is not a real photograph; instead return \"unknown\" because the location is not identifiable.\n\nEvidence rules — apply before identifying any location:\n- Use a balanced evidence standard. The goal is to identify locations when the visible evidence strongly converges, while refusing uncertain or generic cases.\n- Prioritize unique, explicit, low-frequency clues: flags, language, script, signage, road markings, architecture, culturally specific objects.\n- License plates indicate where a vehicle is registered, not necessarily where the photo was taken. Treat license plates as supporting evidence only when they agree with other independent visible context, such as readable local signage, flags, road markings, architecture, landscape, or country-specific street details. A license plate alone IS NOT ENOUGH to identify a country, city, region, or landmark. If the only meaningful clue is a license plate, return \"unknown\".\n- Treat terrain and landscape as weak evidence unless combined with unique identifiers.\n- Mountain ranges, arid landscapes, forests, coastlines, and generic rural or urban scenes are not sufficient evidence on their own — return \"unknown\" UNLESS the landscape has highly distinctive, well-known features that strongly narrow the location, or unless it is combined with independent non-landscape clues.\n- Generic modern architecture (glass facades, clean lines, light wood interiors, minimalist design, contemporary airports, shopping centers, office buildings) is NOT sufficient evidence on its own. These styles are global. Return \"unknown\" for modern buildings unless distinctive non-architectural clues are present (visible signage in a specific language, flags, named branding, identifiable surroundings).\n- Partial views of buildings (close-ups, sections, interiors without clear identifying features) cannot be confidently identified unless they contain a recognisable named element. A glass wall, a staircase, a generic interior — these are not identifiable. Return \"unknown\".\n- Replicas, themed structures, mall displays, and decorative monuments do not identify the real landmark or its city. Return unknown unless independent evidence (signage, surroundings) confirms the location.\n- Do NOT rely on visual similarity or vibe. Avoid bias toward overrepresented regions (USA, Western Europe) without explicit evidence.\n- Spanish-speaking countries can be confused easily: Spain, Mexico, Argentina, Colombia and others share language and some architectural styles. Look for distinguishing details — license plates, flags, peninsular vs Latin American architecture, regional vegetation, or text using country-specific vocabulary.\n- If a rare or region-specific clue is present, it overrides generic landscape similarity.\n- Before deciding, internally test whether any visible detail contradicts your candidate location. If it does, eliminate it.\n- Always answer at the highest safe level of specificity: landmark if certain, otherwise city, otherwise region, otherwise country, otherwise unknown.\n- Do not over-refuse when the image contains enough combined evidence for a country, region, city, or landmark.\n- Do not over-specify. If the exact city is uncertain but the country or region is likely, return the safer broader level.\n- If two or more plausible places remain after checking contradictions, return unknown or choose the broader shared level.\n- A wrong specific answer is worse than a broader correct answer.\n- If multiple locations that don't have a broader shared level remain plausible after elimination, return \"unknown\".\n- For photos not taken on Earth (Moon, Mars, ISS, deep space, other planets or astronomical objects): set confidence to \"space\", set the English \"place\" field to \"unknown\", countryCode to an empty string, write method explaining the visual evidence used, and write displaySentence as a complete sentence announcing where the photo was taken with a note that it cannot be shown on the map. Example displaySentence: \"This photo was taken on the Moon, which cannot be displayed on this map.\"\n\nFormatting rules (for the English \"place\" field):\n- Always separate parts of a location with commas. Never join two place names with just a space. Correct: \"Luxembourg, Luxembourg\", \"Mexico City, Mexico\", \"Panama City, Panama\". Incorrect: \"Luxembourg Luxembourg\", \"Mexico Mexico\".\n- Use commas to separate the place from its region or country in every confidence level.\n- If unknown, return \"unknown\".\n\nIdentification rules :\n- Confidence is fundamentally about how the place appears on a map. A landmark is a pinpoint — something you would mark with a single pin. A city/neighborhood/district is an urban area. A region is an outlined large area — something you would draw as a polygon. Use this mental test whenever you are uncertain.\n- Use \"landmark\" ONLY for a specific, individually named physical object or site with a small footprint on a map: a single building, monument, tower, bridge, statue, station, temple, church, museum, stadium, waterfall, cliff viewpoint, or named attraction. Include city/region and country (e.g. \"Eiffel Tower, Paris, France\", \"Berliner Dom, Berlin, Germany\", \"Cliffs of Moher, County Clare, Ireland\").\n- Do NOT use \"landmark\" for named urban areas. Named districts, business districts, financial districts, neighborhoods, suburbs, quarters, boroughs, city zones, plazas used as districts, and urban redevelopment areas are \"city\", not \"landmark\". Examples: \"La Défense, Île-de-France, France\" is \"city\"; \"Manhattan, New York, USA\" is \"city\"; \"Shibuya, Tokyo, Japan\" is \"city\"; \"Canary Wharf, London, United Kingdom\" is \"city\". Only use \"landmark\" if the image clearly identifies one specific building, monument, station, bridge, tower, statue, or attraction inside that area.\n- If the place name can refer both to an area and to a specific object, choose \"city\" unless the specific object is visually identifiable. For example, \"La Défense\" alone is a district, not a landmark; \"Grande Arche de la Défense, Puteaux, France\" is a landmark.\n- Use \"city\" for any urban area with high certainty: village, town, suburb, neighborhood, district, business district, financial district, quarter, borough, city zone, or city. Include region/state if ambiguous (e.g. \"Portland, Oregon, USA\"). When the city and country share a name, format with a comma between them (e.g. \"Luxembourg, Luxembourg\", \"Singapore, Singapore\", \"Monaco, Monaco\").\n- Use \"region\" for any large named area that covers significant geographic extent rather than a single point: states, provinces, country subdivisions, recognised natural regions (Patagonia, Tuscany, Bavaria, Provence, Cornwall, Sahara), national parks and protected areas (Yellowstone, Serengeti), archipelagos and major islands (Lofoten, Galápagos, Easter Island), mountain ranges, peninsulas, and similar large features. Use this whenever the place is something you would draw on a map as an outlined area rather than a pin.\n- Use \"country\" only if the country is identifiable with high certainty but nothing more specific.\n- Use \"unknown\" if: evidence is weak or generic, multiple locations remain plausible, or any visible detail is inconsistent with the chosen answer.\n- For locations that span multiple countries (waterfalls, mountains, lakes on borders): pick ONE country to anchor the location — the most photographed side or the side most visible in the image — rather than listing both. E.g. \"Iguazu Falls, Paraná, Brazil\" or \"Iguazu Falls, Misiones, Argentina\" — never \"Iguazu Falls, Argentina/Brazil\". The same applies to any cross-border feature.\n\nGeocodability rules — the \"place\" field will be sent to Nominatim and OpenCage for lookup. Optimize for these geocoders:\n- Use the most common and shortest official name. Not \"The Republic of South Africa\" but \"South Africa\".\n- Preserve official accents and diacritics in Latin-script place names when they are normally used, especially for cities, regions, and countries: \"Liège, Belgium\", not \"Liege, Belgium\"; \"São Luís, Maranhão, Brazil\", not \"Sao Luis, Maranhao, Brazil\";\n- Drop English-attached descriptors that aren't part of the canonical name: \"Lofoten\" not \"Lofoten Islands\", \"Atacama\" not \"Atacama Desert\", \"Galápagos\" not \"Galápagos Islands\". Use descriptors ONLY when they're part of the official name (e.g., \"Great Barrier Reef\", \"Easter Island\").\n- ALWAYS include the administrative parent (region/state/province) between a natural feature and the country (e.g., \"Lofoten, Nordland, Norway\", not \"Lofoten, Norway\").\n- Never use slashes or \"or\": \"Iguazu Falls, Misiones, Argentina\" not \"Iguazu Falls, Argentina/Brazil\".\n- Use English exonyms only when the English name is genuinely different from the local name, not merely a diacritic-free spelling. Still use true English exonyms where standard: \"Munich\" not \"München\", \"Florence\" not \"Firenze\", \"Moscow\" not \"Москва\".\n\nMethod rules:\n- The method must be a single concise sentence describing the most decisive visual evidence used to identify the location, in the user's language.\n- Be specific about what was recognised: the landmark name, the language on signage, the type of architecture, a national flag, distinctive vegetation, etc.\n- Examples (shown in English but should be written in the user's language):\n  - \"The building in the image was identified as Berliner Dom.\"\n  - \"Arabic script on the storefronts and the surrounding architecture indicate a certain Gulf country.\"\n  - \"The basalt sea stacks and turf-roofed houses are characteristic of the Faroe Islands.\"\n  - \"Road signage in Portuguese combined with the tropical urban landscape points to Brazil.\"\n- If confidence is \"unknown\" and the image appears to be a real photo, set method to a single sentence in the user's language explaining that the location could not be determined from the visible evidence. Do not say the image is not a real photograph unless it clearly is not one.\n\ndisplaySentence rules:\n- The displaySentence must be a complete, grammatically natural sentence in the user's language announcing where the photo was taken. It is shown directly to the user.\n- Write the place name naturally in the user's language inside the sentence: translate country names, region names, and well-known city names; keep proper nouns (specific landmark names, small place names) in their original form when no translation exists.\n- Weave the place name into the sentence according to the grammar of the user's language. Different languages place prepositions, particles, and word order differently, write whatever sounds natural.\n- Example for the location \"Berliner Dom, Berlin, Germany\":\n  - English: \"This photo was taken at Berliner Dom in Berlin, Germany.\"\n- If confidence is \"unknown\", set displaySentence to an empty string \"\".\n\nFinal check — MANDATORY before returning your answer:\n- Ask: what is the strongest piece of evidence, and does it uniquely support this location?\n- Is the chosen specificity safe, or should it be broader?\n- Verify that method and displaySentence are in the user's specified language.\n\nDo not make unsupported guesses. Prefer a broader correct answer over a risky precise answer.\nReturn unknown only when even a broader answer is not well supported.\n\nReturn ONLY the JSON object, no explanation, no markdown.";
const STOPWORDS = ["the", "and", "of", "de", "mount", "mountain", "volcano", "island", "islands", "lake"];
const ICONS = {
    moon: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>',

    sun: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v1"/><path d="M12 20v1"/><path d="M3 12h1"/><path d="M20 12h1"/><path d="m18.364 5.636-.707.707"/><path d="m6.343 17.657-.707.707"/><path d="m5.636 5.636.707.707"/><path d="m17.657 17.657.707.707"/></svg>',

    map: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>',

    satellite: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m13.5 6.5-3.148-3.148a1.205 1.205 0 0 0-1.704 0L6.352 5.648a1.205 1.205 0 0 0 0 1.704L9.5 10.5"/><path d="M16.5 7.5 19 5"/><path d="m17.5 10.5 3.148 3.148a1.205 1.205 0 0 1 0 1.704l-2.296 2.296a1.205 1.205 0 0 1-1.704 0L13.5 14.5"/><path d="M9 21a6 6 0 0 0-6-6"/><path d="M9.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l4.296-4.296a1.205 1.205 0 0 0 0-1.704l-2.296-2.296a1.205 1.205 0 0 0-1.704 0z"/></svg>',

    language: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>'
};
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



// ── UI TUNABLES ────────────────────────────────────────────────────
const ERROR_DISPLAY_MS = 3000;       // how long the error banner stays up
// PANEL_TRANSITION_MS (touch-ui-helpers.js), DEFAULT_ZOOM (geoinfo.js), and the mobile-mode
// breakpoints MOBILE_MAX_WIDTH / LANDSCAPE_MAX_HEIGHT (touch-ui-helpers.js) are also used here.
// "Is this mobile UI?" is read via isMobileMode() (touch-ui-helpers.js), never recomputed from size.

// ── STATE ──────────────────────────────────────────────────────────
let isSatellite = false;
let isDark = true;
let uiLang = "en";   // UI language preference (persisted) — not result state, so not in currentResult
let isSearching = false;
let geocodingFellback = 0;
let wikiBlacklisted = 0;
let isImperial = false;
let userCoordinates = null;
let locateHintShown = false;
let hasAcceptedLocationOnce = false;
let userMarker = null;
let locationPreviewTimeout1 = null;
let locationPreviewTimeout2 = null;
let userDistanceLine = null;
let userDistanceLabel = null;
let locationPreviewInProgress = false;

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

    // Remove just the Leaflet layers (marker + polygon). Used between searches,
    // where the photo/metadata must survive (e.g. a language re-search reuses them).
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

    // Full teardown: layers + photo object URL + all metadata. Used when a result
    // is closed, or when a brand-new image replaces the current one.
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

    hasLocation() {
        return this.lat != null && this.lng != null;
    },

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



// ── MAP & INITIAL SETUP ────────────────────────────────────────────
// L.map, tile layers, icons, attribution
const browserLang = navigator.language.split("-")[0];
if (TRANSLATIONS[browserLang]) {
    uiLang = browserLang;
    changeLanguage();
}

const savedDark = localStorage.getItem("isDark");
if (savedDark !== null) isDark = savedDark === "true";

const savedSatellite = localStorage.getItem("isSatellite");
if (savedSatellite !== null) isSatellite = savedSatellite === "true";

const savedLang = localStorage.getItem("uiLang");
if (savedLang !== null && TRANSLATIONS[savedLang]) {
    uiLang = savedLang;
    changeLanguage();
}

setTimeout(alignToggleChevrons, 50);

if (uiLang === "en" && navigator.language === "en-US") isImperial = true;

const savedImperial = localStorage.getItem("isImperial");
if (savedImperial !== null) isImperial = savedImperial === "true";

document.querySelector('[data-lang="' + uiLang + '"]').classList.add("active-lang");

const map = L.map('map').setView([0, 0], 2);

const mapLayerLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap © CARTO'
});

const mapLayerDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap © CARTO'
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: '© Esri'
});

mapLayerLight.addTo(map);

map.attributionControl.setPrefix('<a href="https://github.com/antonin-gg" target="_blank">© A.G.</a>');

elements.welcome.textContent = translate("welcome");

const fileInput = elements.imageInput;
if (/Android/i.test(navigator.userAgent)) {
    fileInput.accept = 'image/*,model/gltf+json';
} else {
    fileInput.accept = 'image/*';
}



// ── THEME, LAYER & LANGUAGE TOGGLERS───────────────────────────────
// changeTheme, eventListeners
function changeTheme() {
    document.body.classList.toggle("dark", isDark);
    if (currentResult.marker && !isSatellite) currentResult.marker.setIcon(isDark ? cameraIconDark : cameraIconLight);
    if (currentResult.polygon) currentResult.polygon.setStyle({ color: getPolygonColor() });
}


const cameraIconLight = new L.Icon({
    iconUrl: 'https://antonin-gg.github.io/geolocator/cameraIconLight.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [31, 41],
    iconAnchor: [15, 41],
    popupAnchor: [1, -41],
    shadowSize: [41, 41]
});

const cameraIconDark = new L.Icon({
    iconUrl: 'https://antonin-gg.github.io/geolocator/cameraIconDark.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [31, 41],
    iconAnchor: [15, 41],
    popupAnchor: [1, -41],
    shadowSize: [41, 41]
});

elements.showTheme.addEventListener("click", function () {
    openDropdown("theme");
});

elements.toggleTheme.addEventListener("click", function () {

    closeOtherDropdowns("theme");

    toggleTheme();

    closeDropdown("theme");

});

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

    changeTheme();
    updateToggles();

    localStorage.setItem("isDark", isDark);
}

elements.showView.addEventListener("click", function () {
    openDropdown("view");
});

elements.toggleView.addEventListener("click", function () {

    closeOtherDropdowns("view");

    toggleMapView();

    closeDropdown("view");

});

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
            panel.handlingPopstate = true;
            history.back();
        }
    }

    config.trigger.classList.toggle("dropdown-open", isOpen);
}

function isDropdownOpen(which) {
    const config = DROPDOWNS[which];
    return config && !config.content.classList.contains(config.hiddenClass);
}

function closeDropdown(which) {
    const config = DROPDOWNS[which];
    if (!config) return;

    if (config.content.classList.contains(config.hiddenClass)) return;

    config.content.classList.add(config.hiddenClass);
    config.trigger.classList.remove("dropdown-open");

    if (config.usesHistory && isTouchDevice && !panel.handlingPopstate) {
        panel.handlingPopstate = true;
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

document.addEventListener("click", function (e) {
    const clickedInsideToggles = e.target.closest("#wrapperToggles");

    if (!clickedInsideToggles) {
        closeAllDropdowns();
    }
});

elements.wrapperToggles.addEventListener("click", function (e) {
    e.stopPropagation();
});



// ── UI HELPERS ─────────────────────────────────────────────────────
// showSearching, hideSearching, showError, onCloseClick
function startLoading() {
    isSearching = true;

    elements.welcome.style.display = "none";

    elements.searching.style.display = "flex";

    elements.searchingText
        .classList.add("searching-active");

    elements.searchingGlobe
        .classList.add("globe-active");
}

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

function getPolygonColor() {
    if (isSatellite) return "#ffdd00";
    if (isDark) return "#7ab8ff";
    return "#4a90d9";
}

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

function updateUploadButtons() {
    const isMobile = isMobileMode();

    const showMobileUpload = isMobile && panel.isVisible;

    elements.uploadLabel.classList.toggle("mobile-hidden", showMobileUpload);
    elements.uploadLabelPanel.classList.toggle("visible", showMobileUpload);
}

let resizeTimeout;

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



// ── PANEL CONTROLS ─────────────────────────────────────────────────
class Panel {
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

        this.moreContentIsOpen = false;
        this.lockedPhotoHeight = null;
        this.handlingPopstate = false;
        this.scrollHintShown = false;

        this.wireEvents();
    }

    wireEvents() {
        this.closeBtn.addEventListener("click", () => this.close());
        this.stripCloseBtn.addEventListener("click", () => this.closeStrip());
        this.toggleBtn.addEventListener("click", () => this.minimize());
        this.stripToggleBtn.addEventListener("click", () => this.open());
        this.learnMore.addEventListener("click", () => this.toggleMoreContent());
        if (isTouchDevice) {
            window.addEventListener("popstate", () => this.handlePopstate());
            attachPanelGestures();
            attachStripGestures();
        }
    }

    get state() {
        if (document.body.classList.contains("ultra-open")) return "ultra";
        if (document.body.classList.contains("panel-open")) return "panel";
        if (document.body.classList.contains("strip-open")) return "strip";
        return "closed";
    }

    get isVisible() { return this.state !== "closed"; }
    get isUltra() { return this.state === "ultra"; }
    get isOpen() { return this.state === "panel"; }
    get isStrip() { return this.state === "strip"; }

    open() {
        this.pushPanelHistory();
        this.resetPanel();
        this.renderPanelContent();
        this.setPanelOpenState();
        this.syncMoreContentState();
        this.updateUiAfterOpen();
    }

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

    resetPanel() {
        this.content.scrollTop = 0;

        if (currentResult.marker) {
            currentResult.marker.closePopup();
        }
    }

    renderPanelContent() {
        this.photo.innerHTML = currentResult.photoHtml;

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

    setPanelOpenState() {
        this.panel.classList.add("open");
        this.mapEl.classList.add("panel-open");
        this.wrapper.classList.add("panel-open");
        document.body.classList.add("panel-open");

        document.body.classList.remove("strip-open");

        this.strip.style.display = "none";
        this.welcome.style.display = "none";
    }

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

    lockPhotoSize(force) {
        if (this.moreContentIsOpen && !force) return;

        const img = this.photo.querySelector("img");

        if (!img) return;

        this.content.classList.remove("scrollable");
        this.photo.classList.remove("locked");
        img.style.removeProperty("max-height");

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

    close() {
        stopUserLocationPreview();

        this.popPanelHistory(true);

        this.setPanelClosedState();

        this.updateUiAfterClose();

        this.closeMoreContent();
    }

    setPanelClosedState() {
        this.panel.classList.remove("open");
        this.mapEl.classList.remove("panel-open");
        this.wrapper.classList.remove("panel-open");
        document.body.classList.remove("panel-open");

        currentResult.reset();
        this.locateHint.classList.remove("visible");
    }

    popPanelHistory(closingPanel) {
        if (isTouchDevice && !this.handlingPopstate) {
            this.handlingPopstate = true;
            history.back();
            if (closingPanel) history.back();
        }
    }

    updateUiAfterClose() {
        updateUploadButtons();

        updateLocateUserButton();

        setTimeout(() => {
            if (!isTouchDevice) this.map.invalidateSize();
            this.welcome.style.display = "block";
        }, PANEL_TRANSITION_MS);
    }

    getPopupPhotoHtml() {
        return currentResult.photoHtml.replace(
            "<img ",
            '<img style="max-width:100%;height:auto;border-radius:4px;" '
        );
    }

    minimize() {
        this.popPanelHistory();

        this.setStripOpenState();

        this.renderStripContent();

        this.updateUiAfterStripOpen();
    }

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

    renderStripContent() {
        if (isSearching) {
            this.stripPlaceName.textContent = translate("searching");
        } else {
            this.stripPlaceName.textContent = currentResult.shortName;
        }
    }

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

    closeStrip() {
        this.popPanelHistory();

        stopUserLocationPreview();

        this.setStripClosedState();

        this.updateUiAfterStripClose();

        this.closeMoreContent();
    }

    setStripClosedState() {
        this.strip.style.display = "none";
        document.body.classList.remove("strip-open");

        currentResult.reset();
        this.locateHint.classList.remove("visible");
    }

    updateUiAfterStripClose() {
        updateUploadButtons();

        this.welcome.style.display = "block";

        updateLocateUserButton();
    }

    maximize() {
        document.body.classList.add("ultra-open");
        history.pushState({}, "");
        setTimeout(() => {
            this.lockPhotoSize(true);
            this.balanceGeoInfoLayout();
        }, PANEL_TRANSITION_MS);
    }

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

    closeMoreContent() {
        closeGeoInfo();
        this.closeWiki();
    }

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

        if (this.moreContentIsOpen) {
            setTimeout(() => {
                this.geoInfo.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
        }
    }

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

    startLoading(photoHtml) {
        currentResult.clearLayers();

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

        if (this.isStrip) {
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

const panel = new Panel(map);

async function buildMoreInfo(aiPlace, geocodedPlace, lat, lng, aiConfidence, aiCountryCode) {

    await buildWikiExcerpt(aiPlace, geocodedPlace, lat, lng, aiConfidence, aiCountryCode);

    await buildGeoInfo(lat, lng, aiConfidence, aiCountryCode);

    const hasGeo = document.querySelectorAll("#panelGeoInfo .active").length > 0;
    const hasWiki = elements.wiki.innerHTML.trim().length > 0;
    elements.learnMore.style.display = (hasGeo || hasWiki) ? "flex" : "none";
}

async function buildWikiExcerpt(aiPlace, geocodedPlace, lat, lng, aiConfidence, aiCountryCode) {

    let result = null;

    if (!aiPlace) {
        const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
        const countryName = aiCountryCode ? regionNames.of(aiCountryCode.toUpperCase()) : "";
        const EnGeocodedPlace = geocodedPlace.split(",")[0].trim() + ", " + countryName;
        result = await getWikiResult(EnGeocodedPlace, geocodedPlace, lat, lng, "exif");

    } else {
        result = await getWikiResult(aiPlace, geocodedPlace, lat, lng, aiConfidence);
    }

    if (!result) {
        elements.wiki.innerHTML = "";
        return;
    }

    const text = result.extract;

    elements.wiki.innerHTML =
        "<strong>" + result.title + "</strong><br>" +
        text + " " +
        (result.fullurl ? '<a href="' + result.fullurl + '" target="_blank">' + READ_MORE_TRANSLATIONS[uiLang] + '</a>' : "");

}

async function getWikiResult(aiPlace, geocodedPlace, lat, lng, aiConfidence) {
    /*
   Wikipedia fallback logic
   1. Search English Wikipedia with the current generated query.
   2. If an English result is found and the UI language is not English:
      a. Try to find the translated article title in the current UI language.
      b. If translation fails, keep the English result as a fallback.
      c. Only at the local-fallback index, also try local-language fallbacks before
       keeping the English result. This index is usually the first generated query,
       but shifts when buildWikiFallbackQueries() adds a blacklisted/simplified
       query or when geocoding itself had to fall back. This gives the cascade a
       chance to try those safer generated queries before switching to local
       title search or coordinate geosearch.
      d. First try searching the local-language Wikipedia using the geocoded shortName.
      e. If that fails, try local-language coordinate geosearch.
      f. If those local fallbacks fail, keep the original English result.
   3. If no English result is found:
      a. Only at the local-fallback index, try local-language fallbacks. This waits
       until any blacklisted/simplified wiki query and/or geocoder fallback query
       has had a chance to run first.
      b. First try searching the local-language Wikipedia using the geocoded shortName.
      c. Then try local-language coordinate geosearch.
      d. If the UI language is not English, also try English coordinate geosearch,
       then translate that result if possible.
   4. If nothing works, continue to the next generated query.
   */
    wikiBlacklisted = 0;

    const queries = buildWikiFallbackQueries(aiPlace);

    const localFallbackIndex = wikiBlacklisted + geocodingFellback;

    let result = null;

    for (let i = 0; i < queries.length; i++) {
        //Step 1
        result = await getWikiData(queries[i], "en", lat, lng, aiConfidence);

        //Step 2
        if (result && uiLang != "en") {

            //Step 2a
            const translatedResult = await translateWikiResultToCurrentLang(result);

            if (translatedResult) {
                result = translatedResult;
                break;
            }

            //Step 2c
            if (i === localFallbackIndex) {
                const enResult = result;

                result = await getWikiData(geocodedPlace, uiLang, lat, lng, aiConfidence);
                if (result) break;

                result = await wikiGeoSearch(geocodedPlace, uiLang, lat, lng, aiConfidence);
                if (result) break;

                result = enResult;
            }

            //Step 2b : result from step 1 is kept
        }

        if (result) break;

        //Step 3a
        if (i === localFallbackIndex) {
            //Step 3b
            result = await getWikiData(geocodedPlace, uiLang, lat, lng, aiConfidence);
            if (result) break;

            //Step 3c
            result = await wikiGeoSearch(geocodedPlace, uiLang, lat, lng, aiConfidence);
            if (result) break;


            //Step 3d
            if (uiLang != "en") {
                result = await wikiGeoSearch(geocodedPlace, "en", lat, lng, aiConfidence);
                if (result) {
                    const geoTranslatedResult = await translateWikiResultToCurrentLang(result);

                    if (geoTranslatedResult) {
                        result = geoTranslatedResult;
                        break;
                    }
                }
                if (result) break;
            }
        }

        //Step 4 : if no result, continue to next iteration
    }

    return result;
}

async function translateWikiResultToCurrentLang(result) {
    if (!result || uiLang === "en") return null;

    const translatedTitle = getWikiTitleTranslation(result);
    if (!translatedTitle) return null;

    return await getWikiPageByTitle(translatedTitle, uiLang);
}

// Builds a Wikipedia API query URL: the fixed base plus the shared extract/
// coordinate props, with the generator-specific params passed in.
function buildWikiApiUrl(language, params) {
    let url = "https://" + language + ".wikipedia.org/w/api.php?action=query" +
        params +
        "&redirects=1" +
        "&prop=extracts|coordinates|info|langlinks|pageprops" +
        "&exintro=1" +
        "&explaintext=1" +
        "&inprop=url" +
        "&format=json" +
        "&origin=*";

    if (language === "en" && uiLang !== "en") {
        url += "&lllang=" + encodeURIComponent(uiLang) + "&lllimit=1";
    }

    return url;
}

async function wikiGeoSearch(query, language, lat, lng, aiConfidence) {
    const url = buildWikiApiUrl(language,
        "&generator=geosearch" +
        "&ggscoord=" + encodeURIComponent(lat + "|" + lng) +
        "&ggsradius=10000" +
        "&ggslimit=20");

    const response = await fetch(url);

    if (!response.ok) return null;

    const data = await response.json();

    const pages = Object.values((data.query && data.query.pages) || {});
    if (pages.length === 0) return null;

    return pickBestWikiResult(pages, query, lat, lng, aiConfidence);
}

async function getWikiData(query, language, lat, lng, aiConfidence) {

    const url = buildWikiApiUrl(language,
        "&generator=search" +
        "&gsrsearch=" + encodeURIComponent(query) +
        "&gsrlimit=20");

    const response = await fetch(url);

    if (!response.ok) return null;

    const data = await response.json();

    const pages = Object.values((data.query && data.query.pages) || {});
    if (pages.length === 0) return null;

    return pickBestWikiResult(pages, query, lat, lng, aiConfidence);
}

async function getWikiPageByTitle(title, language) {
    const url = buildWikiApiUrl(language, "&titles=" + encodeURIComponent(title));

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const pages = Object.values((data.query && data.query.pages) || {});
    const page = pages[0];

    if (!page || page.missing !== undefined) return null;
    if (page.pageprops && Object.prototype.hasOwnProperty.call(page.pageprops, "disambiguation")) return null;
    if (isListPage(page)) return null;

    return page;
}

function pickBestWikiResult(results, query, lat, lng, aiConfidence) {
    results = results.filter(function (r) {
        return !(r.pageprops && Object.prototype.hasOwnProperty.call(r.pageprops, "disambiguation"));
    });

    results = results.filter(function (r) {
        return !isListPage(r);
    });

    const scored = results.map(function (r, index) {
        let score = wikiTitleScore(r.title || "", query);
        let isClose = false;

        if (lat != null && lng != null && r.coordinates && r.coordinates[0]) {
            const dist = haversineKm(lat, lng, r.coordinates[0].lat, r.coordinates[0].lon);

            let maxDist =
                aiConfidence === "country" ? 1000 :
                    aiConfidence === "region" ? 300 :
                        aiConfidence === "exif" ? 70 :
                            aiConfidence === "city" ? 50 :
                                aiConfidence === "landmark" ? 30 :
                                    1;
            if (geocodingFellback) maxDist = 800;

            isClose = dist < maxDist;
            if (isClose) score += 20;
            else if (score >= 95) score -= 15;
            else score -= 60;
        } else if (
            lat != null &&
            lng != null &&
            (aiConfidence === "region" || aiConfidence === "city" || aiConfidence === "landmark")
        ) {
            score -= 15;
        }

        score -= index;

        return {
            page: r,
            score: score,
            index: index,
            close: isClose
        };
    }).filter(function (item) {
        return item.score >= 50;
    });

    scored.sort(function (a, b) {
        return b.score - a.score || a.index - b.index;
    });

    for (let i = 0; i < scored.length; i++) {
        if (scored[i].close && scored[i].score >= 90) return scored[i].page;
        if (isProperNounAcrossLanguages(scored[i].page)) {
            return scored[i].page;
        }
    }

    return null;
}

function wikiTitleScore(title, query) {
    const primaryQuery = query.split(",")[0].trim();
    const primaryTokens = tokenizePlaceName(primaryQuery);
    const titleTokens = tokenizePlaceName(title);

    if (primaryTokens.length === 0 || titleTokens.length === 0) return -100;

    let hasForeignPrefix = false;
    const normalizedTitle = (title || "").toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const firstPrimaryToken = primaryTokens[0];
    const firstTokenPos = normalizedTitle.indexOf(firstPrimaryToken);
    if (firstTokenPos > 0) {
        const prefix = normalizedTitle.substring(0, firstTokenPos);
        const prefixWords = prefix.match(/[\p{L}\p{N}]+/gu) || [];
        hasForeignPrefix = prefixWords.some(function (w) {
            return !primaryTokens.includes(w);
        });
    }

    const queryHasAccent = hasAccent(primaryQuery);
    const titleHasAccent = hasAccent(title);

    const accentInsensitiveMatch =
        stripAccents(primaryQuery) === stripAccents(title);

    const badAccentDirection =
        queryHasAccent &&
        !titleHasAccent &&
        accentInsensitiveMatch;

    if (
        containsTokens(primaryQuery, title) &&
        containsTokens(title, primaryQuery) &&
        !hasForeignPrefix
    ) {
        if (badAccentDirection) return -100;

        return 100;
    }

    const containsPrimaryTokens = primaryTokens.every(function (token) {
        return titleTokens.includes(token);
    });

    if (containsPrimaryTokens) {
        const extraTitleTokens = titleTokens.filter(function (token) {
            return !primaryTokens.includes(token);
        });

        let score = 80 - extraTitleTokens.length * 15;

        if (hasForeignPrefix) score -= 35;

        return score;
    }

    const titleContainedInQuery = titleTokens.every(function (token) {
        return primaryTokens.includes(token);
    });

    const noCommaAmbiguity = !primaryQuery.includes(",") && !title.includes(",");

    if (titleContainedInQuery && noCommaAmbiguity) {
        const missingQueryTokens = primaryTokens.filter(function (token) {
            return !titleTokens.includes(token);
        });

        const score = 85 - missingQueryTokens.length * 15;

        return score;
    }

    return -100;
}

function isProperNounAcrossLanguages(page) {

    if (!page) return true;
    if (!page.langlinks || page.langlinks.length < 3) return true;

    const allTitles = page.langlinks.map(function (l) { return l["*"]; });
    allTitles.push(page.title);

    const totalTitles = allTitles.length;
    const requiredCount = Math.max(Math.ceil(totalTitles * 0.3), 4);

    const normalizedTitles = allTitles.map(function (title) {
        return (title || "").toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    });

    const allTokens = new Set();
    allTitles.forEach(function (title) {
        tokenizePlaceName(title).forEach(function (token) {
            allTokens.add(token);
        });
    });

    const tokens = Array.from(allTokens);

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        let matchCount = 0;
        for (let j = 0; j < normalizedTitles.length; j++) {
            if (normalizedTitles[j].indexOf(token) !== -1) matchCount++;
        }
        if (matchCount >= requiredCount) return true;
    }

    return false;
}

function hasAccent(str) {
    return /[\u0300-\u036f]/.test((str || "").normalize("NFD"));
}

function stripAccents(str) {
    return (str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function isListPage(page) {
    const title = (page.title || "").toLowerCase().trim();

    return title.startsWith("list of ") ||
        title.startsWith("lists of ");
}

function buildWikiFallbackQueries(query) {

    if (!query) return null;

    const cleaned = query.replace(/(\w+)\/(\w+)/g, "$1");
    const parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);

    const primary = parts[0] || cleaned;
    const country = parts.length > 1 ? parts[parts.length - 1] : null;
    const admin = parts.length > 2 ? parts[1] : null;

    const queries = [];

    queries.push(primary);

    const blacklistedPrimary = tokenizePlaceName(primary)
        .filter(function (token) {
            return !STOPWORDS.includes(token);
        })
        .join(" ");

    if (
        blacklistedPrimary &&
        blacklistedPrimary.toLowerCase() !== primary.toLowerCase()
    ) {
        queries.push(blacklistedPrimary);
        wikiBlacklisted++;
    }

    if (country) {
        queries.push(primary + " " + country);
    }

    if (admin) {
        queries.push(primary + " " + admin);
    }

    queries.push(cleaned);

    return queries;
}

function getWikiTitleTranslation(page) {
    if (!page || !page.langlinks || !page.langlinks[0]) return null;
    return page.langlinks[0]["*"];
}



// ── LOGICAL CORE ───────────────────────────────────────────────────
// aiLocator, placeMarkerFromEXIF, placeMarkerFromAI, getZoomLevel, locateImage
async function aiLocator(image) {
    // Static prompt first, variable language block appended last — matches the
    // prompt's own "appended to this prompt" wording and lets the large static
    // prefix be reused by the model's automatic prompt caching across languages.
    const promptWithLang = AI_PROMPT + "\n\n" + languageInstructions[uiLang];

    const imageBase64 = await new Promise(function (resolve) {
        const reader = new FileReader();
        reader.onload = function (e) { resolve(e.target.result); };
        reader.readAsDataURL(image);
    });

    let aiResponse;

    try {
        aiResponse = await fetch(WORKER_URL, {
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
    } catch (e) {
        console.error(e);
        showError(error("network"));
        return null;
    }

    if (!aiResponse.ok) {
        showError(error("network"));
        return null;
    }

    let data;
    // Structured Outputs guarantees a valid JSON object; the try/catch stays as a
    // defensive net for a model refusal or a length-truncated (max_tokens) response.
    try {
        data = await aiResponse.json();
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

async function placeMarkerFromEXIF(photoCoordinates, photoHtml) {

    const url = "https://nominatim.openstreetmap.org/reverse?lat=" +
        photoCoordinates.latitude + "&lon=" + photoCoordinates.longitude +
        "&format=json&zoom=18&addressdetails=1&accept-language=" + uiLang;

    const response = await fetch(url);

    if (!response.ok) {
        showError(error("network"));
        return null;
    }

    const result = await response.json();

    currentResult.clearLayers();
    panel.moreContentIsOpen = false;

    const exifPlace = buildExifPlaceName(result);

    const placeName = exifPlace.placeName;
    const shortName = exifPlace.shortName;
    const countryCode = exifPlace.countryCode;
    const sentence = exifPlace.sentence;

    currentResult.setFromExif(placeName, shortName, translate("methodGPS"), sentence, photoCoordinates, photoHtml);
    currentResult.confidence = "city";

    await buildMoreInfo(null, shortName, photoCoordinates.latitude, photoCoordinates.longitude, "city", countryCode);

    elements.welcome.style.display = "none";
    endLoading();

    panel.open();

    currentResult.marker = L.marker([photoCoordinates.latitude, photoCoordinates.longitude], { icon: isDark && !isSatellite ? cameraIconDark : cameraIconLight }).addTo(map);

    flyToPoint(currentResult.lat, currentResult.lng, DEFAULT_ZOOM);
}

function buildExifPlaceName(result) {
    let placeName = translate("unknownLocationShort");
    let shortName = translate("unknownLocationShort");
    if (result && result.address) {
        const address = result.address;
        const city = address.city || address.town || address.village || address.municipality || address.county || "";
        const country = address.country || "";
        shortName = city && country ? city + ", " + country : (result.display_name || "Unknown location");

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

// Geocoding cascade strategy:
// The AI returns one place string, but geocoders often need simpler or
// broader variants to find the right result. Before the cascade starts,
// generateFallbackQueries() builds those variants by progressively removing
// less essential parts of the place name while keeping safer parent context.
// This lets us try the most specific query first, then fall back to broader
// geocodable versions if the exact name is not found.
//
// We use two geocoding sources because they are good at different things.
// Nominatim is preferred for most area-level places because it can return
// polygons and is usually more reliable for cities, regions, and countries.
// OpenCage is useful as a backup, especially for landmarks, because it often
// finds specific named places that Nominatim misses.
//
// Each search has two levels of strictness:
//   1. Strict pass: require the geocoder result to match the expected map level
//      from the AI confidence. This avoids accepting a similarly named place
//      from the wrong type level, such as a city when we expected a region, or
//      a region when we expected a country.
//   2. Loose pass: retry without the type filter. This recovers valid results
//      when a geocoder classifies the right place differently than our app does.
//
// During the strict pass, for city, region, and country results, we use a
// whitelist of accepted geocoder types for each AI confidence level. For
// landmarks, we use a blacklist instead, because landmark-like places can
// appear under too many different geocoder types to whitelist reliably.
//
// Landmarks are handled differently from areas because they are fragile,
// specific targets. For each landmark query, we try Nominatim and then
// OpenCage immediately before moving to the next fallback query. OpenCage is
// included early here because it is often good at finding landmarks when
// Nominatim does not.
//
// Areas are more stable and broad, so we favour Nominatim first and exhaust
// its queries before trying OpenCage: Nominatim strict, OpenCage strict,
// Nominatim loose, OpenCage loose. This keeps higher-level places more
// predictable while still providing fallback coverage.
//
// When OpenCage finds a result, we still try to recover a matching Nominatim
// result afterward. This can give us more accuracy and, importantly, recover 
// a polygon so the app can show an area outline instead of only a point marker.
async function getLocationData(aiPlace, aiConfidence, aiCountryCode) {
    const queries = generateFallbackQueries(aiPlace);

    const passes = aiConfidence === "landmark"
        ? [
            // For landmarks, try both APIs for each query before moving to the next fallback query.
            { sources: ["nominatim", "opencage"], filterByType: "landmark" },
            { sources: ["nominatim", "opencage"], filterByType: null }
        ]
        : [
            // For areas, exhaust Nominatim first, then OpenCage.
            { sources: ["nominatim"], filterByType: aiConfidence },
            { sources: ["opencage"], filterByType: aiConfidence },
            { sources: ["nominatim"], filterByType: null },
            { sources: ["opencage"], filterByType: null }
        ];

    return await runGeocodingCascade(queries, passes, aiCountryCode);
}

async function runGeocodingCascade(queries, passes, aiCountryCode) {
    geocodingFellback = 0;

    for (let p = 0; p < passes.length; p++) {
        const pass = passes[p];

        for (let i = 0; i < queries.length; i++) {
            if (i === 2) geocodingFellback = 1;

            for (let s = 0; s < pass.sources.length; s++) {
                const result = await tryGeocodingSource(
                    pass.sources[s],
                    queries[i],
                    pass.filterByType,
                    aiCountryCode
                );

                if (result === "error") {
                    geocodingFellback = 0;
                    return null;
                }

                if (result) {
                    return result;
                }
            }
        }
        geocodingFellback = 0;
    }
    return null;
}

async function tryGeocodingSource(source, query, filterByType, aiCountryCode) {
    if (source === "nominatim") {
        return await tryNominatim(query, filterByType, aiCountryCode);
    }

    if (source === "opencage") {
        return await tryOpenCage(query, filterByType, aiCountryCode);
    }

    return null;
}

async function tryNominatim(query, aiConfidence, aiCountryCode) {

    let url = "https://nominatim.openstreetmap.org/search?q=" +
        encodeURIComponent(query) +
        "&format=json&limit=10&polygon_geojson=1&addressdetails=1&namedetails=1&accept-language=" + uiLang;

    if (aiCountryCode && aiCountryCode !== "AQ") {
        url += "&countrycodes=" + aiCountryCode.toLowerCase();
    }

    const response = await fetch(url);

    if (!response.ok) {
        showError(error("network"));
        return "error";
    }

    const results = await response.json();

    if (results.length > 0) {
        const result = pickBestNominatimResult(results, query, aiConfidence);

        if (result) {
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                bounds: result.boundingbox,
                polygon: result.geojson,
                displayName: query,
                shortName: buildShortName(result),
                showPolygon: showPolygon(aiConfidence, result.geojson)
            };
        }
    }

    return null;
}

async function tryOpenCage(query, aiConfidence, aiCountryCode) {

    let url = "https://api.opencagedata.com/geocode/v1/json?q=" +
        encodeURIComponent(query) +
        "&key=" + OPENCAGE_API_KEY +
        "&limit=5" +
        "&no_annotations=1" +
        "&language=en";

    if (aiCountryCode) {
        url += "&countrycode=" + aiCountryCode.toLowerCase();
    }
    const response = await fetch(url);

    if (!response.ok) {
        showError(error("network"));
        return "error";
    }

    const data = await response.json();

    if (data.status && data.status.code !== 200) {
        showError(error("network"));
        return "error";
    }

    const results = data.results || [];

    if (results.length > 0) {
        const result = pickBestOpenCageResult(results, query, aiConfidence);

        if (result) {
            const extraDataFromNominatim = (await getExtraDataFromNominatim(result, aiConfidence, aiCountryCode)) || {};
            return {
                lat: extraDataFromNominatim.lat ? parseFloat(extraDataFromNominatim.lat) : result.geometry.lat,
                lng: extraDataFromNominatim.lng ? parseFloat(extraDataFromNominatim.lng) : result.geometry.lng,
                bounds: extraDataFromNominatim.bounds || (result.bounds ?
                    [
                        result.bounds.southwest.lat,
                        result.bounds.northeast.lat,
                        result.bounds.southwest.lng,
                        result.bounds.northeast.lng
                    ]
                    : null),
                polygon: extraDataFromNominatim.polygon,
                displayName: result.formatted || "",
                shortName: extraDataFromNominatim.shortName || buildShortNameFromOpenCage(result),
                showPolygon: extraDataFromNominatim.polygon ? showPolygon(aiConfidence, extraDataFromNominatim.polygon) : false
            };

        }
    }

    return null;
}

async function getExtraDataFromNominatim(openCageResult, aiConfidence, aiCountryCode) {
    let query = openCageResult.formatted;
    if (!query) return null;

    query = query
        .replace(/\b\d{4,6}(-\d{3,4})?\b/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/\s+/g, ' ')
        .trim();

    for (let i = 0; i < 2; i++) {
        if (i === 1) {
            const reduced = query.split(",")[0].trim();
            if (reduced === query) break;
            query = reduced;
        }
        let url = "https://nominatim.openstreetmap.org/search?q=" +
            encodeURIComponent(query) +
            "&format=json&limit=10&polygon_geojson=1&addressdetails=1&namedetails=1&accept-language=" + uiLang;

        if (aiCountryCode) {
            url += "&countrycodes=" + aiCountryCode.toLowerCase();
        }

        const response = await fetch(url);
        if (!response.ok) continue;

        const results = await response.json();

        const matching = findClosestExtraResult(results, openCageResult, aiConfidence);

        if (matching) {
            return {
                lat: matching.lat,
                lng: matching.lng,
                polygon: matching.geojson,
                bounds: matching.boundingbox,
                shortName: buildShortName(matching)
            };
        }
    }

    const zoom = getZoomLevel(aiConfidence);
    const reverseUrl = "https://nominatim.openstreetmap.org/reverse?lat=" + openCageResult.geometry.lat +
        "&lon=" + openCageResult.geometry.lng + "&format=json&zoom=" + zoom +
        "&polygon_geojson=1&addressdetails=1&namedetails=1&accept-language=" + uiLang;

    const reverseResponse = await fetch(reverseUrl);
    if (!reverseResponse.ok) return null;
    const reverseResult = await reverseResponse.json();
    if (reverseResult) {
        return {
            lat: reverseResult.lat,
            lng: reverseResult.lng,
            polygon: reverseResult.geojson || null,
            bounds: reverseResult.boundingbox || null,
            shortName: buildShortName(reverseResult)
        };
    }
    return null;
}

function findClosestExtraResult(results, openCageResult, aiConfidence) {
    if (!results || results.length === 0) return null;

    let typeFilteredResults = results;
    const preferredTypes = getPreferredTypes(aiConfidence);

    if (aiConfidence && aiConfidence !== "landmark") {
        typeFilteredResults = results.filter(function (r) {
            return preferredTypes.includes(r.type) ||
                preferredTypes.includes(r.addresstype);
        });
    } else if (aiConfidence === "landmark") {
        typeFilteredResults = results.filter(function (r) {
            return !preferredTypes.includes(r.type) &&
                !preferredTypes.includes(r.addresstype);
        });
    }

    if (typeFilteredResults.length === 0) {
        typeFilteredResults = results;
    }

    const maxDist = (aiConfidence === "country") ? 1000 : (aiConfidence === "region") ? 300 : (aiConfidence === "city") ? 25 : (aiConfidence === "landmark") ? 5 : 1;

    const sorted = typeFilteredResults
        .filter(function (r) {
            if (!r.geojson || r.geojson.type === "Point") return false;

            const distR = haversineKm(parseFloat(r.lat), parseFloat(r.lon), openCageResult.geometry.lat, openCageResult.geometry.lng);
            return distR < maxDist;
        })
        .sort(function (a, b) {
            const distA = haversineKm(parseFloat(a.lat), parseFloat(a.lon), openCageResult.geometry.lat, openCageResult.geometry.lng);
            const distB = haversineKm(parseFloat(b.lat), parseFloat(b.lon), openCageResult.geometry.lat, openCageResult.geometry.lng);
            return distA - distB;
        });

    return sorted[0] || null;
}

function getZoomLevel(aiConfidence) {
    if (aiConfidence === "landmark") return 13;
    if (aiConfidence === "city") return 11;
    if (aiConfidence === "region") return 8;
    if (aiConfidence === "country") return 3;
    return 10;
}

function generateFallbackQueries(aiPlace) {
    let cleaned = aiPlace.replace(/(\w+)\/(\w+)/g, "$1");
    if (!cleaned.includes(",")) {
        cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, "$1, $1");
    }

    const parts = cleaned.split(",").map(p => p.trim());
    const queries = [cleaned];

    let blacklisted = cleaned.toLowerCase();
    STOPWORDS.forEach(function (word) {
        const regex = new RegExp("\\b" + word + "\\b", "gi");
        blacklisted = blacklisted.replace(regex, " ");
    });
    blacklisted = blacklisted.replace(/\s+/g, " ").trim();

    if (
        blacklisted &&
        blacklisted.toLowerCase() !== cleaned.toLowerCase()
    ) {
        queries.push(blacklisted);
    }

    for (let skip = 1; skip < parts.length - 1; skip++) {
        const trimmed = [parts[0]].concat(parts.slice(skip + 1));
        if (trimmed.length > 1 && trimmed.length < parts.length) {
            queries.push(trimmed.join(", "));
        }
    }

    if (parts.length > 1) {
        queries.push(parts[0]);
    }

    for (let i = 1; i < parts.length; i++) {
        queries.push(parts.slice(i).join(", "));
    }

    return queries;
}

function showPolygon(confidence, polygon) {
    if (!polygon || polygon.type === "Point") return false;
    if (confidence === "landmark") {
        return isPolygonLarge(polygon);
    }
    if (confidence === "city") return true;
    if (confidence === "region") return true;
    if (confidence === "country") return true;
    return false;
}

function isPolygonLarge(geojson) {
    if (!geojson.coordinates) return false;

    const coords = geojson.type === "Polygon" ? geojson.coordinates[0] : geojson.coordinates[0][0];
    if (!coords || coords.length < 3) return false;

    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);
    const area = latSpan * lngSpan;

    return area > 0.00005;
}

function buildShortName(result) {
    const a = result.address || {};
    const n = result.namedetails || {};

    const localName =
        n["name:" + uiLang] ||
        n.name ||
        (result.display_name ? result.display_name.split(",")[0].trim() : null);

    const country = a.country;

    if (localName && country) {
        return localName + ", " + country;
    } else if (localName) {
        return localName;
    } else if (country) {
        return country;
    }

    return result.display_name || "Unknown location";
}

function buildShortNameFromOpenCage(result) {
    const a = result.components || {};

    const localName =
        a._normalized_city ||
        a.city ||
        a.town ||
        a.village ||
        a.municipality ||
        a.county ||
        a.state ||
        a.island ||
        a.archipelago ||
        a.natural ||
        a.attraction;

    const country = a.country;

    if (localName && country) {
        return localName + ", " + country;
    } else if (localName) {
        return localName;
    } else if (country) {
        return country;
    }

    return result.formatted || "Unknown location";
}

function pickBestNominatimResult(results, aiPlace, aiConfidence) {

    const preferredTypes = getPreferredTypes(aiConfidence);

    let typeFilteredResults = results;

    if (aiConfidence && aiConfidence !== "landmark") {
        typeFilteredResults = results.filter(function (r) {
            return preferredTypes.includes(r.type) ||
                preferredTypes.includes(r.addresstype);
        });
    } else if (aiConfidence === "landmark") {
        typeFilteredResults = results.filter(function (r) {
            return !preferredTypes.includes(r.type) &&
                !preferredTypes.includes(r.addresstype);
        });
    }

    if (typeFilteredResults.length === 0) return null;

    const tokenMatches = typeFilteredResults.filter(function (r) {
        const nameEn = r.namedetails && r.namedetails["name:en"];
        const localName = r.namedetails && r.namedetails.name;
        const display = r.display_name || "";
        const primaryPart = aiPlace.split(",")[0].trim();

        return (usefulName(nameEn) && bidirectionalTokenMatch(aiPlace, nameEn)) ||
            (usefulName(localName) && bidirectionalTokenMatch(aiPlace, localName)) ||
            bidirectionalTokenMatch(aiPlace, display) ||
            (usefulName(nameEn) && primaryPart.length > 2 && bidirectionalTokenMatch(primaryPart, nameEn)) ||
            (primaryPart.length > 2 && bidirectionalTokenMatch(primaryPart, display));
    });

    if (tokenMatches.length > 0) {
        return sortByImportance(tokenMatches)[0];
    }

    return null;
}

function pickBestOpenCageResult(results, aiPlace, aiConfidence) {
    const preferredTypes = getPreferredTypes(aiConfidence);

    let typeFilteredResults = results;

    if (aiConfidence && aiConfidence !== "landmark") {
        typeFilteredResults = results.filter(function (r) {
            const type = r.components && r.components._type;
            return preferredTypes.includes(type);
        });
    } else if (aiConfidence === "landmark") {
        typeFilteredResults = results.filter(function (r) {
            const type = r.components && r.components._type;
            return !preferredTypes.includes(type);
        });
    }

    if (typeFilteredResults.length === 0) return null;

    const tokenMatches = typeFilteredResults.filter(function (r) {
        const primaryPart = aiPlace.split(",")[0].trim();
        const a = r.components || {};
        const names = [
            a._normalized_city,
            a.city,
            a.town,
            a.village,
            a.municipality,
            a.county,
            a.state,
            a.state_district,
            a.island,
            a.archipelago,
            a.natural,
            a.attraction
        ];

        return bidirectionalTokenMatch(aiPlace, r.formatted) ||
            names.some(function (name) {
                return usefulName(name) &&
                    (bidirectionalTokenMatch(primaryPart, name) || (usefulName(primaryPart) && bidirectionalTokenMatch(primaryPart, name)));
            });
    });

    if (tokenMatches.length > 0) {
        return sortByConfidence(tokenMatches)[0];
    }

    return null;
}

function usefulName(name) {
    return name && name.trim().length >= 4;
}

function sortByImportance(results) {
    return results.sort(function (a, b) {
        return (b.importance || 0) - (a.importance || 0);
    });
}

function sortByConfidence(results) {
    return results.sort(function (a, b) {
        return (b.confidence || 0) - (a.confidence || 0);
    });
}

function tokenizePlaceName(value) {
    return (value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // removes accents
        .replace(/[()]/g, " ")           // removes only parentheses
        .replace(/['’ʻ`´]/g, "")         // removes apostrophes
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .split(/\s+/)
        .filter(function (word) {
            return word.length >= 3 &&
                !["the", "and", "of", "de"].includes(word);
        });
}

function containsTokens(source, target) {
    const sourceTokens = tokenizePlaceName(source);
    const targetLower = (target || "").toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/['’ʻ`´]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (sourceTokens.length === 0 || !targetLower) return false;

    return sourceTokens.every(function (token) {
        return targetLower.includes(token);
    });
}

function bidirectionalTokenMatch(a, b) {
    return containsTokens(a, b) || containsTokens(b, a);
}

function getPreferredTypes(confidence) {
    if (confidence === "country") return ["country"];
    if (confidence === "region") return [
        // administrative
        "region",
        "state",
        "province",
        "county",
        "district",
        "administrative",
        "state_district",
        "historic",

        // large geographic regions
        "archipelago",
        "island",
        "islet",

        // natural / protected regions
        "national_park",
        "protected_area",
        "nature_reserve",
        "mountain_range",
        "peninsula",
        "cape",
        "bay",
        "lake",
        "valley",
        "forest",
        "wood"
    ];
    if (confidence === "city") return [
        "city",
        "town",
        "village",
        "municipality",
        "suburb",
        "borough",
        "quarter",
        "city_district",
        "neighbourhood",
        "hamlet",
        "locality",
        "district"
    ];
    if (confidence === "landmark") return [
        //blacklist for landmarks, not whitelist
        "house",
        "residential",
        "commercial",
        "retail",
        "service",

        "bus_stop",
        "platform",

        "road",
        "footway",
        "cycleway",
        "path",

        "traffic_signals",

        "parking",

        "address",
        "yes",
        "apartment",
        "restaurant", "cafe", "bar", "pub", "fast_food",
        "shop", "supermarket", "convenience",

        "country",
        "region",
        "state",
        "province",
        "county",
        "state_district",
        "archipelago"
    ];
    return [];
}

async function placeMarkerFromAI(image, photoHtml) {

    geocodingFellback = 0;

    panel.moreContentIsOpen = false;

    elements.welcome.style.display = "none";

    const aiResult = await aiLocator(image);

    if (!aiResult) return;

    const aiLocation = aiResult.place || "";

    const aiConfidence = aiResult.confidence || "";
    currentResult.confidence = aiConfidence;
    currentResult.method = aiResult.method;
    currentResult.photoHtml = photoHtml;
    currentResult.sentence = aiResult.displaySentence;

    if (aiLocation.toLowerCase().trim() === "unknown" ||
        aiLocation === "" ||
        aiConfidence.toLowerCase().trim() === "unknown" ||
        aiConfidence === "") {

        showUnknownResult();
        return;
    }

    const queryLocation = aiLocation.replace(/\bcity\b,?\s*/i, "");

    const location = await getLocationData(queryLocation, aiConfidence, aiResult.countryCode);

    if (!location) {
        showUnknownResult(true);
        return;
    }

    currentResult.clearLayers();
    currentResult.setFromAI(aiResult, location, photoHtml);

    await buildMoreInfo(aiResult.place, location.shortName, location.lat, location.lng, aiConfidence, aiResult.countryCode);

    elements.welcome.style.display = "none";
    endLoading();

    if (location.showPolygon && location.polygon) {
        currentResult.polygon = L.geoJSON(location.polygon, {
            style: { color: getPolygonColor(), weight: 2, fillOpacity: 0.15 }
        });
        // Country polygons are useful context during the fly. Smaller ones are
        // re-projected every animation frame (lag/colour-splotch), so they're
        // added only once the fly settles (moveend, below).
        if (aiConfidence === "country") currentResult.polygon.addTo(map);
    }

    panel.open();

    currentResult.marker = L.marker([location.lat, location.lng], { icon: isDark && !isSatellite ? cameraIconDark : cameraIconLight }).addTo(map);

    flyToLocation(location, aiConfidence);

    // Reveal a non-country polygon only once the fly settles. Guarded so a
    // closed/replaced result, or an in-flight locate preview, never gets a
    // stale polygon dropped onto the map.
    if (currentResult.polygon && aiConfidence !== "country") {
        const polygonToShow = currentResult.polygon;
        map.once("moveend", function () {
            if (currentResult.polygon === polygonToShow && !locationPreviewInProgress) {
                polygonToShow.addTo(map);
            }
        });
    }
}

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

function flyToPoint(lat, lng, zoom) {
    map.flyTo(
        offsetCenterForPanel(L.latLng(lat, lng), zoom),
        zoom
    );
}

function showUnknownResult(isGeocodingFailure) {

    endLoading();

    currentResult.clearLayers();

    currentResult.lat = null;
    currentResult.lng = null;

    if (currentResult.confidence !== "space") currentResult.sentence = "<strong>" + translate("unknownLocation") + "</strong>";
    currentResult.placeName = translate("unknownLocationShort");
    currentResult.shortName = translate("unknownLocationShort");
    currentResult.isAI = true;

    if (isGeocodingFailure) currentResult.method = "";

    panel.open();
}

async function rerunSearch() {
    if (!currentResult.imageFile) return;
    endLoading();
    panel.startLoading(currentResult.photoHtml);
    isSearching = true;
    panel.scrollHintShown = false;

    let photoLatLng = null;

    try {
        photoLatLng = await exifr.gps(currentResult.imageFile);
    } catch (e) {
        console.warn("EXIF GPS read failed:", e);
    }

    if (photoLatLng && photoLatLng.latitude && photoLatLng.longitude) {
        await placeMarkerFromEXIF(photoLatLng, currentResult.photoHtml);
    } else {
        await placeMarkerFromAI(currentResult.imageFile, currentResult.photoHtml);
    }
}

async function locateImage(input) {

    const image = input.files[0];

    const allowedTypes = ["image/jpeg", "image/png"];

    if (!image) return;

    if (!allowedTypes.includes(image.type)) {
        showError(error("file"));
        input.value = "";
        return;
    }

    panel.scrollHintShown = false;

    // Fully tear down the previous result (revokes its photo URL, clears layers
    // and metadata) before building the new one.
    currentResult.reset();

    currentResult.imageFile = image;
    currentResult.photoObjectUrl = URL.createObjectURL(image);
    const photoImgHtml = '<img src="' + currentResult.photoObjectUrl + '" style="border-radius:4px;margin-top:6px;">';
    currentResult.photoHtml = photoImgHtml;

    if (panel.isVisible) {
        isSearching = true;
        panel.startLoading(photoImgHtml);
    } else startLoading();

    let photoLatLng = null;
    try {
        photoLatLng = await exifr.gps(image);
    } catch (e) {
        console.warn("EXIF GPS read failed:", e);
    }

    if (photoLatLng && photoLatLng.latitude && photoLatLng.longitude) {

        await placeMarkerFromEXIF(photoLatLng, photoImgHtml);

    }

    else {

        await placeMarkerFromAI(image, photoImgHtml);

    }
    input.value = "";
}

if (isDark) {
    changeTheme();
    if (!isSatellite) {
        map.removeLayer(mapLayerLight);
        mapLayerDark.addTo(map);
    }
}

if (isSatellite) {
    map.removeLayer(mapLayerLight);
    satelliteLayer.addTo(map);
}
updateToggles();




// ── FINAL EVENT LISTENER ───────────────────────────────────────────
// Triggers the search
elements.imageInput.addEventListener("change", function (e) { locateImage(e.target) });