// ── CONSTANTS & CONFIG ─────────────────────────────────────────────
var OPENCAGE_KEY = "49b47c25108242779832267ff8062473";
var OPENCAGE_URL = "https://api.opencagedata.com/geocode/v1/json?q=";
var WORKER_URL = "https://geolocator-ai.guyette-anto.workers.dev";
var AI_MODEL = "gpt-4o";
var AI_PROMPT = "Look at this image and identify where in the world it was taken.\n\nRespond with ONLY a JSON object in this exact format, nothing else:\n{\n  \"place\": \"the most specific location name you can identify\",\n  \"confidence\": \"landmark\" | \"area\" | \"city\" | \"country\" | \"unknown\",\n  \"method\": \"a single short sentence explaining the key visual evidence used to identify this location\"\n}\n\nABSOLUTE RULE — check this first before anything else: If the image is not a real photograph taken by a camera in the real world — this includes cartoons, illustrations, paintings, drawings, sketches, AI-generated images, screenshots, or any non-photographic image — you MUST set confidence to \"unknown\", place to \"unknown\", and method to \"This image is not a real photograph.\" This rule cannot be overridden by any other consideration.\n\nEvidence rules — apply before identifying any location:\n- Prioritize unique, explicit, low-frequency clues: flags, language, script, signage, license plates, road markings, architecture, culturally specific objects.\n- Treat terrain and landscape as WEAK evidence unless combined with unique identifiers.\n- Mountain ranges, arid landscapes, forests, coastlines, and generic rural or urban scenes are NOT sufficient evidence on their own — return \"unknown\" unless a distinctive non-landscape clue is present.\n- Do NOT rely on visual similarity or vibe. Avoid bias toward overrepresented regions (USA, Western Europe) without explicit evidence.\n- If a rare or region-specific clue is present, it overrides generic landscape similarity.\n- Before deciding, internally test whether any visible detail contradicts your candidate location. If it does, eliminate it.\n- If multiple locations remain plausible after elimination, return \"unknown\".\n\nIdentification rules:\n- Use \"landmark\" only for a specific, unmistakable real-world landmark. Include full name, city and country (e.g. \"Eiffel Tower, Paris, France\").\n- Use \"area\" only for a specific town, village or neighbourhood with high certainty. Include region and country to avoid ambiguity (e.g. \"Reine, Nordland, Norway\" or \"Tabatinga, Amazonas, Brazil\").\n- Use \"city\" only for a major, internationally recognisable city with very high certainty. Refer to the city specifically, not its state or region (e.g. \"Rio de Janeiro city, Brazil\"). Include state if the name is ambiguous (e.g. \"Portland, Oregon, USA\").\n- Use \"country\" only if the country is identifiable with high certainty but nothing more specific.\n- Use \"unknown\" if: evidence is weak or generic, multiple locations remain plausible, or any visible detail is inconsistent with the chosen answer.\n\nMethod rules:\n- The method must be a single concise sentence describing the most decisive visual evidence used to identify the location.\n- Be specific about what was recognised: the landmark name, the language on signage, the type of architecture, a national flag, distinctive vegetation, etc.\n- Examples of good method sentences:\n  - \"The building in the image was identified as Berliner Dom.\"\n  - \"Arabic script on the storefronts and the surrounding architecture indicate a certain Gulf country.\"\n  - \"The dramatic basalt sea stacks and turf-roofed houses are characteristic of the Faroe Islands.\"\n  - \"License plates and road signage in Portuguese, combined with the tropical urban landscape, point to Brazil.\"\n- If confidence is \"unknown\", set method to a single sentence explaining why the location could not be determined (e.g. \"The image shows a generic mountain landscape with no distinctive identifying features.\").\n\nFinal check — MANDATORY before returning your answer:\n- Ask internally: what is the strongest piece of evidence, and does it uniquely support this location?\n- If the answer depends mainly on generic features, or if any alternative location is plausible, return \"unknown\".\n\nNEVER GUESS. A wrong answer is worse than no answer.\n\nReturn ONLY the JSON object, no explanation, no markdown.";

// ── STATE ──────────────────────────────────────────────────────────
var isSatellite = false;
var isDark = false;
var photoMarker;
var currentPlaceName = null;
var currentPhotoHtml = null;
var currentMethod = null;
var currentShortName = null;



// ── PLATFORM DETECTION ─────────────────────────────────────────────
var isAndroid = /Android/i.test(navigator.userAgent);
var isFirefox = /Firefox/i.test(navigator.userAgent);



