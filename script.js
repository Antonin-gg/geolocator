// ── CONSTANTS & CONFIG ─────────────────────────────────────────────
var WORKER_URL = "https://geolocator-ai.guyette-anto.workers.dev";
var AI_MODEL = "gpt-4o";
var AI_PROMPT = "Look at this image and identify where in the world it was taken.\n\nLANGUAGE — CRITICAL: All user-facing text fields (method, displaySentence) MUST be written in the language specified in the system instructions appended to this prompt. Only the \"place\" field stays in English (it is used for geocoding lookups, not displayed to the user). If you are uncertain which language to use, default to English. Never mix languages within a single response.\n\nRespond with ONLY a JSON object in this exact format, nothing else:\n{\n  \"place\": \"the most specific location name you can identify, ALWAYS in English for geocoding\",\n  \"confidence\": \"landmark\" | \"area\" | \"city\" | \"region\" | \"country\" | \"unknown\",\n  \"method\": \"a single short sentence explaining the key visual evidence used to identify this location, written in the user's language\",\n  \"displaySentence\": \"a complete, grammatically natural sentence in the user's language announcing where the photo was taken, with the place name written naturally in that language and woven into the sentence. Empty string if confidence is unknown.\"\n}\n\nABSOLUTE RULE — check this first before anything else: If the image is not a real photograph taken by a camera in the real world — this includes cartoons, illustrations, paintings, drawings, sketches, AI-generated images, screenshots of apps or websites, social media posts, food delivery or e-commerce interfaces, video game captures, memes, or any digital interface with visible UI elements — you MUST set confidence to \"unknown\", place to \"unknown\", method to \"This image is not a real photograph.\" (translated to the user's language), and displaySentence to an empty string. This rule cannot be overridden by any other consideration. Text mentioning a city or country inside an app or website does not mean the image was captured there.\n\nEvidence rules — apply before identifying any location:\n- Prioritize unique, explicit, low-frequency clues: flags, language, script, signage, road markings, architecture, culturally specific objects.\n- License plates indicate where a vehicle is registered, not necessarily where the photo was taken. Treat them as supporting evidence only, never as the sole basis for a location. A foreign-registered vehicle in a scene with local signage means the photo was taken in the country shown by the signage.\n- Treat terrain and landscape as WEAK evidence unless combined with unique identifiers.\n- Mountain ranges, arid landscapes, forests, coastlines, and generic rural or urban scenes are NOT sufficient evidence on their own — return \"unknown\" unless a distinctive non-landscape clue is present.\n- Generic modern architecture (glass facades, clean lines, light wood interiors, minimalist design, contemporary airports, shopping centers, office buildings) is NOT sufficient evidence on its own. These styles are global. Return \"unknown\" for modern buildings unless distinctive non-architectural clues are present (visible signage in a specific language, flags, named branding, identifiable surroundings).\n- Partial views of buildings (close-ups, sections, interiors without clear identifying features) cannot be confidently identified unless they contain a recognisable named element. A glass wall, a staircase, a generic interior — these are not identifiable. Return \"unknown\".\n- Do NOT rely on visual similarity or vibe. Avoid bias toward overrepresented regions (USA, Western Europe) without explicit evidence.\n- Spanish-speaking countries can be confused easily: Spain, Mexico, Argentina, Colombia and others share language and some architectural styles. Look for distinguishing details — license plates, flags, peninsular vs Latin American architecture, regional vegetation, or text using country-specific vocabulary.\n- If a rare or region-specific clue is present, it overrides generic landscape similarity.\n- Before deciding, internally test whether any visible detail contradicts your candidate location. If it does, eliminate it.\n- If multiple locations remain plausible after elimination, return \"unknown\".\n\nFormatting rules (for the English \"place\" field):\n- Always separate parts of a location with commas. Never join two place names with just a space. Correct: \"Luxembourg, Luxembourg\", \"Mexico City, Mexico\", \"Panama City, Panama\". Incorrect: \"Luxembourg Luxembourg\", \"Mexico Mexico\".\n- Use commas to separate the place from its region or country in every confidence level.\n\nIdentification rules (for the English \"place\" field):\n- Use \"landmark\" only for a specific, unmistakable real-world landmark. Include full name, city and country (e.g. \"Eiffel Tower, Paris, France\").\n- Use \"area\" only for a specific town, village or neighbourhood with high certainty. Include region and country to avoid ambiguity (e.g. \"Reine, Nordland, Norway\" or \"Tabatinga, Amazonas, Brazil\").\n- Use \"city\" only for a major, internationally recognisable city with very high certainty. Refer to the city specifically, not its state or region (e.g. \"Rio de Janeiro city, Brazil\"). Include state if the name is ambiguous (e.g. \"Portland, Oregon, USA\"). When the city and country share a name, format with a comma between them (e.g. \"Luxembourg, Luxembourg\", \"Singapore, Singapore\", \"Monaco, Monaco\").\n- Use \"region\" if you can identify a specific state, province, region, country subdivision, or recognised natural region (like Patagonia, Tuscany, Bavaria, Provence, Cornwall, the Sahara) with high certainty, but cannot pinpoint a specific city or town.\n- Use \"country\" only if the country is identifiable with high certainty but nothing more specific.\n- Use \"unknown\" if: evidence is weak or generic, multiple locations remain plausible, or any visible detail is inconsistent with the chosen answer.\n- For locations that span multiple countries (waterfalls, mountains, lakes on borders): pick ONE country to anchor the location — the most photographed side or the side most visible in the image — rather than listing both. E.g. \"Iguazu Falls, Paraná, Brazil\" or \"Iguazu Falls, Misiones, Argentina\" — never \"Iguazu Falls, Argentina/Brazil\". The same applies to any cross-border feature.\n\nMethod rules:\n- The method must be a single concise sentence describing the most decisive visual evidence used to identify the location, in the user's language.\n- Be specific about what was recognised: the landmark name, the language on signage, the type of architecture, a national flag, distinctive vegetation, etc.\n- Examples (shown in English but should be written in the user's language):\n  - \"The building in the image was identified as Berliner Dom.\"\n  - \"Arabic script on the storefronts and the surrounding architecture indicate a certain Gulf country.\"\n  - \"The dramatic basalt sea stacks and turf-roofed houses are characteristic of the Faroe Islands.\"\n  - \"Road signage in Portuguese combined with the tropical urban landscape points to Brazil.\"\n- If confidence is \"unknown\", set method to a single sentence in the user's language explaining why the location could not be determined.\n\ndisplaySentence rules:\n- The displaySentence must be a complete, grammatically natural sentence in the user's language announcing where the photo was taken. It is shown directly to the user.\n- Write the place name naturally in the user's language inside the sentence: translate country names, region names, and well-known city names; keep proper nouns (specific landmark names, small place names) in their original form when no translation exists.\n- Weave the place name into the sentence according to the grammar of the user's language. Different languages place prepositions, particles, and word order differently — write whatever sounds natural.\n- Examples for the location \"Berliner Dom, Berlin, Germany\":\n  - English: \"This photo was taken at Berliner Dom in Berlin, Germany.\"\n  - French: \"Cette photo a été prise à la Cathédrale de Berlin, à Berlin, en Allemagne.\"\n  - Spanish: \"Esta foto fue tomada en la Catedral de Berlín, en Berlín, Alemania.\"\n  - German: \"Dieses Foto wurde am Berliner Dom in Berlin, Deutschland aufgenommen.\"\n  - Japanese: \"この写真はドイツのベルリンにあるベルリン大聖堂で撮影されました。\"\n  - Arabic: \"تم التقاط هذه الصورة عند كاتدرائية برلين في برلين، ألمانيا.\"\n  - Chinese: \"这张照片拍摄于德国柏林的柏林大教堂。\"\n- If confidence is \"unknown\", set displaySentence to an empty string \"\".\n\nFinal check — MANDATORY before returning your answer:\n- Ask internally: is this a real photograph? If not, return \"unknown\" and set displaySentence to \"\".\n- Ask: what is the strongest piece of evidence, and does it uniquely support this location?\n- If the answer depends mainly on generic features, or if any alternative location is plausible, return \"unknown\".\n- Verify that method and displaySentence are in the user's specified language. Do not mix languages.\n\nNEVER GUESS. A wrong answer is worse than no answer.\n\nReturn ONLY the JSON object, no explanation, no markdown.";



