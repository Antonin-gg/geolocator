// ── CONSTANTS & CONFIG ─────────────────────────────────────────────
var OPENCAGE_API_KEY = "49b47c25108242779832267ff8062473";
var WORKER_URL = "https://geolocator-ai.a-gg.workers.dev";
var AI_MODEL = "gpt-4o";
var AI_PROMPT = "Look at this image and identify where in the world it was taken.\n\nLANGUAGE — CRITICAL: All user-facing text fields (method, displaySentence) MUST be written in the language specified in the system instructions appended to this prompt. Only the \"place\" field stays in English (it is used for geocoding lookups, not displayed to the user). If you are uncertain which language to use, default to English. Never mix languages within a single response.\n\nRespond with ONLY a JSON object in this exact format, nothing else:\n{\n  \"place\": \"the most specific location name you can identify, ALWAYS in English for geocoding\",\n  \"countryCode\": \"ISO 3166-1 alpha-2 country code for the identified location, uppercase, or empty string if unknown\",\n  \"confidence\": \"landmark\" | \"city\" | \"region\" | \"country\" | \"unknown\",\n  \"method\": \"a single short sentence explaining the key visual evidence used to identify this location, written in the user's language\",\n  \"displaySentence\": \"a complete, grammatically natural sentence in the user's language announcing where the photo was taken, with the place name written naturally in that language and woven into the sentence. Empty string if confidence is unknown.\"\n}\n\nABSOLUTE RULE — check this first before anything else: If the image is clearly not a real photograph taken by a camera in the real world — this includes cartoons, illustrations, paintings, drawings, sketches, AI-generated images, screenshots of apps or websites, social media posts, food delivery or e-commerce interfaces, video game captures, memes, or any digital interface with visible UI elements — you MUST set confidence to \"unknown\", place to \"unknown\", countryCode to an empty string, method to \"This image is not a real photograph.\" (translated to the user's language), and displaySentence to an empty string. This rule applies ONLY when the image is clearly not a real-world camera photo. ATTENTION : If the image appears to be a real photo but the location cannot be identified, DO NOT SAY it is not a real photograph; instead return \"unknown\" because the location is not identifiable.\n\nEvidence rules — apply before identifying any location:\n- Prioritize unique, explicit, low-frequency clues: flags, language, script, signage, road markings, architecture, culturally specific objects.\n- License plates indicate where a vehicle is registered, not necessarily where the photo was taken. Treat license plates as supporting evidence only when they agree with other independent visible context, such as readable local signage, flags, road markings, architecture, landscape, or country-specific street details. A license plate alone IS NOT ENOUGH to identify a country, city, region, or landmark. If the only meaningful clue is a license plate, return \"unknown\".\n- Treat terrain and landscape as WEAK evidence unless combined with unique identifiers.\n- Mountain ranges, arid landscapes, forests, coastlines, and generic rural or urban scenes are NOT sufficient evidence on their own — return \"unknown\" unless a distinctive non-landscape clue is present.\n- Generic modern architecture (glass facades, clean lines, light wood interiors, minimalist design, contemporary airports, shopping centers, office buildings) is NOT sufficient evidence on its own. These styles are global. Return \"unknown\" for modern buildings unless distinctive non-architectural clues are present (visible signage in a specific language, flags, named branding, identifiable surroundings).\n- Partial views of buildings (close-ups, sections, interiors without clear identifying features) cannot be confidently identified unless they contain a recognisable named element. A glass wall, a staircase, a generic interior — these are not identifiable. Return \"unknown\".\n- Landmark replicas, themed architecture, decorative monuments, mall displays, amusement-park structures, and imitation landmarks are NOT sufficient evidence for the original landmark or any specific city. If a famous-looking structure appears to be a replica or decorative version, return \"unknown\" unless there is independent location evidence such as readable local signage, flags, or uniquely identifiable surrounding features.\n- Do NOT rely on visual similarity or vibe. Avoid bias toward overrepresented regions (USA, Western Europe) without explicit evidence.\n- Spanish-speaking countries can be confused easily: Spain, Mexico, Argentina, Colombia and others share language and some architectural styles. Look for distinguishing details — license plates, flags, peninsular vs Latin American architecture, regional vegetation, or text using country-specific vocabulary.\n- If a rare or region-specific clue is present, it overrides generic landscape similarity.\n- Before deciding, internally test whether any visible detail contradicts your candidate location. If it does, eliminate it.\n- If multiple locations remain plausible after elimination, return \"unknown\".\n- If the image suggests a possible location but the same evidence could reasonably fit another place, return \"unknown\". Only return a location when the visible evidence uniquely supports it or when the combination of clues makes alternatives unlikely.\n\nFormatting rules (for the English \"place\" field):\n- Always separate parts of a location with commas. Never join two place names with just a space. Correct: \"Luxembourg, Luxembourg\", \"Mexico City, Mexico\", \"Panama City, Panama\". Incorrect: \"Luxembourg Luxembourg\", \"Mexico Mexico\".\n- Use commas to separate the place from its region or country in every confidence level.\n\nIdentification rules (for the English \"place\" field):\n- Confidence is fundamentally about how the place appears on a map. A landmark is a pinpoint — something you would mark with a single pin. A city/neighborhood/district is an urban area. A region is an outlined large area — something you would draw as a polygon. Use this mental test whenever you are uncertain.\n- Use \"landmark\" ONLY for a specific, individually named physical object or site with a small footprint on a map: a single building, monument, tower, bridge, statue, station, temple, church, museum, stadium, waterfall, cliff viewpoint, or named attraction. Include city/region and country (e.g. \"Eiffel Tower, Paris, France\", \"Berliner Dom, Berlin, Germany\", \"Cliffs of Moher, County Clare, Ireland\").\n- Do NOT use \"landmark\" for named urban areas. Named districts, business districts, financial districts, neighborhoods, suburbs, quarters, boroughs, city zones, plazas used as districts, and urban redevelopment areas are \"city\", not \"landmark\". Examples: \"La Défense, Île-de-France, France\" is \"city\"; \"Manhattan, New York, USA\" is \"city\"; \"Shibuya, Tokyo, Japan\" is \"city\"; \"Canary Wharf, London, United Kingdom\" is \"city\". Only use \"landmark\" if the image clearly identifies one specific building, monument, station, bridge, tower, statue, or attraction inside that area.\n- If the place name can refer both to an area and to a specific object, choose \"city\" unless the specific object is visually identifiable. For example, \"La Défense\" alone is a district, not a landmark; \"Grande Arche de la Défense, Puteaux, France\" is a landmark.\n- Use \"city\" for any urban area with high certainty: village, town, suburb, neighborhood, district, business district, financial district, quarter, borough, city zone, or city. Include region/state if ambiguous (e.g. \"Portland, Oregon, USA\"). When the city and country share a name, format with a comma between them (e.g. \"Luxembourg, Luxembourg\", \"Singapore, Singapore\", \"Monaco, Monaco\").\n- Use \"region\" for any large named area that covers significant geographic extent rather than a single point: states, provinces, country subdivisions, recognised natural regions (Patagonia, Tuscany, Bavaria, Provence, Cornwall, Sahara), national parks and protected areas (Yellowstone, Serengeti), archipelagos and major islands (Lofoten, Galápagos, Easter Island), mountain ranges, peninsulas, and similar large features. Use this whenever the place is something you would draw on a map as an outlined area rather than a pin.\n- Use \"country\" only if the country is identifiable with high certainty but nothing more specific.\n- Use \"unknown\" if: evidence is weak or generic, multiple locations remain plausible, or any visible detail is inconsistent with the chosen answer.\n- For locations that span multiple countries (waterfalls, mountains, lakes on borders): pick ONE country to anchor the location — the most photographed side or the side most visible in the image — rather than listing both. E.g. \"Iguazu Falls, Paraná, Brazil\" or \"Iguazu Falls, Misiones, Argentina\" — never \"Iguazu Falls, Argentina/Brazil\". The same applies to any cross-border feature.\n\nGeocodability rules — the \"place\" field will be sent to Nominatim and OpenCage for lookup. Optimize for these geocoders:\n- Use the most common and shortest official name. Not \"The Republic of South Africa\" but \"South Africa\".\n- Preserve official accents and diacritics in Latin-script place names when they are normally used, especially for cities, regions, and countries: \"Liège, Belgium\", not \"Liege, Belgium\"; \"São Luís, Maranhão, Brazil\", not \"Sao Luis, Maranhao, Brazil\"; \"Bogotá\", not \"Bogota\"; \"Málaga\", not \"Malaga\".\n- Drop English-attached descriptors that aren't part of the canonical name: \"Lofoten\" not \"Lofoten Islands\", \"Atacama\" not \"Atacama Desert\", \"Galápagos\" not \"Galápagos Islands\". Use descriptors ONLY when they're part of the official name (e.g., \"Great Barrier Reef\", \"Easter Island\").\n- ALWAYS include the administrative parent (region/state/province) between a natural feature and the country (e.g., \"Lofoten, Nordland, Norway\", not \"Lofoten, Norway\").\n- Never use slashes or \"or\": \"Iguazu Falls, Misiones, Argentina\" not \"Iguazu Falls, Argentina/Brazil\".\n- Use English exonyms only when the English name is genuinely different from the local name, not merely a diacritic-free spelling. Preserve official diacritics in Latin-script names: \"Liège, Belgium\", not \"Liege, Belgium\"; \"São Luís, Maranhão, Brazil\", not \"Sao Luis, Maranhao, Brazil\"; \"Bogotá\", not \"Bogota\"; \"Málaga\", not \"Malaga\". Still use true English exonyms where standard: \"Munich\" not \"München\", \"Florence\" not \"Firenze\", \"Moscow\" not \"Москва\".\n\nMethod rules:\n- The method must be a single concise sentence describing the most decisive visual evidence used to identify the location, in the user's language.\n- Be specific about what was recognised: the landmark name, the language on signage, the type of architecture, a national flag, distinctive vegetation, etc.\n- Examples (shown in English but should be written in the user's language):\n  - \"The building in the image was identified as Berliner Dom.\"\n  - \"Arabic script on the storefronts and the surrounding architecture indicate a certain Gulf country.\"\n  - \"The dramatic basalt sea stacks and turf-roofed houses are characteristic of the Faroe Islands.\"\n  - \"Road signage in Portuguese combined with the tropical urban landscape points to Brazil.\"\n- If confidence is \"unknown\" and the image appears to be a real photo, set method to a single sentence in the user's language explaining that the location could not be determined from the visible evidence. Do not say the image is not a real photograph unless it clearly is not one.\n\ndisplaySentence rules:\n- The displaySentence must be a complete, grammatically natural sentence in the user's language announcing where the photo was taken. It is shown directly to the user.\n- Write the place name naturally in the user's language inside the sentence: translate country names, region names, and well-known city names; keep proper nouns (specific landmark names, small place names) in their original form when no translation exists.\n- Weave the place name into the sentence according to the grammar of the user's language. Different languages place prepositions, particles, and word order differently — write whatever sounds natural.\n- Examples for the location \"Berliner Dom, Berlin, Germany\":\n  - English: \"This photo was taken at Berliner Dom in Berlin, Germany.\"\n  - French: \"Cette photo a été prise à la Cathédrale de Berlin, à Berlin, en Allemagne.\"\n  - Spanish: \"Esta foto fue tomada en la Catedral de Berlín, en Berlín, Alemania.\"\n  - German: \"Dieses Foto wurde am Berliner Dom in Berlin, Deutschland aufgenommen.\"\n  - Japanese: \"この写真はドイツのベルリンにあるベルリン大聖堂で撮影されました。\"\n  - Arabic: \"تم التقاط هذه الصورة عند كاتدرائية برلين في برلين، ألمانيا.\"\n  - Chinese: \"这张照片拍摄于德国柏林的柏林大教堂。\"\n- If confidence is \"unknown\", set displaySentence to an empty string \"\".\n\nFinal check — MANDATORY before returning your answer:\n- Ask internally: is this unmistakably a non-photo image or digital interface? If yes, return \"unknown\", countryCode to an empty string, method to \"This image is not a real photograph.\" translated to the user's language, and displaySentence to \"\".\n- If the image appears to be a camera photo of a real-world scene but the location is not identifiable, return \"unknown\" because the visible evidence is insufficient. Never describe a real-world camera photo as not a real photograph merely because the location cannot be identified.\n- Ask: what is the strongest piece of evidence, and does it uniquely support this location?\n- If the strongest clue is a license plate, return \"unknown\" unless there is other independent visible evidence that supports the same location.\n- If the strongest clue is a famous-looking object that could be a replica, themed decoration, or imitation, do not infer a location from it. Return \"unknown\" unless another independent clue identifies the place.\n- If the answer depends mainly on generic features, or if any alternative location is plausible, return \"unknown\".\n- Verify that method and displaySentence are in the user's specified language. Do not mix languages.\n\nNEVER GUESS. A wrong answer is worse than no answer.\n\nReturn ONLY the JSON object, no explanation, no markdown.";
var STOPWORDS = ["the", "and", "of", "de", "mount", "mountain", "volcano", "island", "islands"];
var ICONS = {
    moon: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>',

    sun: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v1"/><path d="M12 20v1"/><path d="M3 12h1"/><path d="M20 12h1"/><path d="m18.364 5.636-.707.707"/><path d="m6.343 17.657-.707.707"/><path d="m5.636 5.636.707.707"/><path d="m17.657 17.657.707.707"/></svg>',

    map: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>',

    satellite: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m13.5 6.5-3.148-3.148a1.205 1.205 0 0 0-1.704 0L6.352 5.648a1.205 1.205 0 0 0 0 1.704L9.5 10.5"/><path d="M16.5 7.5 19 5"/><path d="m17.5 10.5 3.148 3.148a1.205 1.205 0 0 1 0 1.704l-2.296 2.296a1.205 1.205 0 0 1-1.704 0L13.5 14.5"/><path d="M9 21a6 6 0 0 0-6-6"/><path d="M9.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l4.296-4.296a1.205 1.205 0 0 0 0-1.704l-2.296-2.296a1.205 1.205 0 0 0-1.704 0z"/></svg>',

    language: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>'
};