// ── MAP & INITIAL SETUP ────────────────────────────────────────────
// L.map, tile layers, icons, attribution
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
    document.getElementById("welcome").textContent = "Welcome! Upload a photo to identify where it was taken.";
}
var fileInput = document.getElementById('imageInput');
if (/Android/i.test(navigator.userAgent)) {
    fileInput.accept = 'image/*,model/gltf+json';
} else {
    fileInput.accept = 'image/*';
}



// ── THEME & LAYER TOGGLERS───────────────────────────────────────────
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
        document.getElementById("showToggleView").textContent = "View ▼";
    }
    document.getElementById("toggleTheme").classList.toggle("hidden-theme");
    this.textContent = this.textContent === "Theme ▼" ? "Theme ▲" : "Theme ▼";
});

document.getElementById("toggleTheme").addEventListener("click", function () {
    if (isDark) {
        toLightTheme();
        this.textContent = "Dark";
        isDark = false;
        if (!isSatellite) {
            map.removeLayer(streetLayerDark);
            streetLayerLight.addTo(map);
        }
    } else {
        toDarkTheme();
        this.textContent = "Light";
        isDark = true;
        if (!isSatellite) {
            map.removeLayer(streetLayerLight);
            streetLayerDark.addTo(map);
        }
    }
    this.classList.toggle("hidden-theme");
    document.getElementById("showToggleTheme").textContent = "Theme ▼";
});

document.getElementById("showToggleView").addEventListener("click", function () {
    if (!document.getElementById("toggleTheme").classList.contains("hidden-theme")) {
        document.getElementById("toggleTheme").classList.add("hidden-theme");
        document.getElementById("showToggleTheme").textContent = "Theme ▼";
    }
    document.getElementById("toggleView").classList.toggle("hidden-view");
    this.textContent = this.textContent === "View ▼" ? "View ▲" : "View ▼";
});

document.getElementById("toggleView").addEventListener("click", function () {

    if (!document.getElementById("toggleTheme").classList.contains("hidden-theme")) {
        document.getElementById("toggleTheme").classList.add("hidden-theme");
        document.getElementById("showToggleTheme").textContent = "Theme ▼";
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
        this.textContent = "Satellite";
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
        this.textContent = "Street";
        isSatellite = true;
    }
    this.classList.toggle("hidden-view");
    document.getElementById("showToggleView").textContent = "View ▼";
});