// ── STATE ──────────────────────────────────────────────────────────
var isSatellite = false;
var isDark = false;
var photoMarker;
var currentPlaceName = null;
var currentSentence = null;
var currentPhotoHtml = null;
var currentMethod = null;
var currentShortName = null;
var currentIsAI = false;
var locationPolygon = null;
var currentLang = "en";



// ── PLATFORM DETECTION ─────────────────────────────────────────────
var isAndroid = /Android/i.test(navigator.userAgent);
var isFirefox = /Firefox/i.test(navigator.userAgent);



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

if (/SamsungBrowser/.test(navigator.userAgent)) {
    document.getElementById("welcome").textContent = "Welcome! Upload a photo to identify where it was taken. ⚠️ Please open this page in Chrome for full functionality.";
} else if (isAndroid && isFirefox) {
    document.getElementById("welcome").textContent = "Welcome! Upload a photo to identify where it was taken. ⚠️ Firefox on Android doesn't support location data. Try Chrome or desktop for best results.";
} else {
    document.getElementById("welcome").textContent = translate("welcome");
}
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

    document.getElementById("resultPanel").style.background = "rgba(255, 255, 255, 0.95)";
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
        setToggleArrow(document.getElementById("showToggleView"), false);
        document.getElementById("showToggleView").classList.remove("dropdown-open");
    }
    if (!document.getElementById("languageOptions").classList.contains("hidden-language")) {
        document.getElementById("languageOptions").classList.add("hidden-language");
        setToggleArrow(document.getElementById("showToggleLanguage"), false);
        document.getElementById("showToggleLanguage").classList.remove("dropdown-open");
    }

    document.getElementById("toggleTheme").classList.toggle("hidden-theme");
    var isOpen = !document.getElementById("toggleTheme").classList.contains("hidden-theme");
    this.classList.toggle("dropdown-open", isOpen);
    var expanded = this.textContent.trim().endsWith("▼");
    setToggleArrow(this, expanded);
});