// ── STATE ──────────────────────────────────────────────────────────
var isSatellite = false;
var isDark = true;
var photoMarker;
var currentPlaceName = null;
var currentLat = null;
var currentLng = null;
var currentSentence = null;
var currentPhotoHtml = null;
var currentImageFile = null;
var currentMethod = null;
var currentShortName = null;
var currentIsAI = false;
var locationPolygon = null;
var currentLang = "en";
var isSearching = false;
var scrollHintShown = false;
var moreContentIsOpen = false;
var geocodingFellback = false;
var wikiBlacklisted = 0;
var lockedPhotoHeight = null;
var isImperial = false;
var userCoordinates = null;
var locateHintShown = false;
var hasUploadedFirstPhoto = false;
var hasAcceptedLocationOnce = false;
var userMarker = null;
var locationPreviewTimeout1 = null;
var locationPreviewTimeout2 = null;
var userDistanceLine = null;
var userDistanceLabel = null;
var locationPreviewInProgress = false;



// ── MAP & INITIAL SETUP ────────────────────────────────────────────
// L.map, tile layers, icons, attribution
var browserLang = navigator.language.split("-")[0];
if (TRANSLATIONS[browserLang]) {
    currentLang = browserLang;
    changeLanguage();
}

var savedDark = localStorage.getItem("isDark");
if (savedDark !== null) isDark = savedDark === "true";

var savedSatellite = localStorage.getItem("isSatellite");
if (savedSatellite !== null) isSatellite = savedSatellite === "true";

var savedLang = localStorage.getItem("currentLang");
if (savedLang !== null && TRANSLATIONS[savedLang]) {
    currentLang = savedLang;
    changeLanguage();
}

setTimeout(alignToggleChevrons, 50);

if (currentLang === "en" && navigator.language === "en-US") isImperial = true;

var savedImperial = localStorage.getItem("isImperial");
if (savedImperial !== null) isImperial = savedImperial === "true";

document.querySelector('[data-lang="' + currentLang + '"]').classList.add("active-lang");

var map = L.map('map').setView([0, 0], 2);

var streetLayerLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap © CARTO'
});

var streetLayerDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap © CARTO'
});

var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: '© Esri'
});

streetLayerLight.addTo(map);

map.attributionControl.setPrefix('<a href="https://github.com/antonin-gg" target="_blank">© A.G.</a>');

document.getElementById("welcome").textContent = translate("welcome");

var fileInput = document.getElementById('imageInput');
if (/Android/i.test(navigator.userAgent)) {
    fileInput.accept = 'image/*,model/gltf+json';
} else {
    fileInput.accept = 'image/*';
}



// ── THEME, LAYER & LANGUAGE TOGGLERS───────────────────────────────
// darkPopupStyle, toLightTheme, toDarkTheme, eventListeners
var darkPopupStyle = document.createElement("style");
darkPopupStyle.textContent = `
            .leaflet-popup-content-wrapper {
                background: rgba(15, 15, 25, 0.6) !important;
                color: #f0f0f0 !important;
                box-shadow: 0 2px 12px rgba(0,0,0,0.5) !important;
            }
            .leaflet-popup-tip {
                background: rgba(15, 15, 25, 0.6) !important;
            }
        `;