map.on("click", function () {
    if (!document.getElementById("toggleView").classList.contains("hidden-view")) {
        document.getElementById("toggleView").classList.add("hidden-view");
        document.getElementById("showToggleView").textContent = "View ▼";
    }
    if (!document.getElementById("toggleTheme").classList.contains("hidden-theme")) {
        document.getElementById("toggleTheme").classList.add("hidden-theme");
        document.getElementById("showToggleTheme").textContent = "Theme ▼";
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

function closeResult() {
    if (photoMarker) {
        map.removeLayer(photoMarker);
        photoMarker = null;
    }
    if (document.getElementById("resultPanel").classList.contains("open")) {
        document.getElementById("resultPanel").classList.remove("open");
        document.getElementById("map").classList.remove("panel-open");
        document.getElementById("wrapper").classList.remove("panel-open");
        setTimeout(function () { map.invalidateSize(); }, 300);
    }
    if (document.getElementById("resultStrip").style.display === "flex") {
        document.getElementById("resultStrip").style.display = "none";
    }
    if (window.innerWidth <= 768) {
        document.getElementById("imageInputLabel").style.display = "flex";
        document.getElementById("imageInputLabelPanel").style.display = "none";
    }
}

var resizeTimeout;

window.addEventListener("resize", function () {

    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(function () {

        if (document.getElementById("resultPanel").classList.contains("open")) {

            openPanel(currentPlaceName, currentPhotoHtml, currentMethod, currentShortName);
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
function openPanel(placeName, photoHtml, method, shortName) {

    currentPlaceName = placeName;
    currentPhotoHtml = photoHtml;
    currentMethod = method;
    currentShortName = shortName;

    if (photoMarker) photoMarker.closePopup();

    document.getElementById("panelPhoto").innerHTML = photoHtml;
    document.getElementById("panelPlaceName").innerHTML = "This photo was taken in " + placeName.replace(shortName, "<strong>" + shortName + "</strong>");
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
    openPanel(currentPlaceName, currentPhotoHtml, currentMethod, currentShortName);
});



// ── LOGICAL CORE ───────────────────────────────────────────────────
// aiLocator, placeMarkerFromEXIF, placeMarkerFromAI, getZoomLevel, locateImage
async function aiLocator(image) {

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
                        text: AI_PROMPT
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
        return { place: "unknown", confidence: "unknown", method: "Could not parse the AI response." };
    }

}

async function placeMarkerFromEXIF(photoCoordinates, photoHtml) {

    var response = await fetch(OPENCAGE_URL + encodeURIComponent(photoCoordinates.latitude + "," + photoCoordinates.longitude) + "&key=" + OPENCAGE_KEY);
    var data = await response.json();

    var placeName = "Unknown location";
    var shortName = "Unknown location";

    if (data.results.length > 0) {
        var components = data.results[0].components;
        var street = [components.house_number, components.road].filter(Boolean).join(" ");
        var city = components.city || components.town || components.village || components.county || "";
        var country = components.country || "";

        shortName = city && country ? city + ", " + country : data.results[0].formatted;

        var prefix = street ? street + ", " : "";
        placeName = prefix + shortName;
    }

    if (photoMarker) {
        map.removeLayer(photoMarker);
        photoMarker = null;
    }

    openPanel(placeName, photoHtml, "Location identified using GPS coordinates from photo metadata.", shortName);
    photoMarker = L.marker([photoCoordinates.latitude, photoCoordinates.longitude], { icon: isDark && !isSatellite ? cameraIconDark : cameraIconLight }).addTo(map);

    map.flyTo([photoCoordinates.latitude, photoCoordinates.longitude], 13);

    document.getElementById("welcome").style.display = "none";

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

        openPanel(
            "Unknown location",
            photoHtml,
            aiResult.method,
            "Unknown location"
        );

        document.getElementById("panelPlaceName").innerHTML = "<strong>The location of this photo could not be identified</strong>";
    }

    else {

        var queryLocation = aiLocation.replace(/\bcity\b,?\s*/i, "");
        var response = await fetch(OPENCAGE_URL + encodeURIComponent(queryLocation) + "&key=" + OPENCAGE_KEY);
        var data = await response.json();

        hideSearching();

        if (data.results.length == 0) {

            closeResult();

            showError("The location of this photo is unknown");

            return;

        }

        var result;
        if (aiResult.confidence === "city" || aiResult.confidence === "area") {
            var cityResult = data.results.find(function (r) {
                return r.components._type === "city" || r.components._type === "town";
            });
            result = cityResult || data.results[0];
        } else {
            result = data.results[0];
        }

        var components = result.components;
        var city = components.city || components.town || components.village || components.county || "";
        var country = components.country || "";
        var displayName = city && country ? city + ", " + country : result.formatted;

        var lat = result.geometry.lat;
        var lng = result.geometry.lng;

        if (photoMarker) {
            map.removeLayer(photoMarker);
            photoMarker = null;
        }
        openPanel(displayName, photoHtml, aiResult.method, displayName);

        var zoomLevel = getZoomLevel(result.components._type, aiResult.confidence);

        photoMarker = L.marker([lat, lng], { icon: isDark && !isSatellite ? cameraIconDark : cameraIconLight }).addTo(map);

        map.flyTo([lat, lng], zoomLevel);

        document.getElementById("welcome").style.display = "none";

    }
}

function getZoomLevel(geocodedType, aiConfidence) {

    var zoomLevel;

    if (geocodedType === "attraction" || geocodedType === "place_of_worship" || geocodedType === "building") {
        zoomLevel = 16;
    } else if (geocodedType === "city" || geocodedType === "town") {
        zoomLevel = 11;
    } else if (geocodedType === "village" || geocodedType === "suburb" || geocodedType === "neighbourhood") {
        zoomLevel = 13;
    } else if (geocodedType === "country") {
        zoomLevel = 5;
    } else {
        if (aiConfidence === "landmark") zoomLevel = 15;
        else if (aiConfidence === "area") zoomLevel = 13;
        else if (aiConfidence === "city") zoomLevel = 11;
        else if (aiConfidence === "country") zoomLevel = 5;
        else zoomLevel = 10;
    }

    return zoomLevel;
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



// ── FINAL EVENT LISTENER ───────────────────────────────────────────
// Triggers the search
document.getElementById("imageInput").addEventListener("change", function (e) { locateImage(e.target) });