document.getElementById("toggleTheme").addEventListener("click", function () {
    if (isDark) {
        toLightTheme();
        this.textContent = translate("dark");
        isDark = false;
        if (!isSatellite) {
            map.removeLayer(streetLayerDark);
            streetLayerLight.addTo(map);
        }
    } else {
        toDarkTheme();
        this.textContent = translate("light");
        isDark = true;
        if (!isSatellite) {
            map.removeLayer(streetLayerLight);
            streetLayerDark.addTo(map);
        }
    }

    if (locationPolygon) {
        locationPolygon.setStyle({ color: getPolygonColor() });
    }

    this.classList.toggle("hidden-theme");
    setToggleArrow(document.getElementById("showToggleTheme"), false);
    document.getElementById("showToggleTheme").classList.remove("dropdown-open");

    localStorage.setItem("isDark", isDark);
});

document.getElementById("showToggleView").addEventListener("click", function () {
    if (!document.getElementById("toggleTheme").classList.contains("hidden-theme")) {
        document.getElementById("toggleTheme").classList.add("hidden-theme");
        setToggleArrow(document.getElementById("showToggleTheme"), false);
        document.getElementById("showToggleTheme").classList.remove("dropdown-open");
    }
    if (!document.getElementById("languageOptions").classList.contains("hidden-language")) {
        document.getElementById("languageOptions").classList.add("hidden-language");
        setToggleArrow(document.getElementById("showToggleLanguage"), false);
        document.getElementById("showToggleLanguage").classList.remove("dropdown-open");
    }

    document.getElementById("toggleView").classList.toggle("hidden-view");
    var isOpen = !document.getElementById("toggleView").classList.contains("hidden-view");
    this.classList.toggle("dropdown-open", isOpen);
    var expanded = this.textContent.trim().endsWith("▼");
    setToggleArrow(this, expanded);
});