function toLightTheme() {
    const elements = document.getElementsByClassName("box");

    for (let el of elements) {
        el.style.background = "rgba(255,255,255,0.4)";
        el.style.color = "#000000";
        el.style.border = "1px solid rgba(0,0,0,0.15)";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    }

    var zoomButtons = document.querySelectorAll(".leaflet-control-zoom a");

    zoomButtons.forEach(function (el) {
        el.style.background = "rgba(255,255,255,0.4)";
        el.style.color = "#000000";
        el.style.border = "1px solid rgba(0,0,0,0.15)";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    });

    darkPopupStyle.remove();

    document.querySelector(".leaflet-control-attribution").style.background = "rgba(255,255,255,0.4)";
    document.querySelector(".leaflet-control-attribution").style.color = "#000";

    document.getElementById("resultPanel").style.background = "rgba(248, 247, 244, 0.96)";
    document.getElementById("resultPanel").style.color = "#000000";
    document.getElementById("panelMethod").style.color = "#666666";
    document.getElementById("panelClose").style.background = "rgba(0,0,0,0.08)";
    document.getElementById("panelToggle").style.background = "rgba(0,0,0,0.08)";
    document.getElementById("panelClose").style.color = "#000000";
    document.getElementById("panelToggle").style.color = "#000000";
    document.getElementById("stripClose").style.background = "rgba(0,0,0,0.08)";
    document.getElementById("stripClose").style.color = "#000000";
    document.getElementById("stripToggle").style.background = "rgba(0,0,0,0.08)";
    document.getElementById("stripToggle").style.color = "#000000";


    if (photoMarker && !isSatellite) photoMarker.setIcon(cameraIconLight);

    document.body.classList.remove("dark");

}

function toDarkTheme() {

    const elements = document.getElementsByClassName("box");

    for (let el of elements) {
        el.style.background = "rgba(15, 15, 25, 0.75)";
        el.style.color = "#f0f0f0";
        el.style.border = "1px solid rgba(255, 255, 255, 0.12)";
        el.style.boxShadow = "0 2px 12px rgba(0, 0, 0, 0.5)";
    }

    var zoomButtons = document.querySelectorAll(".leaflet-control-zoom a");

    zoomButtons.forEach(function (el) {
        el.style.background = "rgba(15, 15, 25, 0.75)";
        el.style.color = "#f0f0f0";
        el.style.border = "1px solid rgba(255, 255, 255, 0.12)";
        el.style.boxShadow = "0 2px 12px rgba(0, 0, 0, 0.5)";
    });

    document.head.appendChild(darkPopupStyle);

    document.querySelector(".leaflet-control-attribution").style.background = "rgba(15,15,25,0.75)";
    document.querySelector(".leaflet-control-attribution").style.color = "#f0f0f0";

    document.getElementById("resultPanel").style.background = "rgba(15, 15, 25, 0.95)";
    document.getElementById("resultPanel").style.color = "#f0f0f0";
    document.getElementById("panelMethod").style.color = "#aaaaaa";
    document.getElementById("panelClose").style.background = "rgba(255,255,255,0.12)";
    document.getElementById("panelToggle").style.background = "rgba(255,255,255,0.12)";
    document.getElementById("panelClose").style.color = "#f0f0f0";
    document.getElementById("panelToggle").style.color = "#f0f0f0";
    document.getElementById("stripClose").style.background = "rgba(255,255,255,0.12)";
    document.getElementById("stripClose").style.color = "#f0f0f0";
    document.getElementById("stripToggle").style.background = "rgba(255,255,255,0.12)";
    document.getElementById("stripToggle").style.color = "#f0f0f0";

    if (photoMarker && !isSatellite) photoMarker.setIcon(cameraIconDark);

    document.body.classList.add("dark");

}

var cameraIconLight = new L.Icon({
    iconUrl: 'https://antonin-gg.github.io/geolocator/cameraIconLight.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [31, 41],
    iconAnchor: [15, 41],
    popupAnchor: [1, -41],
    shadowSize: [41, 41]
});

var cameraIconDark = new L.Icon({
    iconUrl: 'https://antonin-gg.github.io/geolocator/cameraIconDark.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [31, 41],
    iconAnchor: [15, 41],
    popupAnchor: [1, -41],
    shadowSize: [41, 41]
});

document.getElementById("showToggleTheme").addEventListener("click", function () {
    if (!document.getElementById("toggleView").classList.contains("hidden-view")) {
        document.getElementById("toggleView").classList.add("hidden-view");
        document.getElementById("showToggleView").classList.remove("dropdown-open");
    }
    if (!document.getElementById("languageOptions").classList.contains("hidden-language")) {
        document.getElementById("languageOptions").classList.add("hidden-language");
        document.getElementById("showToggleLanguage").classList.remove("dropdown-open");
    }

    document.getElementById("toggleTheme").classList.toggle("hidden-theme");
    var isOpen = !document.getElementById("toggleTheme").classList.contains("hidden-theme");
    this.classList.toggle("dropdown-open", isOpen);
});

document.getElementById("toggleTheme").addEventListener("click", function () {
    if (!document.getElementById("languageOptions").classList.contains("hidden-language")) {
        document.getElementById("languageOptions").classList.add("hidden-language");
        document.getElementById("showToggleLanguage").classList.remove("dropdown-open");
    }
    if (isDark) {
        toLightTheme();
        isDark = false;
        if (!isSatellite) {
            map.removeLayer(streetLayerDark);
            streetLayerLight.addTo(map);
        }
    } else {
        toDarkTheme();
        isDark = true;
        if (!isSatellite) {
            map.removeLayer(streetLayerLight);
            streetLayerDark.addTo(map);
        }
    }

    updateToggles();

    if (locationPolygon) {
        locationPolygon.setStyle({ color: getPolygonColor() });
    }

    this.classList.toggle("hidden-theme");
    document.getElementById("showToggleTheme").classList.remove("dropdown-open");

    localStorage.setItem("isDark", isDark);
});

document.getElementById("showToggleView").addEventListener("click", function () {
    if (!document.getElementById("toggleTheme").classList.contains("hidden-theme")) {
        document.getElementById("toggleTheme").classList.add("hidden-theme");
        document.getElementById("showToggleTheme").classList.remove("dropdown-open");
    }
    if (!document.getElementById("languageOptions").classList.contains("hidden-language")) {
        document.getElementById("languageOptions").classList.add("hidden-language");
        document.getElementById("showToggleLanguage").classList.remove("dropdown-open");
    }

    document.getElementById("toggleView").classList.toggle("hidden-view");
    var isOpen = !document.getElementById("toggleView").classList.contains("hidden-view");
    this.classList.toggle("dropdown-open", isOpen);
});

document.getElementById("toggleView").addEventListener("click", function () {

    if (!document.getElementById("toggleTheme").classList.contains("hidden-theme")) {
        document.getElementById("toggleTheme").classList.add("hidden-theme");
    }

    if (!document.getElementById("languageOptions").classList.contains("hidden-language")) {
        document.getElementById("languageOptions").classList.add("hidden-language");
        document.getElementById("showToggleLanguage").classList.remove("dropdown-open");
    }

    if (isSatellite) {
        map.removeLayer(satelliteLayer);
        if (isDark) {
            streetLayerDark.addTo(map);
            if (photoMarker) photoMarker.setIcon(cameraIconDark);
        }
        else {
            streetLayerLight.addTo(map);
        }
        isSatellite = false;
    } else {
        if (isDark) {
            map.removeLayer(streetLayerDark);
            if (photoMarker) photoMarker.setIcon(cameraIconLight);
        }
        else {
            map.removeLayer(streetLayerLight);
        }
        satelliteLayer.addTo(map);
        isSatellite = true;
    }

    updateToggles();

    if (locationPolygon) {
        locationPolygon.setStyle({ color: getPolygonColor() });
    }

    this.classList.toggle("hidden-view");
    document.getElementById("showToggleView").classList.remove("dropdown-open");

    localStorage.setItem("isSatellite", isSatellite);
});

document.getElementById("showToggleLanguage").addEventListener("click", function () {
    if (!document.getElementById("toggleTheme").classList.contains("hidden-theme")) {
        document.getElementById("toggleTheme").classList.add("hidden-theme");
        document.getElementById("showToggleTheme").classList.remove("dropdown-open");
    }
    if (!document.getElementById("toggleView").classList.contains("hidden-view")) {
        document.getElementById("toggleView").classList.add("hidden-view");
        document.getElementById("showToggleView").classList.remove("dropdown-open");
    }

    document.getElementById("languageOptions").classList.toggle("hidden-language");
    var isOpen = !document.getElementById("languageOptions").classList.contains("hidden-language");
    if (isOpen) {
        document.getElementById("languageOptions").scrollTop = 0;
    }
    this.classList.toggle("dropdown-open", isOpen);
});

document.querySelectorAll(".lang-option").forEach(function (button) {

    button.addEventListener("click", function () {

        if (!document.getElementById("languageOptions").classList.contains("hidden-language")) {
            document.getElementById("languageOptions").classList.add("hidden-language");
        }

        document.querySelector('[data-lang="' + currentLang + '"]').classList.remove("active-lang");

        currentLang = this.getAttribute("data-lang");

        changeLanguage();

        document.getElementById("languageOptions").classList.add("hidden-language");
        document.getElementById("showToggleLanguage").classList.remove("dropdown-open");

        document.querySelector('[data-lang="' + currentLang + '"]').classList.add("active-lang");

        localStorage.setItem("currentLang", currentLang);

        var panelOpen = document.getElementById("resultPanel").classList.contains("open");
        var stripOpen = document.getElementById("resultStrip").style.display === "flex";

        if ((panelOpen || stripOpen) && currentImageFile) {
            rerunSearch();
        }
    });

});