document.getElementById("toggleView").addEventListener("click", function () {

    if (!document.getElementById("toggleTheme").classList.contains("hidden-theme")) {
        document.getElementById("toggleTheme").classList.add("hidden-theme");
        setToggleArrow(document.getElementById("showToggleTheme"), false);
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
        this.textContent = translate("satellite");
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
        this.textContent = translate("street");
        isSatellite = true;
    }

    if (locationPolygon) {
        locationPolygon.setStyle({ color: getPolygonColor() });
    }

    this.classList.toggle("hidden-view");
    setToggleArrow(document.getElementById("showToggleView"), false);
    document.getElementById("showToggleView").classList.remove("dropdown-open");

    localStorage.setItem("isSatellite", isSatellite);
});

document.getElementById("showToggleLanguage").addEventListener("click", function () {
    if (!document.getElementById("toggleTheme").classList.contains("hidden-theme")) {
        document.getElementById("toggleTheme").classList.add("hidden-theme");
        setToggleArrow(document.getElementById("showToggleTheme"), false);
        document.getElementById("showToggleTheme").classList.remove("dropdown-open");
    }
    if (!document.getElementById("toggleView").classList.contains("hidden-view")) {
        document.getElementById("toggleView").classList.add("hidden-view");
        setToggleArrow(document.getElementById("showToggleView"), false);
        document.getElementById("showToggleView").classList.remove("dropdown-open");
    }

    document.getElementById("languageOptions").classList.toggle("hidden-language");
    var isOpen = !document.getElementById("languageOptions").classList.contains("hidden-language");
    if (isOpen) {
        document.getElementById("languageOptions").scrollTop = 0;
    }
    this.classList.toggle("dropdown-open", isOpen);
    var expanded = this.textContent.trim().endsWith("▼");
    setToggleArrow(this, expanded);
});

document.querySelectorAll(".lang-option").forEach(function (button) {

    button.addEventListener("click", function () {

        if (!document.getElementById("languageOptions").classList.contains("hidden-language")) {
            document.getElementById("languageOptions").classList.add("hidden-language");
            setToggleArrow(document.getElementById("showToggleLanguage"), false);
        }

        document.querySelector('[data-lang="' + currentLang + '"]').classList.remove("active-lang");

        currentLang = this.getAttribute("data-lang");

        changeLanguage();

        document.getElementById("languageOptions").classList.add("hidden-language");
        setToggleArrow(document.getElementById("showToggleLanguage"), false);
        document.getElementById("showToggleLanguage").classList.remove("dropdown-open");

        document.querySelector('[data-lang="' + currentLang + '"]').classList.add("active-lang");

        localStorage.setItem("currentLang", currentLang);
    });

});

function setToggleArrow(element, expanded) {
    var text = element.textContent.slice(0, -1).trim();
    element.textContent = text + (expanded ? " ▲" : " ▼");
}

map.on("click", function () {
    if (!document.getElementById("toggleView").classList.contains("hidden-view")) {
        document.getElementById("toggleView").classList.add("hidden-view");
        setToggleArrow(document.getElementById("showToggleView"), false);
        document.getElementById("showToggleView").classList.remove("dropdown-open");
    }
    if (!document.getElementById("toggleTheme").classList.contains("hidden-theme")) {
        document.getElementById("toggleTheme").classList.add("hidden-theme");
        setToggleArrow(document.getElementById("showToggleTheme"), false);
        document.getElementById("showToggleTheme").classList.remove("dropdown-open");
    }
    if (!document.getElementById("languageOptions").classList.contains("hidden-language")) {
        document.getElementById("languageOptions").classList.add("hidden-language");
        setToggleArrow(document.getElementById("showToggleLanguage"), false);
        document.getElementById("showToggleLanguage").classList.remove("dropdown-open");
    }
});



// ── UI HELPERS ─────────────────────────────────────────────────────
// showSearching, hideSearching, showError, onCloseClick
function showSearching() {

    if (window.innerWidth <= 768 &&
        document.getElementById("resultPanel").classList.contains("open")) {

        document.getElementById("imageInputLabelPanel").style.display = "none";

        document.getElementById("panelSearching").style.display = "block";

        document.getElementById("panelSearching")
            .classList.add("searching-active");

        document.getElementById("panelSearchingGlobe")
            .classList.add("globe-active");

    } else {

        document.getElementById("panelSearching").style.display = "none";

        document.getElementById("searching").style.display = "block";

        document.getElementById("searching")
            .classList.add("searching-active");

        document.getElementById("searchingGlobe")
            .classList.add("globe-active");
    }
}

function hideSearching() {

    document.getElementById("searching").style.display = "none";
    document.getElementById("searching")
        .classList.remove("searching-active");

    document.getElementById("searchingGlobe")
        .classList.remove("globe-active");

    document.getElementById("panelSearching").style.display = "none";

    document.getElementById("panelSearchingGlobe")
        .classList.remove("globe-active");

    if (
        window.innerWidth <= 768 &&
        document.getElementById("resultPanel").classList.contains("open")
    ) {
        document.getElementById("imageInputLabelPanel").style.display = "flex";
    }
}