document.addEventListener("click", function (e) {
    var clickedInsideToggles = e.target.closest("#wrapperToggles");

    if (!clickedInsideToggles) {
        if (!document.getElementById("toggleView").classList.contains("hidden-view")) {
            document.getElementById("toggleView").classList.add("hidden-view");
            document.getElementById("showToggleView").classList.remove("dropdown-open");
        }
        if (!document.getElementById("toggleTheme").classList.contains("hidden-theme")) {
            document.getElementById("toggleTheme").classList.add("hidden-theme");
            document.getElementById("showToggleTheme").classList.remove("dropdown-open");
        }
        if (!document.getElementById("languageOptions").classList.contains("hidden-language")) {
            document.getElementById("languageOptions").classList.add("hidden-language");
            document.getElementById("showToggleLanguage").classList.remove("dropdown-open");
        }
    }
});

document.getElementById("wrapperToggles").addEventListener("click", function (e) {
    e.stopPropagation();
});



// ── UI HELPERS ─────────────────────────────────────────────────────
// showSearching, hideSearching, showError, onCloseClick
function showSearching() {
    isSearching = true;

    document.getElementById("welcome").style.display = "none";

    document.getElementById("searching").style.display = "block";

    document.getElementById("searchingText")
        .classList.add("searching-active");

    document.getElementById("searchingGlobe")
        .classList.add("globe-active");
}

function hideSearching() {
    isSearching = false;

    document.getElementById("searching").style.display = "none";

    document.getElementById("searchingText")
        .classList.remove("searching-active");

    document.getElementById("searchingGlobe")
        .classList.remove("globe-active");
}

function showError(message) {
    var panelOpen = document.getElementById("resultPanel").classList.contains("open");
    var stripOpen = document.getElementById("resultStrip").style.display === "flex";
    if (panelOpen || stripOpen) {
        if (isSearching) {
            document.getElementById("panelPlaceName").classList.remove("loading");
            document.getElementById("panelSearchingGlobe").classList.remove("globe-active");
            document.getElementById("panelSearchingGlobe").style.display = "none";
            isSearching = false;
        }
    } else if (isSearching) hideSearching();
    if (panelOpen) closePanel();
    else if (stripOpen) closeStrip();

    document.getElementById("welcome").style.display = "none";
    document.getElementById("noData").style.display = "block";
    document.getElementById("noData").textContent = message;
    setTimeout(() => {
        document.getElementById("noData").style.display = "none";
        document.getElementById("noData").textContent = null;
        document.getElementById("welcome").style.display = "block";
    }, 3000);
}

function getPolygonColor() {
    if (isSatellite) return "#ffdd00";
    if (isDark) return "#7ab8ff";
    return "#4a90d9";
}

function lockPanelPhotoSize(force) {
    if (moreContentIsOpen && !force) return;

    var panelContent = document.getElementById("panelContent");
    var panelPhoto = document.getElementById("panelPhoto");
    var img = panelPhoto.querySelector("img");

    if (!img) return;

    panelContent.classList.remove("scrollable");
    panelPhoto.classList.remove("locked");
    img.style.removeProperty("max-height");

    requestAnimationFrame(function () {
        var minPhotoHeight = 160;

        var contentHeight = panelContent.clientHeight;
        var usedHeight = 0;

        var gap = 14;
        var visibleChildren = Array.from(panelContent.children).filter(function (child) {
            return child !== panelPhoto &&
                child.id !== "moreContent" &&
                getComputedStyle(child).display !== "none";
        });

        visibleChildren.forEach(function (child) {
            usedHeight += child.offsetHeight;
        });

        usedHeight += Math.max(0, visibleChildren.length) * gap;

        var reservedResultHeight = 0;

        if (isSearching) {
            reservedResultHeight += 30; // panelMethod likely one line
            reservedResultHeight += 30; // learnMore button
            reservedResultHeight += 28; // two gaps, roughly 14px each
            if ((window.innerWidth <= 768 && window.innerHeight > window.innerWidth) ||
                (window.innerHeight <= 500 && window.innerWidth > window.innerHeight)) {

                reservedResultHeight += 140; //panelMethod likely at least one more line on mobile
            }
        }

        var availablePhotoHeight = contentHeight - usedHeight - reservedResultHeight - 20;

        var hitMinPhotoHeight = false;

        if (availablePhotoHeight < minPhotoHeight) {
            availablePhotoHeight = minPhotoHeight;
            hitMinPhotoHeight = true;
        }

        lockedPhotoHeight = availablePhotoHeight;
        panelPhoto.style.setProperty("--locked-photo-height", lockedPhotoHeight + "px");

        panelPhoto.classList.add("locked");

        if (moreContentIsOpen || hitMinPhotoHeight) {
            panelContent.classList.add("scrollable");
        } else {
            panelContent.classList.remove("scrollable");
        }
    });
}

function alignToggleChevrons() {
    var toggles = [
        document.querySelector("#showToggleView .toggle-text"),
        document.querySelector("#showToggleTheme .toggle-text"),
        document.querySelector("#showToggleLanguage .toggle-text")
    ];

    toggles.forEach(function (t) { t.style.minWidth = ""; });

    var maxWidth = 0;
    toggles.forEach(function (t) {
        if (t.offsetWidth > maxWidth) maxWidth = t.offsetWidth;
    });

    toggles.forEach(function (t) {
        t.style.minWidth = maxWidth + "px";
    });
}

function updateToggles() {
    var isMobile = window.innerWidth <= 768 || window.innerHeight <= 500;

    if (!isMobile) {
        document.getElementById("toggleView").textContent = isSatellite ? translate("street") : translate("satellite");
        document.getElementById("toggleTheme").textContent = isDark ? translate("light") : translate("dark");
        document.querySelector("#showToggleLanguage .toggle-text").textContent = translate("language");
        return;
    }

    document.getElementById("toggleTheme").innerHTML = isDark ? ICONS.sun : ICONS.moon;
    document.getElementById("toggleView").innerHTML = isSatellite ? ICONS.map : ICONS.satellite;
    document.querySelector("#showToggleLanguage .toggle-text").innerHTML = ICONS.language;
}

var resizeTimeout;

window.addEventListener("resize", function () {

    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(function () {

        if (document.getElementById("resultPanel").classList.contains("open")) {

            openPanel(currentPlaceName, currentPhotoHtml, currentMethod, currentShortName, currentIsAI);

            setTimeout(function () {
                lockPanelPhotoSize(true);
                balanceGeoInfoLayout();

                if (moreContentIsOpen) {
                    document.getElementById("panelContent").classList.add("scrollable");
                }
            }, 80);

        }

        else if (document.getElementById("resultStrip").style.display === "flex") {

            if ((window.innerWidth <= 768 && window.innerHeight > window.innerWidth) ||
                (window.innerHeight <= 500 && window.innerWidth > window.innerHeight)) {

                document.getElementById("imageInputLabel").style.display = "none";

            } else {

                document.getElementById("imageInputLabel").style.display = "flex";

            }

        }

        map.invalidateSize();

    }, 150);

    updateToggles();
});



// ── PANEL CONTROLS ─────────────────────────────────────────────────
function openPanel(placeName, photoHtml, method, shortName, isAI) {

    currentPlaceName = placeName;
    currentPhotoHtml = photoHtml;
    currentMethod = method;
    currentShortName = shortName;
    currentIsAI = isAI;

    document.getElementById("panelContent").scrollTop = 0;

    if (photoMarker) photoMarker.closePopup();

    document.getElementById("panelPhoto").innerHTML = photoHtml;

    if (moreContentIsOpen && lockedPhotoHeight) {
        var img = document.querySelector("#panelPhoto img");
        if (img) {
            img.style.maxHeight = lockedPhotoHeight + "px";
            img.style.width = "100%";
            img.style.height = "auto";
            img.style.maxWidth = "100%";
            img.style.objectFit = "contain";
            img.style.display = "block";
        }
    }

    if (!isAI) {
        var sentence = translate("photoTakenIn").replace("{place}", placeName.replace(shortName, "<strong>" + shortName + "</strong>"));
        document.getElementById("panelPlaceName").innerHTML = sentence;
    } else {
        var sentence = currentSentence;
        var boldedSentence = sentence.replace(
            shortName,
            "<strong>" + shortName + "</strong>"
        );

        if (boldedSentence === sentence) {
            document.getElementById("panelPlaceName").innerHTML = "<strong>" + sentence + "</strong>";
        } else {
            document.getElementById("panelPlaceName").innerHTML = boldedSentence;
        }
    }
    document.getElementById("panelMethod").textContent = method;

    document.getElementById("resultPanel").classList.add('open');
    document.getElementById("map").classList.add('panel-open');
    document.getElementById("wrapper").classList.add('panel-open');
    document.body.classList.add("panel-open");

    document.body.classList.remove("strip-open");

    var strip = document.getElementById("resultStrip");
    if (strip.style.display === "flex") {
        strip.style.display = "none";
    }

    document.getElementById("welcome").style.display = "none";

    if ((window.innerWidth <= 768 && window.innerHeight > window.innerWidth) ||
        (window.innerHeight <= 500 && window.innerWidth > window.innerHeight)) {

        document.getElementById("imageInputLabel").style.display = "none";
        document.getElementById("imageInputLabelPanel").style.display = "flex";

    } else {

        document.getElementById("imageInputLabel").style.display = "flex";
        document.getElementById("imageInputLabelPanel").style.display = "none";

    }

    if (moreContentIsOpen) {
        document.getElementById("moreContent").classList.remove("collapsed");
        document.getElementById("panelContent").classList.add("scrollable");
        document.getElementById("learnMore").classList.add("expanded");
    } else {
        document.getElementById("moreContent").classList.add("collapsed");
        document.getElementById("panelContent").classList.remove("scrollable");
        document.getElementById("learnMore").classList.remove("expanded");
        setTimeout(lockPanelPhotoSize, 50);
    }

    setTimeout(function () {
        map.invalidateSize();
    }, 300);

    showScrollHint();
}

function closePanel() {
    map.stop();

    document.getElementById("resultPanel").classList.remove('open');
    document.getElementById("map").classList.remove('panel-open');
    document.getElementById("wrapper").classList.remove('panel-open');
    document.body.classList.remove("panel-open");

    if (photoMarker) {
        map.removeLayer(photoMarker);
        photoMarker = null;
    }

    if (locationPolygon) {
        map.removeLayer(locationPolygon);
        locationPolygon = null;
    }

    document.getElementById("imageInputLabel").style.display = "flex";
    document.getElementById("imageInputLabelPanel").style.display = "none";

    updateLocateUserButton();
    setTimeout(function () {
        map.invalidateSize();
        document.getElementById("welcome").style.display = "block";
    }, 300);

    closeMoreContent();

    currentLat = null;
    currentLng = null;
}

function getPopupPhotoHtml() {
    return currentPhotoHtml.replace(
        "<img ",
        '<img style="max-width:100%;height:auto;border-radius:4px;" '
    );
}

function minimizePanel() {
    document.getElementById("resultPanel").classList.remove('open');
    document.getElementById("map").classList.remove('panel-open');
    document.getElementById("wrapper").classList.remove('panel-open');
    document.body.classList.remove("panel-open");

    document.getElementById("resultStrip").style.display = "flex";

    document.body.classList.add("strip-open");

    if (isSearching) {
        document.getElementById("stripPlaceName").textContent = translate("searching");
    } else {
        document.getElementById("stripPlaceName").textContent = currentShortName;
    }

    setTimeout(function () {
        map.invalidateSize();
        if (photoMarker) {
            var popupWidth = Math.min(550, Math.round(window.innerWidth * 0.55));
            var miniPopup = L.popup({
                closeButton: false,
                maxWidth: popupWidth,
                closeOnClick: false,
                autoClose: false
            })
                .setContent(getPopupPhotoHtml());
            photoMarker.bindPopup(miniPopup).openPopup();
        }
    }, 300);
}

function closeStrip() {

    map.stop();

    document.getElementById("resultStrip").style.display = "none";

    if (photoMarker) {
        map.removeLayer(photoMarker);
        photoMarker = null;
    }

    if (locationPolygon) {
        map.removeLayer(locationPolygon);
        locationPolygon = null;
    }

    document.getElementById("imageInputLabel").style.display = "flex";
    document.getElementById("imageInputLabelPanel").style.display = "none";

    document.body.classList.remove("strip-open");

    document.getElementById("welcome").style.display = "block";

    closeMoreContent();

    updateLocateUserButton();

    currentLat = null;
    currentLng = null;
}

function closeMoreContent() {

    closeGeoInfo();
    closePanelWiki();

}

function closePanelWiki() {
    moreContentIsOpen = false;

    if (document.getElementById("learnMore").style.display === "inline-block" ||
        document.getElementById("learnMore").style.display === "block" ||
        document.getElementById("learnMore").style.display === "flex") {
        if (!document.getElementById("moreContent").classList.contains("collapsed")) {
            document.getElementById("moreContent").classList.add("collapsed");
            document.getElementById("learnMore").classList.remove("expanded");
        }
        document.getElementById("panelWiki").innerHTML = "";

        document.getElementById("learnMore").style.display = "none";
        document.getElementById("panelContent").classList.remove("scrollable");
    }

}

async function buildMoreInfo(aiPlace, geocodedPlace, lat, lng, aiConfidence, aiCountryCode) {

    await buildWikiExcerpt(aiPlace, geocodedPlace, lat, lng, aiConfidence, aiCountryCode);

    await buildGeoInfo(lat, lng, aiConfidence, aiCountryCode);

    var hasGeo = document.querySelectorAll("#panelGeoInfo .active").length > 0;
    var hasWiki = document.getElementById("panelWiki").innerHTML.trim().length > 0;
    document.getElementById("learnMore").style.display = (hasGeo || hasWiki) ? "flex" : "none";
}

async function buildWikiExcerpt(aiPlace, geocodedPlace, lat, lng, aiConfidence, aiCountryCode) {

    var result = null;

    if (!aiPlace) {
        var regionNames = new Intl.DisplayNames(["en"], { type: "region" });
        var countryName = aiCountryCode ? regionNames.of(aiCountryCode.toUpperCase()) : "";
        var EnGeocodedPlace = geocodedPlace.split(",")[0].trim() + ", " + countryName;
        result = await getWikiResult(EnGeocodedPlace, geocodedPlace, lat, lng, aiConfidence);

    } else {
        result = await getWikiResult(aiPlace, geocodedPlace, lat, lng, aiConfidence);
    }

    if (!result) {
        document.getElementById("panelWiki").innerHTML = "";
        return;
    }

    var text = result.extract;

    document.getElementById("panelWiki").innerHTML =
        "<strong>" + result.title + "</strong><br>" +
        text + " " +
        (result.fullurl ? '<a href="' + result.fullurl + '" target="_blank">' + READ_MORE_TRANSLATIONS[currentLang] + '</a>' : "");

}

async function getWikiResult(aiPlace, geocodedPlace, lat, lng, aiConfidence) {
    /*
    Wikipedia fallback logic
    1. Search English Wikipedia with the current query.
    2. If the query builder added a blacklisted/simplified query, it is handled as
       part of this same loop. `wikiBlacklisted` marks the index where local/geosearch
       fallbacks are allowed.
    3. If an English result is found and the UI language is not English:
       a. Try to find the translated article title in the current UI language.
       b. On the first query or the blacklisted/simplified query, also try searching
          the local-language Wikipedia using the geocoded shortName.
       c. If that fails, try local-language coordinate geosearch.
       d. If those local fallbacks fail, keep the original English result.
    4. If no English result is found:
       a. Only on the first query or the blacklisted/simplified query, try searching
          the local-language Wikipedia using the geocoded shortName.
       b. Then try local-language coordinate geosearch.
       c. If the UI language is not English, also try English coordinate geosearch,
          then translate that result if possible.
    5. If nothing works, continue to the next generated query.
    */
    wikiBlacklisted = 0;

    var queries = buildWikiFallbackQueries(aiPlace);

    var result = null;

    for (var i = 0; i < queries.length; i++) {
        result = await getWikiData(queries[i], "en", lat, lng, aiConfidence);

        if (result && currentLang != "en") {
            var translatedTitle = getWikiTitleTranslation(result);
            if (translatedTitle) {

                var translatedResult = await getWikiData(translatedTitle, currentLang, lat, lng, aiConfidence) || result;
                if (translatedResult != result) {
                    result = translatedResult;
                    break;
                }
            }

            if (i === wikiBlacklisted) {
                var enResult = result;

                result = await getWikiData(geocodedPlace, currentLang, lat, lng, aiConfidence);
                if (result) break;

                result = await wikiGeoSearch(geocodedPlace, currentLang, lat, lng, aiConfidence);
                if (result) break;

                result = enResult;
            }

        }

        if (result) break;

        if (i === wikiBlacklisted) {
            result = await getWikiData(geocodedPlace, currentLang, lat, lng, aiConfidence);
            if (result) break;

            result = await wikiGeoSearch(geocodedPlace, currentLang, lat, lng, aiConfidence);
            if (result) break;

            if (currentLang != "en") {
                result = await wikiGeoSearch(geocodedPlace, "en", lat, lng, aiConfidence);
                if (result) {
                    var geoTranslatedTitle = getWikiTitleTranslation(result);
                    if (geoTranslatedTitle) {

                        result = await getWikiData(geoTranslatedTitle, currentLang, lat, lng, aiConfidence) || result;

                    }
                }
                if (result) break;
            }
        }

    }

    return result;
}

async function wikiGeoSearch(query, language, lat, lng, aiConfidence) {
    var url =
        "https://" + language + ".wikipedia.org/w/api.php?action=query" +
        "&generator=geosearch" +
        "&ggscoord=" + encodeURIComponent(lat + "|" + lng) +
        "&ggsradius=10000" +
        "&ggslimit=20" +
        "&redirects=1" +
        "&prop=extracts|coordinates|info|langlinks|pageprops" +
        "&exintro=1" +
        "&explaintext=1" +
        "&inprop=url" +
        "&lllimit=500" +
        "&format=json" +
        "&origin=*";

    var response = await fetch(url);

    if (!response.ok) return null;

    var data = await response.json();

    var pages = Object.values((data.query && data.query.pages) || {});
    if (pages.length === 0) return null;

    return pickBestWikiResult(pages, query, lat, lng, aiConfidence);
}