function showError(message) {
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

var resizeTimeout;

window.addEventListener("resize", function () {

    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(function () {

        if (document.getElementById("resultPanel").classList.contains("open")) {

            openPanel(currentPlaceName, currentPhotoHtml, currentMethod, currentShortName, currentIsAI);
            if (
                document.getElementById("searching").classList.contains("searching-active") ||
                document.getElementById("panelSearching").classList.contains("searching-active")
            ) {

                hideSearching();
                showSearching();

            }

        }

        else if (document.getElementById("resultStrip").style.display === "flex") {

            if (window.innerWidth <= 768 &&
                window.innerHeight > window.innerWidth) {

                document.getElementById("imageInputLabel").style.display = "none";

            } else {

                document.getElementById("imageInputLabel").style.display = "flex";

            }

        }

        map.invalidateSize();

    }, 150);

});



// ── PANEL CONTROLS ─────────────────────────────────────────────────
function openPanel(placeName, photoHtml, method, shortName, isAI) {

    currentPlaceName = placeName;
    currentPhotoHtml = photoHtml;
    currentMethod = method;
    currentShortName = shortName;
    currentIsAI = isAI;

    if (photoMarker) photoMarker.closePopup();

    document.getElementById("panelPhoto").innerHTML = photoHtml;
    if (!isAI) {
        document.getElementById("panelPlaceName").innerHTML = translate("photoTakenIn") + " " + placeName.replace(shortName, "<strong>" + shortName + "</strong>");
    } else {
        document.getElementById("panelPlaceName").innerHTML = currentSentence;

        document.getElementById("panelPlaceName").innerHTML = currentSentence.replace(
            location.shortName,
            "<strong>" + location.shortName + "</strong>"
        );
    }
    document.getElementById("panelMethod").textContent = method;
    document.getElementById("resultPanel").classList.add('open');
    document.getElementById("map").classList.add('panel-open');
    document.getElementById("wrapper").classList.add('panel-open');

    var strip = document.getElementById("resultStrip");
    if (strip.style.display === "flex") {
        strip.style.display = "none";
    }

    document.getElementById("welcome").style.display = "none";

    if (window.innerWidth <= 768 && window.innerHeight > window.innerWidth) {

        document.getElementById("imageInputLabel").style.display = "none";
        document.getElementById("imageInputLabelPanel").style.display = "flex";

    } else {

        document.getElementById("imageInputLabel").style.display = "flex";
        document.getElementById("imageInputLabelPanel").style.display = "none";

    }

    setTimeout(function () {
        map.invalidateSize();
    }, 300);
}

function closePanel() {
    document.getElementById("resultPanel").classList.remove('open');
    document.getElementById("map").classList.remove('panel-open');
    document.getElementById("wrapper").classList.remove('panel-open');

    if (photoMarker) {
        map.removeLayer(photoMarker);
        photoMarker = null;
    }

    if (locationPolygon) {
        map.removeLayer(locationPolygon);
        locationPolygon = null;
    }

    if (window.innerWidth <= 768 && window.innerHeight > window.innerWidth) {
        document.getElementById("imageInputLabel").style.display = "flex";
        document.getElementById("imageInputLabelPanel").style.display = "none";
    }

    setTimeout(function () {
        map.invalidateSize();
        document.getElementById("welcome").style.display = "block";
    }, 300);
}

function minimizePanel() {
    document.getElementById("resultPanel").classList.remove('open');
    document.getElementById("map").classList.remove('panel-open');
    document.getElementById("wrapper").classList.remove('panel-open');

    document.getElementById("resultStrip").style.display = "flex";
    document.getElementById("stripPlaceName").textContent = currentShortName;
    setTimeout(function () {
        map.invalidateSize();
        if (photoMarker) {
            var popupWidth = Math.round(window.innerWidth * 0.35);
            var miniPopup = L.popup({ closeButton: false, maxWidth: popupWidth })
                .setContent(currentPhotoHtml);
            photoMarker.bindPopup(miniPopup).openPopup();
        }
    }, 300);
}

function closeStrip() {
    document.getElementById("resultStrip").style.display = "none";

    if (photoMarker) {
        map.removeLayer(photoMarker);
        photoMarker = null;
    }

    if (locationPolygon) {
        map.removeLayer(locationPolygon);
        locationPolygon = null;
    }

    if (window.innerWidth <= 768 && window.innerHeight > window.innerWidth) {
        document.getElementById("imageInputLabel").style.display = "flex";
        document.getElementById("imageInputLabelPanel").style.display = "none";
    }

    document.getElementById("welcome").style.display = "block";
}

document.getElementById("panelClose").addEventListener("click", closePanel);
document.getElementById("stripClose").addEventListener("click", closeStrip);
document.getElementById("panelToggle").addEventListener("click", minimizePanel);
document.getElementById("stripToggle").addEventListener("click", function () {
    openPanel(currentPlaceName, currentPhotoHtml, currentMethod, currentShortName, currentIsAI);
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

    var aiResponse = await fetch(WORKER_URL, {
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
                    {
                        type: "text",
                        text: promptWithLang
                    },
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
        "&format=json&zoom=14&addressdetails=1&accept-language=" + currentLang;

    var result = await fetch(url, {
        headers: { "User-Agent": "PhotoGeolocator/1.0" }
    }).then(r => r.json());

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

    openPanel(placeName, photoHtml, translate("methodGPS"), shortName, false);
    photoMarker = L.marker([photoCoordinates.latitude, photoCoordinates.longitude], { icon: isDark && !isSatellite ? cameraIconDark : cameraIconLight }).addTo(map);

    map.flyTo([photoCoordinates.latitude, photoCoordinates.longitude], 13);

    document.getElementById("welcome").style.display = "none";

}

async function getLocationData(aiPlace, aiConfidence) {

    var queries = generateFallbackQueries(aiPlace);

    for (var i = 0; i < queries.length; i++) {
        var url = "https://nominatim.openstreetmap.org/search?q=" +
            encodeURIComponent(queries[i]) +
            "&format=json&limit=5&polygon_geojson=1&addressdetails=1&accept-language=" + currentLang;

        var results = await fetch(url, {
            headers: { "User-Agent": "PhotoGeolocator/1.0" }
        }).then(r => r.json());

        if (results.length > 0) {
            var result = pickBestResult(results, queries[i], aiConfidence);

            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                bounds: result.boundingbox,
                polygon: result.geojson,
                displayName: queries[i],
                shortName: buildShortName(result),
                showPolygon: showPolygon(aiConfidence, result.geojson)
            };
        }
    }

    return null;
}

function generateFallbackQueries(aiPlace) {
    var cleaned = aiPlace.replace(/(\w+)\/(\w+)/g, "$1");
    if (!cleaned.includes(",")) {
        cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, "$1, $1");
    }

    var parts = cleaned.split(",").map(p => p.trim());
    var queries = [cleaned];

    for (var skip = 1; skip < parts.length - 1; skip++) {
        var trimmed = [parts[0]].concat(parts.slice(skip + 1));
        if (trimmed.length > 1 && trimmed.length < parts.length) {
            queries.push(trimmed.join(", "));
        }
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
    if (confidence === "area") return true;
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

    var city =
        a.city ||
        a.town ||
        a.village ||
        a.municipality ||
        a.county ||
        a.state;

    var country = a.country;

    if (city && country) {
        return city + ", " + country;
    }

    return result.display_name;
}

function pickBestResult(results, aiPlace, aiConfidence) {
    var aiPlaceLower = aiPlace.toLowerCase();
    var primaryPart = aiPlace.split(",")[0].trim().toLowerCase();

    var fullNameMatches = results.filter(function (r) {
        return r.display_name.toLowerCase().includes(aiPlaceLower);
    });

    var matches = fullNameMatches.length > 0
        ? fullNameMatches
        : results.filter(function (r) {
            return r.display_name.toLowerCase().includes(primaryPart);
        });

    if (aiConfidence === "country" || aiConfidence === "region") {
        var preferredTypes = getPreferredTypes(aiConfidence);
        var typeFiltered = matches.filter(function (r) {
            return preferredTypes.includes(r.type) || preferredTypes.includes(r.addresstype);
        });
        if (typeFiltered.length > 0) matches = typeFiltered;
    }

    if ((aiConfidence === "city" || aiConfidence === "area") && matches.length > 1) {
        var cityTypes = ["city", "town", "village", "municipality", "suburb", "neighbourhood"];
        var cityFiltered = matches.filter(function (r) {
            return cityTypes.includes(r.type) || cityTypes.includes(r.addresstype);
        });
        if (cityFiltered.length > 0) matches = cityFiltered;
    }

    if (matches.length > 0) {
        matches.sort(function (a, b) {
            return (b.importance || 0) - (a.importance || 0);
        });
        return matches[0];
    }

    return results[0];
}

function getPreferredTypes(confidence) {
    if (confidence === "country") return ["country"];
    if (confidence === "region") return [
        "state",
        "administrative",
        "region",
        "province",
        "county",
        "state_district",
        "district"
    ];
    return [];
}

async function placeMarkerFromAI(image, photoHtml) {

    showSearching();

    document.getElementById("welcome").style.display = "none";

    var aiResult = await aiLocator(image);

    var aiLocation = aiResult.place;

    if (aiLocation == "unknown") {

        hideSearching();

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
            "Unknown location",
            photoHtml,
            aiResult.method,
            "Unknown location",
            true
        );

    }

    else {

        var queryLocation = aiLocation.replace(/\bcity\b,?\s*/i, "");

        var location = await getLocationData(queryLocation, aiResult.confidence);

        hideSearching();

        if (photoMarker) {
            map.removeLayer(photoMarker);
            photoMarker = null;
        }

        if (locationPolygon) {
            map.removeLayer(locationPolygon);
            locationPolygon = null;
        }

        if (!location) {
            openPanel("Unknown location", photoHtml, aiResult.method, "Unknown location");
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

        map.flyToBounds([[location.bounds[0], location.bounds[2]], [location.bounds[1], location.bounds[3]]]);

        document.getElementById("welcome").style.display = "none";

    }
}

async function locateImage(input) {

    var image = input.files[0];

    if (!image || !image.type.startsWith('image/')) {
        showError("Please upload an image file.");
        return;
    }

    var photoImgSrc = URL.createObjectURL(image);
    var photoImgHtml = '<img src="' + photoImgSrc + '" style="width:100%;border-radius:4px;margin-top:6px;">';

    var photoLatLng = await exifr.gps(image);

    if (photoLatLng && photoLatLng.latitude && photoLatLng.longitude) {

        placeMarkerFromEXIF(photoLatLng, photoImgHtml);

    }

    else {

        placeMarkerFromAI(image, photoImgHtml);

    }
}

if (isDark) {
    toDarkTheme();
}

if (isSatellite) {
    if (isDark) map.removeLayer(streetLayerDark);
    else map.removeLayer(streetLayerLight);
    satelliteLayer.addTo(map);
    document.getElementById("toggleView").textContent = translate("street");
}



// ── FINAL EVENT LISTENER ───────────────────────────────────────────
// Triggers the search
document.getElementById("imageInput").addEventListener("change", function (e) { locateImage(e.target) });