async function getWikiData(query, language, lat, lng, aiConfidence) {

    var url =
        "https://" + language + ".wikipedia.org/w/api.php?action=query" +
        "&generator=search" +
        "&gsrsearch=" + encodeURIComponent(query) +
        "&gsrlimit=20" +
        "&redirects=1" +
        "&prop=extracts|coordinates|info|langlinks|pageprops" +
        "&exintro=1" +
        "&explaintext=1" +
        "&inprop=url" +
        "&lllimit=500" +
        "&format=json" +
        "&origin=*";

    var response = await fetch(url);

    if (!response.ok) return null;

    var data = await response.json();

    var pages = Object.values((data.query && data.query.pages) || {});
    if (pages.length === 0) return null;

    return pickBestWikiResult(pages, query, lat, lng, aiConfidence);
}

function pickBestWikiResult(results, query, lat, lng, aiConfidence) {
    results = results.filter(function (r) {
        return !(r.pageprops && Object.prototype.hasOwnProperty.call(r.pageprops, "disambiguation"));
    });

    results = results.filter(function (r) {
        return !isListPage(r);
    });

    var scored = results.map(function (r, index) {
        var score = wikiTitleScore(r.title || "", query);

        if (lat && lng && r.coordinates && r.coordinates[0]) {
            var dist = haversineKm(lat, lng, r.coordinates[0].lat, r.coordinates[0].lon);

            var maxDist =
                aiConfidence === "country" ? 1000 :
                    aiConfidence === "region" ? 300 :
                        aiConfidence === "city" ? 25 :
                            aiConfidence === "landmark" ? 5 :
                                1;

            if (dist < maxDist) score += 20;
            else score -= 60;
        }

        score -= index * 2;

        return {
            page: r,
            score: score,
            index: index
        };
    }).filter(function (item) {
        return item.score >= 50;
    });

    scored.sort(function (a, b) {
        return b.score - a.score || a.index - b.index;
    });

    for (var i = 0; i < scored.length; i++) {
        if (isProperNounAcrossLanguages(scored[i].page)) {
            return scored[i].page;
        }
    }

    return null;
}

function wikiTitleScore(title, query) {
    var primaryQuery = query.split(",")[0].trim();
    var primaryTokens = tokenizePlaceName(primaryQuery);
    var titleTokens = tokenizePlaceName(title);

    if (primaryTokens.length === 0 || titleTokens.length === 0) return -100;

    var hasForeignPrefix = false;
    var normalizedTitle = (title || "").toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    var firstPrimaryToken = primaryTokens[0];
    var firstTokenPos = normalizedTitle.indexOf(firstPrimaryToken);
    if (firstTokenPos > 0) {
        var prefix = normalizedTitle.substring(0, firstTokenPos);
        var prefixWords = prefix.match(/[\p{L}\p{N}]+/gu) || [];
        hasForeignPrefix = prefixWords.some(function (w) {
            return !primaryTokens.includes(w);
        });
    }

    if (containsTokens(primaryQuery, title) && containsTokens(title, primaryQuery) && !hasForeignPrefix) {
        return 100;
    }

    var containsPrimaryTokens = primaryTokens.every(function (token) {
        return titleTokens.includes(token);
    });

    if (containsPrimaryTokens) {
        var extraTitleTokens = titleTokens.filter(function (token) {
            return !primaryTokens.includes(token);
        });

        var score = 80 - extraTitleTokens.length * 15;

        if (hasForeignPrefix) score -= 35;

        return score;
    }

    return -100;
}

function isProperNounAcrossLanguages(page) {
    if (!page) return true;
    if (!page.langlinks || page.langlinks.length < 3) return true;

    var allTitles = page.langlinks.map(function (l) { return l["*"]; });
    allTitles.push(page.title);

    var totalTitles = allTitles.length;
    var requiredCount = Math.max(Math.ceil(totalTitles * 0.3), 4);

    var normalizedTitles = allTitles.map(function (title) {
        return (title || "").toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    });

    var allTokens = new Set();
    allTitles.forEach(function (title) {
        tokenizePlaceName(title).forEach(function (token) {
            allTokens.add(token);
        });
    });

    var tokens = Array.from(allTokens);

    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        var matchCount = 0;
        for (var j = 0; j < normalizedTitles.length; j++) {
            if (normalizedTitles[j].indexOf(token) !== -1) matchCount++;
        }
        if (matchCount >= requiredCount) return true;
    }

    return false;
}

function isListPage(page) {
    var title = (page.title || "").toLowerCase().trim();

    return title.startsWith("list of ") ||
        title.startsWith("lists of ");
}

function buildWikiFallbackQueries(query) {

    if (!query) return null;

    var cleaned = query.replace(/(\w+)\/(\w+)/g, "$1");
    var parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);

    var primary = parts[0] || cleaned;
    var country = parts.length > 1 ? parts[parts.length - 1] : null;
    var admin = parts.length > 2 ? parts[1] : null;

    var queries = [];

    queries.push(primary);

    var blacklistedPrimary = tokenizePlaceName(primary)
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
    if (!page || !page.langlinks) return null;

    var match = page.langlinks.find(function (link) {
        return link.lang === currentLang;
    });

    return match ? match["*"] : null;
}

function showScrollHint() {
    if (scrollHintShown) return;
    if (window.innerWidth > 768 && window.innerHeight > 500) return;

    var panelContent = document.getElementById("panelContent");
    if (panelContent.scrollHeight <= panelContent.clientHeight) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setTimeout(function () {
        panelContent.scrollTo({ top: 40, behavior: "smooth" });
    }, 400);

    setTimeout(function () {
        panelContent.scrollTo({ top: 0, behavior: "smooth" });
    }, 1000);

    scrollHintShown = true;
}

document.getElementById("panelClose").addEventListener("click", closePanel);
document.getElementById("stripClose").addEventListener("click", closeStrip);
document.getElementById("panelToggle").addEventListener("click", minimizePanel);
document.getElementById("stripToggle").addEventListener("click", function () {
    openPanel(currentPlaceName, currentPhotoHtml, currentMethod, currentShortName, currentIsAI);
});
document.getElementById("learnMore").addEventListener("click", function () {
    document.getElementById("moreContent").classList.toggle("collapsed");
    this.classList.toggle("expanded");

    moreContentIsOpen = !document.getElementById("moreContent").classList.contains("collapsed");
    var panelContent = document.getElementById("panelContent");

    setTimeout(function () {
        if (moreContentIsOpen || panelContent.scrollHeight > panelContent.clientHeight) {
            panelContent.classList.add("scrollable");
        } else {
            panelContent.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(function () {
                panelContent.classList.remove("scrollable");
            }, 300);
        }
    }, 250);

    if (moreContentIsOpen) {
        setTimeout(function () {
            document.getElementById("panelGeoInfo").scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
    }
});



// ── LOGICAL CORE ───────────────────────────────────────────────────
// aiLocator, placeMarkerFromEXIF, placeMarkerFromAI, getZoomLevel, locateImage
async function aiLocator(image) {
    var promptWithLang = languageInstructions[currentLang] + "\n\n" + AI_PROMPT;

    var imageBase64 = await new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onload = function (e) { resolve(e.target.result); };
        reader.readAsDataURL(image);
    });

    var aiResponse;

    try {
        aiResponse = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: AI_MODEL,
                max_tokens: 200,
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

    var data = await aiResponse.json();
    var raw = data.choices[0].message.content;
    var clean = raw.replace(/```json|```/g, "").trim();
    try {
        return JSON.parse(clean);
    } catch (e) {
        return {
            place: "unknown",
            confidence: "unknown",
            method: "Could not parse the AI response.",
            displaySentence: ""
        };
    }

}

async function placeMarkerFromEXIF(photoCoordinates, photoHtml) {

    var url = "https://nominatim.openstreetmap.org/reverse?lat=" +
        photoCoordinates.latitude + "&lon=" + photoCoordinates.longitude +
        "&format=json&zoom=18&addressdetails=1&accept-language=" + currentLang;

    var response = await fetch(url, {
        headers: { "User-Agent": "PhotoGeolocator/1.0" }
    });

    if (!response.ok) {
        showError(error("network"));
        return null;
    }

    var result = await response.json();

    moreContentIsOpen = false;

    var placeName = "Unknown location";
    var shortName = "Unknown location";

    if (result && result.address) {
        var address = result.address;
        var city = address.city || address.town || address.village || address.municipality || address.county || "";
        var country = address.country || "";
        shortName = city && country ? city + ", " + country : (result.display_name || "Unknown location");

        var streetName =
            address.road ||
            address.pedestrian ||
            address.footway ||
            address.path ||
            address.residential;

        var street = [address.house_number, streetName]
            .filter(Boolean)
            .join(" ");

        var prefix = street ? street + ", " : "";
        placeName = prefix + shortName;
    } else if (result && result.display_name) {
        placeName = result.display_name;
        shortName = result.display_name;
    }

    if (photoMarker) {
        map.removeLayer(photoMarker);
        photoMarker = null;
    }

    if (locationPolygon) {
        map.removeLayer(locationPolygon);
        locationPolygon = null;
    }

    var countryCode = (result.address && result.address.country_code)
        ? result.address.country_code.toUpperCase()
        : null;


    currentLat = photoCoordinates.latitude;
    currentLng = photoCoordinates.longitude;

    await buildMoreInfo(null, shortName, photoCoordinates.latitude, photoCoordinates.longitude, "city", countryCode);

    hideSearching();
    document.getElementById("panelPlaceName").classList.remove("loading");
    document.getElementById("panelSearchingGlobe").classList.remove("globe-active");
    document.getElementById("panelSearchingGlobe").style.display = "none";

    openPanel(placeName, photoHtml, translate("methodGPS"), shortName, false);

    photoMarker = L.marker([photoCoordinates.latitude, photoCoordinates.longitude], { icon: isDark && !isSatellite ? cameraIconDark : cameraIconLight }).addTo(map);

    map.flyTo([photoCoordinates.latitude, photoCoordinates.longitude], 13);

    document.getElementById("welcome").style.display = "none";

}

async function getLocationData(aiPlace, aiConfidence, aiCountryCode) {

    var queries = generateFallbackQueries(aiPlace);

    if (aiConfidence === "landmark") {
        return await getLocationDataLandmark(queries, aiCountryCode);
    }

    return await getLocationDataAreas(queries, aiConfidence, aiCountryCode);
}

async function getLocationDataLandmark(queries, aiCountryCode) {

    // Strict pass with type filter
    for (var i = 0; i < queries.length; i++) {

        if (i === 2) geocodingFellback = true;

        // Try Nominatim
        var nominatimResult = await tryNominatim(queries[i], "landmark", aiCountryCode);
        if (nominatimResult === "error") return null;
        if (nominatimResult) return nominatimResult;

        // Try OpenCage
        var openCageResult = await tryOpenCage(queries[i], "landmark", aiCountryCode);
        if (openCageResult === "error") return null;
        if (openCageResult) return openCageResult;
    }
    geocodingFellback = false;

    // Loose pass without type filter
    for (var j = 0; j < queries.length; j++) {

        if (j === 2) geocodingFellback = true;

        // Try Nominatim
        var nominatimResult = await tryNominatim(queries[j], null, aiCountryCode);
        if (nominatimResult === "error") return null;
        if (nominatimResult) return nominatimResult;

        // Try OpenCage
        var openCageResult = await tryOpenCage(queries[j], null, aiCountryCode);
        if (openCageResult === "error") return null;
        if (openCageResult) return openCageResult;
    }

    geocodingFellback = false;

    return null;

}

async function getLocationDataAreas(queries, aiConfidence, aiCountryCode) {

    // Strict Nominatim pass with type filter
    for (var i = 0; i < queries.length; i++) {

        if (i === 2) geocodingFellback = true;

        var nominatimResult = await tryNominatim(queries[i], aiConfidence, aiCountryCode);
        if (nominatimResult === "error") return null;
        if (nominatimResult) return nominatimResult;
    }
    geocodingFellback = false;

    // Strict OpenCage pass with type filter
    for (var j = 0; j < queries.length; j++) {

        if (j === 2) geocodingFellback = true;

        var openCageResult = await tryOpenCage(queries[j], aiConfidence, aiCountryCode);
        if (openCageResult === "error") return null;
        if (openCageResult) return openCageResult;
    }
    geocodingFellback = false;

    // Loose Nominatim pass without type filter
    for (var k = 0; k < queries.length; k++) {

        if (k === 2) geocodingFellback = true;

        var nominatimResult = await tryNominatim(queries[k], null, aiCountryCode);
        if (nominatimResult === "error") return null;
        if (nominatimResult) return nominatimResult;
    }
    geocodingFellback = false;

    // Loose OpenCage pass without type filter
    for (var l = 0; l < queries.length; l++) {

        if (l === 2) geocodingFellback = true;

        var openCageResult = await tryOpenCage(queries[l], null, aiCountryCode);
        if (openCageResult === "error") return null;
        if (openCageResult) return openCageResult;
    }
    geocodingFellback = false;

    return null;
}

async function tryNominatim(query, aiConfidence, aiCountryCode) {

    var url = "https://nominatim.openstreetmap.org/search?q=" +
        encodeURIComponent(query) +
        "&format=json&limit=10&polygon_geojson=1&addressdetails=1&namedetails=1&accept-language=" + currentLang;

    if (aiCountryCode) {
        url += "&countrycodes=" + aiCountryCode.toLowerCase();
    }

    var response = await fetch(url, {
        headers: { "User-Agent": "PhotoGeolocator/1.0" }
    });

    if (!response.ok) {
        showError(error("network"));
        return "error";
    }

    var results = await response.json();

    if (results.length > 0) {
        var result = pickBestNominatimResult(results, query, aiConfidence);

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

    var url = "https://api.opencagedata.com/geocode/v1/json?q=" +
        encodeURIComponent(query) +
        "&key=" + OPENCAGE_API_KEY +
        "&limit=5" +
        "&no_annotations=1" +
        "&language=en";

    if (aiCountryCode) {
        url += "&countrycode=" + aiCountryCode.toLowerCase();
    }
    var response = await fetch(url);

    if (!response.ok) {
        showError(error("network"));
        return "error";
    }

    var data = await response.json();

    if (data.status && data.status.code !== 200) {
        showError(error("network"));
        return "error";
    }

    var results = data.results || [];

    if (results.length > 0) {
        var result = pickBestOpenCageResult(results, query, aiConfidence);

        if (result) {
            var extraDataFromNominatim = (await getExtraDataFromNominatim(result, aiConfidence, aiCountryCode)) || {};
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
    var query = openCageResult.formatted;
    if (!query) return null;

    query = query
        .replace(/\b\d{4,6}(-\d{3,4})?\b/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/\s+/g, ' ')
        .trim();

    for (var i = 0; i < 2; i++) {
        if (i === 1) {
            var reduced = query.split(",")[0].trim();
            if (reduced === query) break;
            query = reduced;
        }
        var url = "https://nominatim.openstreetmap.org/search?q=" +
            encodeURIComponent(query) +
            "&format=json&limit=10&polygon_geojson=1&addressdetails=1&namedetails=1&accept-language=" + currentLang;

        if (aiCountryCode) {
            url += "&countrycodes=" + aiCountryCode.toLowerCase();
        }

        var response = await fetch(url, {
            headers: { "User-Agent": "PhotoGeolocator/1.0" }
        });
        if (!response.ok) continue;

        var results = await response.json();

        var matching = findClosestExtraResult(results, openCageResult, aiConfidence);

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

    var zoom = getZoomLevel(aiConfidence);
    var reverseUrl = "https://nominatim.openstreetmap.org/reverse?lat=" + openCageResult.geometry.lat +
        "&lon=" + openCageResult.geometry.lng + "&format=json&zoom=" + zoom +
        "&polygon_geojson=1&addressdetails=1&namedetails=1&accept-language=" + currentLang;

    var reverseResponse = await fetch(reverseUrl, {
        headers: { "User-Agent": "PhotoGeolocator/1.0" }
    });
    if (!reverseResponse.ok) return null;
    var reverseResult = await reverseResponse.json();
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

    var typeFilteredResults = results;
    var preferredTypes = getPreferredTypes(aiConfidence);

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

    var maxDist = (aiConfidence === "country") ? 1000 : (aiConfidence === "region") ? 300 : (aiConfidence === "city") ? 25 : (aiConfidence === "landmark") ? 5 : 1;

    var sorted = typeFilteredResults
        .filter(function (r) {
            if (!r.geojson || r.geojson.type === "Point") return false;

            var distR = haversineKm(parseFloat(r.lat), parseFloat(r.lon), openCageResult.geometry.lat, openCageResult.geometry.lng);
            return distR < maxDist;
        })
        .sort(function (a, b) {
            var distA = haversineKm(parseFloat(a.lat), parseFloat(a.lon), openCageResult.geometry.lat, openCageResult.geometry.lng);
            var distB = haversineKm(parseFloat(b.lat), parseFloat(b.lon), openCageResult.geometry.lat, openCageResult.geometry.lng);
            return distA - distB;
        });

    return sorted[0] || null;
}

function getZoomLevel(aiConfidence) {
    if (aiConfidence === "landmark") return 14;
    if (aiConfidence === "city") return 12;
    if (aiConfidence === "region") return 8;
    if (aiConfidence === "country") return 3;
    return 10;
}

function generateFallbackQueries(aiPlace) {
    var cleaned = aiPlace.replace(/(\w+)\/(\w+)/g, "$1");
    if (!cleaned.includes(",")) {
        cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, "$1, $1");
    }

    var parts = cleaned.split(",").map(p => p.trim());
    var queries = [cleaned];

    var blacklisted = cleaned.toLowerCase();
    STOPWORDS.forEach(function (word) {
        var regex = new RegExp("\\b" + word + "\\b", "gi");
        blacklisted = blacklisted.replace(regex, " ");
    });
    blacklisted = blacklisted.replace(/\s+/g, " ").trim();

    if (
        blacklisted &&
        blacklisted.toLowerCase() !== cleaned.toLowerCase()
    ) {
        queries.push(blacklisted);
    }

    for (var skip = 1; skip < parts.length - 1; skip++) {
        var trimmed = [parts[0]].concat(parts.slice(skip + 1));
        if (trimmed.length > 1 && trimmed.length < parts.length) {
            queries.push(trimmed.join(", "));
        }
    }

    if (parts.length > 1) {
        queries.push(parts[0]);
    }

    for (var i = 1; i < parts.length; i++) {
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

    var coords = geojson.type === "Polygon" ? geojson.coordinates[0] : geojson.coordinates[0][0];
    if (!coords || coords.length < 3) return false;

    var lats = coords.map(c => c[1]);
    var lngs = coords.map(c => c[0]);
    var latSpan = Math.max(...lats) - Math.min(...lats);
    var lngSpan = Math.max(...lngs) - Math.min(...lngs);
    var area = latSpan * lngSpan;

    return area > 0.00005;
}

function buildShortName(result) {
    var a = result.address || {};
    var n = result.namedetails || {};

    var localName =
        n["name:" + currentLang] ||
        n.name ||
        (result.display_name ? result.display_name.split(",")[0].trim() : null);

    var country = a.country;

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
    var a = result.components || {};

    var localName =
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

    var country = a.country;

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

    var preferredTypes = getPreferredTypes(aiConfidence);

    var typeFilteredResults = results;

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

    var tokenMatches = typeFilteredResults.filter(function (r) {
        var nameEn = r.namedetails && r.namedetails["name:en"];
        var localName = r.namedetails && r.namedetails.name;
        var display = r.display_name || "";
        var primaryPart = aiPlace.split(",")[0].trim();


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
    var preferredTypes = getPreferredTypes(aiConfidence);

    var typeFilteredResults = results;

    if (aiConfidence && aiConfidence !== "landmark") {
        typeFilteredResults = results.filter(function (r) {
            var type = r.components && r.components._type;
            return preferredTypes.includes(type);
        });
    } else if (aiConfidence === "landmark") {
        typeFilteredResults = results.filter(function (r) {
            var type = r.components && r.components._type;
            return !preferredTypes.includes(type);
        });
    }

    if (typeFilteredResults.length === 0) return null;

    var tokenMatches = typeFilteredResults.filter(function (r) {
        var primaryPart = aiPlace.split(",")[0].trim();
        var a = r.components || {};
        var names = [
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
    var sourceTokens = tokenizePlaceName(source);
    var targetLower = (target || "").toLowerCase()
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

    geocodingFellback = false;

    moreContentIsOpen = false;

    document.getElementById("welcome").style.display = "none";

    var aiResult = await aiLocator(image);

    if (!aiResult) return;

    var aiLocation = aiResult.place;

    if (aiLocation == "unknown") {

        hideSearching();

        document.getElementById("panelPlaceName").classList.remove("loading");
        document.getElementById("panelSearchingGlobe").classList.remove("globe-active");
        document.getElementById("panelSearchingGlobe").style.display = "none";

        if (photoMarker) {
            map.removeLayer(photoMarker);
            photoMarker = null;
        }

        if (locationPolygon) {
            map.removeLayer(locationPolygon);
            locationPolygon = null;
        }

        currentSentence = "<strong>" + translate("unknownLocation") + "</strong>";

        openPanel(
            translate("unknownLocationShort"),
            photoHtml,
            aiResult.method,
            translate("unknownLocationShort"),
            true
        );

    }

    else {

        var queryLocation = aiLocation.replace(/\bcity\b,?\s*/i, "");

        var location = await getLocationData(queryLocation, aiResult.confidence, aiResult.countryCode);

        currentLat = location.lat;
        currentLng = location.lng;

        await buildMoreInfo(aiResult.place, location.shortName, location.lat, location.lng, aiResult.confidence, aiResult.countryCode);

        hideSearching();

        document.getElementById("panelPlaceName").classList.remove("loading");
        document.getElementById("panelSearchingGlobe").classList.remove("globe-active");
        document.getElementById("panelSearchingGlobe").style.display = "none";

        if (photoMarker) {
            map.removeLayer(photoMarker);
            photoMarker = null;
        }

        if (locationPolygon) {
            map.removeLayer(locationPolygon);
            locationPolygon = null;
        }

        if (!location) {
            openPanel("Unknown location", photoHtml, aiResult.method, "Unknown location", true);
            document.getElementById("panelPlaceName").innerHTML = "<strong>" + translate("unknownLocation") + ".</strong>";
            return;
        }

        if (location.showPolygon && location.polygon) {
            locationPolygon = L.geoJSON(location.polygon, {
                style: { color: getPolygonColor(), weight: 2, fillOpacity: 0.15 }
            }).addTo(map);
        }

        currentSentence = aiResult.displaySentence;

        openPanel(location.shortName, photoHtml, aiResult.method, location.shortName, true);

        photoMarker = L.marker([location.lat, location.lng], { icon: isDark && !isSatellite ? cameraIconDark : cameraIconLight }).addTo(map);

        if (location.bounds) {
            map.flyToBounds([[location.bounds[0], location.bounds[2]], [location.bounds[1], location.bounds[3]]], {
                padding: [15, 15]
            });
        } else {
            map.flyTo([location.lat, location.lng], getZoomLevel(aiResult.confidence));
        }

        document.getElementById("welcome").style.display = "none";

    }
}

function showPanelLoading(photoHtml) {
    if (photoMarker) {
        map.removeLayer(photoMarker);
        photoMarker = null;
    }

    if (locationPolygon) {
        map.removeLayer(locationPolygon);
        locationPolygon = null;
    }

    closeMoreContent();

    document.getElementById("panelPhoto").innerHTML = photoHtml;
    document.getElementById("panelPlaceName").innerHTML = "<strong> " + translate("searching") + "</strong>";
    document.getElementById("panelPlaceName").classList.add("loading");
    document.getElementById("panelSearchingGlobe").style.display = "block";
    document.getElementById("panelSearchingGlobe").classList.add("globe-active");
    document.getElementById("panelMethod").textContent = "";

    setTimeout(function () {
        lockPanelPhotoSize(true);
    }, 50);

    var strip = document.getElementById("resultStrip");
    if (strip.style.display === "flex") {
        strip.style.display = "none";
        document.getElementById("resultPanel").classList.add('open');
        document.getElementById("map").classList.add('panel-open');
        document.getElementById("wrapper").classList.add('panel-open');
        document.body.classList.add("panel-open");
    }

    document.getElementById("welcome").style.display = "none";

    if (window.innerWidth <= 768 && window.innerHeight > window.innerWidth) {

        document.getElementById("imageInputLabel").style.display = "none";
        document.getElementById("imageInputLabelPanel").style.display = "flex";

    } else {

        document.getElementById("imageInputLabel").style.display = "flex";
        document.getElementById("imageInputLabelPanel").style.display = "none";

    }

    setTimeout(function () { map.invalidateSize(); }, 300);
}

async function rerunSearch() {
    if (!currentImageFile) return;

    showPanelLoading(currentPhotoHtml);
    isSearching = true;
    scrollHintShown = false;

    var photoLatLng = await exifr.gps(currentImageFile);

    if (photoLatLng && photoLatLng.latitude && photoLatLng.longitude) {
        await placeMarkerFromEXIF(photoLatLng, currentPhotoHtml);
    } else {
        await placeMarkerFromAI(currentImageFile, currentPhotoHtml);
    }

    hideSearching();
}

async function locateImage(input) {

    var image = input.files[0];

    var allowedTypes = ["image/jpeg", "image/png"];

    if (!image) return;

    if (!allowedTypes.includes(image.type)) {
        showError(error("file"));
        input.value = "";
        return;
    }

    scrollHintShown = false;

    currentImageFile = image;

    var photoImgSrc = URL.createObjectURL(image);
    var photoImgHtml = '<img src="' + photoImgSrc + '" style="border-radius:4px;margin-top:6px;">';
    currentPhotoHtml = photoImgHtml;

    var panelOpen = document.getElementById("resultPanel").classList.contains("open");
    var stripOpen = document.getElementById("resultStrip").style.display === "flex";
    if (panelOpen || stripOpen) {
        isSearching = true;
        showPanelLoading(photoImgHtml);
    } else showSearching();

    var photoLatLng = await exifr.gps(image);

    if (photoLatLng && photoLatLng.latitude && photoLatLng.longitude) {

        await placeMarkerFromEXIF(photoLatLng, photoImgHtml);

    }

    else {

        await placeMarkerFromAI(image, photoImgHtml);

    }
    hasUploadedFirstPhoto = true;
    updateLocateUserButton();
    input.value = "";
}

if (isDark) {
    toDarkTheme();
    if (!isSatellite) {
        map.removeLayer(streetLayerLight);
        streetLayerDark.addTo(map);
    }
}

if (isSatellite) {
    map.removeLayer(streetLayerLight);
    satelliteLayer.addTo(map);
}
updateToggles();



// ── FINAL EVENT LISTENER ───────────────────────────────────────────
// Triggers the search
document.getElementById("imageInput").addEventListener("change", function (e) { locateImage(e.target) });
