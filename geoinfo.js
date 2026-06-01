// Spinning globe SVG/CSS adapted from Phoenix Fox
// Source: https://codepen.io/bluebie/pen/JjdoaLG
// License: MIT — copyright (c) 2026 Phoenix Fox

let userCoordinatesPromise = null;
let _previewToken = 0;

// ── TUNABLES ───────────────────────────────────────────────────────
const DEFAULT_ZOOM = 13;             // default close-in zoom for a located point (also used in script.js)
const LOCATE_BTN_DELAY_MS = 320;     // delay before the locate button fades in
const HINT_DURATION_MS = 7000;       // how long the "locate me" hint stays visible
// Distance-preview choreography:
const PREVIEW_START_DELAY_MS = 1000; // pause on the user's position before flying to the bounds
const PREVIEW_LINE_HOLD_MS = 2500;   // how long the distance line/label stay before fading
const PREVIEW_FADE_MS = 700;         // fade-out duration before flying back to the result
const PREVIEW_SAFETY_MS = 12000;     // hard cap that unlocks the map if the sequence stalls

const userLocationIcon = L.divIcon({
    className: "user-location-marker",
    html: '<div class="user-location-dot"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
});

function getUserCoordinates() {
    if (userCoordinates) {
        return Promise.resolve(userCoordinates);
    }

    if (userCoordinatesPromise) {
        return userCoordinatesPromise;
    }

    userCoordinatesPromise = new Promise(function (resolve) {
        if (!("geolocation" in navigator)) {
            userCoordinatesPromise = null;
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function (position) {
                userCoordinates = [
                    position.coords.latitude,
                    position.coords.longitude
                ];


                userCoordinatesPromise = null;
                resolve(userCoordinates);
            },
            function (err) {
                console.warn("Geolocation failed:", err);
                userCoordinatesPromise = null;
                resolve(null);
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 600000
            }
        );
    });

    return userCoordinatesPromise;
}

let locateButtonTimeout = null;

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

    locateButtonTimeout = setTimeout(function () {
        desktopButton.classList.add("visible");
        mobileButton.classList.add("visible");

        if (!locateHintShown) {
            showLocateUserHint();
            locateHintShown = true;
        }
    }, LOCATE_BTN_DELAY_MS);
}

function showUserLocationPreview() {
    if (locationPreviewInProgress) return;
    if (!userCoordinates || !currentResult.hasLocation()) return;

    const token = ++_previewToken;

    locationPreviewInProgress = true;

    if (locationPreviewTimeout1) {
        clearTimeout(locationPreviewTimeout1);
    }
    if (locationPreviewTimeout2) {
        clearTimeout(locationPreviewTimeout2);
    }

    const userLat = userCoordinates[0];
    const userLng = userCoordinates[1];

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

    const bounds = L.latLngBounds([
        [currentResult.lat, currentResult.lng],
        [userLat, userLng]
    ]);

    map.setView(offsetCenterForPanel(L.latLng(userLat, userLng), DEFAULT_ZOOM), DEFAULT_ZOOM);
    lockMapInteraction();

    // Hide the polygon during the preview's flights — re-projecting it every animation
    // frame causes the lag/colour-splotch. A country polygon is kept as useful context;
    // smaller (region/city/landmark) polygons are restored once the final fly settles.
    if (currentResult.polygon && currentResult.confidence !== "country") map.removeLayer(currentResult.polygon);

    locationPreviewTimeout1 = setTimeout(function () {
        map.flyToBounds(bounds, visiblePadding());
        map.once("moveend", function () {
            if (_previewToken !== token) return;
            showUserDistanceLine(userLat, userLng);
            locationPreviewTimeout2 = setTimeout(function () {
                if (_previewToken !== token) return;
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
                    if (currentResult.polygon) {
                        map.flyToBounds(currentResult.polygon.getBounds(), visiblePadding());
                    } else {
                        map.flyTo(offsetCenterForPanel(L.latLng(currentResult.lat, currentResult.lng), DEFAULT_ZOOM), DEFAULT_ZOOM)
                    }
                }, PREVIEW_FADE_MS);
                map.once("moveend", function () {
                    if (_previewToken !== token) return;
                    if (userMarker) {
                        map.removeLayer(userMarker);
                    }
                    if (currentResult.polygon) currentResult.polygon.addTo(map);   // restore (no-op if it was never hidden)
                    locationPreviewInProgress = false;
                    unlockMapInteraction();
                });
            }, PREVIEW_LINE_HOLD_MS);
        });

    }, PREVIEW_START_DELAY_MS);
    setTimeout(function () {
        if (locationPreviewInProgress) {
            locationPreviewInProgress = false;
            if (userMarker) map.removeLayer(userMarker);
            if (currentResult.polygon) currentResult.polygon.addTo(map);
            unlockMapInteraction();
        }
    }, PREVIEW_SAFETY_MS);
}

function stopUserLocationPreview() {
    ++_previewToken;
    locationPreviewInProgress = false;

    clearTimeout(locationPreviewTimeout1);
    clearTimeout(locationPreviewTimeout2);
    locationPreviewTimeout1 = null;
    locationPreviewTimeout2 = null;
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

function lockMapInteraction() {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if (map.tap) map.tap.disable();
}

function unlockMapInteraction() {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();
}

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

elements.locateBtn.addEventListener("click", async function () {

    if (!hasAcceptedLocationOnce) {
        userCoordinates = null;
        userCoordinatesPromise = null;

        const coords = await getUserCoordinates();

        if (!coords) {
            updateLocateUserButton();
            return;
        }

        hasAcceptedLocationOnce = true;

        updateLocateUserButton();

        if (!panel.isVisible) return;

        if (!currentResult.hasLocation()) return;

        await buildDistanceItem(currentResult.lat, currentResult.lng);
        panel.balanceGeoInfoLayout();
    }

    showUserLocationPreview();
});

elements.locateBtnMobile.addEventListener("click", async function () {
    elements.locateBtn.click();
});

let hintHideTimeout = null;

function showLocateUserHint() {
    const hint = elements.locateHint;
    if (!hint) return;

    clearTimeout(hintHideTimeout);
    hint.classList.add("visible");

    hintHideTimeout = setTimeout(function () {
        hint.classList.remove("visible");
    }, HINT_DURATION_MS);
}

const geoInfoCache = {
    altitudeMeters: null,
    distanceKm: null,
    weatherTempC: null,
    weatherCode: null,
    timeZone: null,
    isDay: null
};

// Reset a geo-info item to its empty/inactive state. The build functions
// always rewrite the full inner structure, so clearing to "" is enough;
// the CSS hides inactive items (#panelGeoInfo>div { display:none }).
function clearGeoItem(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("active");
    el.innerHTML = "";
}

async function buildGeoInfo(lat, lng, aiConfidence, aiCountryCode) {
    if (aiConfidence !== "country") {

        buildCoordinatesItem(lat, lng);

        const weatherData = await getWeatherData(lat, lng);

        geoInfoCache.altitudeMeters = weatherData.elevation;
        geoInfoCache.weatherTempC = weatherData.temperature;
        geoInfoCache.weatherCode = weatherData.weatherCode;
        geoInfoCache.isDay = weatherData.isDay;
        geoInfoCache.timeZone = weatherData.timezone;

        await buildAltitudeItem(lat, lng, geoInfoCache.altitudeMeters);

        buildWeatherItem(geoInfoCache.weatherTempC, geoInfoCache.weatherCode, geoInfoCache.isDay);

        buildTimeItem(geoInfoCache.timeZone);

    } else {
        clearGeoItem("coordinates");
        clearGeoItem("altitude");
        clearGeoItem("weather");
        clearGeoItem("time");
    }

    buildCountryItem(lat, lng, aiCountryCode);

    await buildDistanceItem(lat, lng);

    const hasAltitude = elements.altitude.classList.contains("active");
    const hasDistance = elements.distance.classList.contains("active");
    const hasWeather = elements.weather.classList.contains("active");
    const hasConvertible = hasAltitude || hasDistance || hasWeather;
    elements.toggleUnits.classList.toggle("active", hasConvertible);

    panel.balanceGeoInfoLayout();
}

function buildCoordinatesItem(lat, lng) {
    const coordinates = elements.coordinates;

    if (lat === null || lat === undefined || lng === null || lng === undefined) {
        clearGeoItem("coordinates");
        return;
    }

    const formatted = formatCoordinatesDMS(lat, lng);

    coordinates.innerHTML =
        '<div class="icon">' + GEO_ICONS.coordinates + '</div>' +
        '<div class="value">' + formatted + '</div>';

    coordinates.classList.add("active");
}

function formatCoordinatesDMS(lat, lng) {
    function toDMS(deg, posChar, negChar) {
        const absDeg = Math.abs(deg);
        let d = Math.floor(absDeg);
        const minFloat = (absDeg - d) * 60;
        let m = Math.floor(minFloat);
        let s = Math.round((minFloat - m) * 60);

        if (s === 60) { s = 0; m += 1; }
        if (m === 60) { m = 0; d += 1; }
        const dir = deg >= 0 ? posChar : negChar;
        return d + "° " + m + "' " + s + '" ' + coord(dir);
    }

    return toDMS(lat, "N", "S") + "<br>" + toDMS(lng, "E", "W");
}

async function buildDistanceItem(lat, lng) {
    const distanceEl = elements.distance;

    if (!userCoordinates) {
        clearGeoItem("distance");
        return;
    }
    const userLat = userCoordinates[0];
    const userLong = userCoordinates[1];
    geoInfoCache.distanceKm = Math.floor(haversineKm(lat, lng, userLat, userLong));

    distanceEl.innerHTML =
        '<div class="value">' + formatDistanceSentence(geoInfoCache.distanceKm) + '</div>';
    distanceEl.classList.add("active");

}

function formatDistanceSentence(km) {
    const template = DISTANCE_TRANSLATIONS[uiLang] || DISTANCE_TRANSLATIONS.en;

    const parts = template.split("{distance}");
    const before = parts[0].trim();
    const after = parts[1] ? parts[1].trim() : "";

    const distanceHtml =
        '<span class="convertible distance-value" data-type="distance" data-km="' + km + '">' +
        formatDistance(km) +
        '</span>';

    let html = '';
    if (before) {
        html += '<div class="distance-context">' + before + '</div>';
    }
    html += distanceHtml;
    if (after) {
        html += '<div class="distance-context">' + after + '</div>';
    }

    return html;
}

function buildWeatherItem(temp, weatherCode, isDay) {

    const weather = elements.weather;

    if (temp == null) {
        clearGeoItem("weather");
        return;
    }

    const icon = getWeatherIcon(weatherCode, isDay);
    weather.innerHTML =
        '<div class="icon">' + icon + '</div>' +
        '<div class="value">' +
        '<span class="convertible" data-type="temperature" data-celsius="' + temp + '">' +
        formatTemperature(temp) +
        '</span>' +
        '</div>';
    weather.classList.add("active");

}

async function buildAltitudeItem(lat, lng, elevation) {
    const altitude = elements.altitude;
    let altitudeMeters = null;

    if (elevation != null) {
        altitude.innerHTML =
            '<div class="icon">' + GEO_ICONS.altitude + '</div>' +
            '<div class="value">' +
            '<span class="convertible" data-type="altitude" data-meters="' + elevation + '">' +
            formatAltitude(elevation) +
            '</span>' +
            '</div>';
        altitude.classList.add("active");
        return;
    } else {

        if (lat === null || lat === undefined || lng === null || lng === undefined) {
            clearGeoItem("altitude");
            return;
        }

        altitudeMeters = await getAltitude(lat, lng);

        if (altitudeMeters != null) {
            altitude.innerHTML =
                '<div class="icon">' + GEO_ICONS.altitude + '</div>' +
                '<div class="value">' +
                '<span class="convertible" data-type="altitude" data-meters="' + altitudeMeters + '">' +
                formatAltitude(altitudeMeters) +
                '</span>' +
                '</div>';
            altitude.classList.add("active");

            return;
        }
    }

    clearGeoItem("altitude");
}

async function getAltitude(lat, lng) {
    const url = "https://api.open-elevation.com/api/v1/lookup?locations=" + lat + "," + lng;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.warn("getAltitude failed: non-OK response", response.status, response.statusText);
            return null;
        }

        const data = await response.json();

        if (!data.results || !data.results[0]) {
            console.warn("getAltitude failed: missing results", data);
            return null;
        }

        const elevation = data.results[0].elevation;

        if (elevation === null || elevation === undefined) {
            console.warn("getAltitude failed: missing elevation", data.results[0]);
            return null;
        }

        return elevation;
    } catch (e) {
        console.warn("getAltitude failed:", e);
        return null;
    }
}

function buildTimeItem(timezone) {
    const time = elements.time;

    if (!timezone) {
        clearGeoItem("time");
        return;
    }

    const localTime = getLocalTime(timezone);
    if (!localTime) {
        clearGeoItem("time");
        return;
    }

    time.innerHTML =
        '<div class="icon">' + GEO_ICONS.time + '</div>' +
        '<div class="value">' + localTime + '</div>';
    time.classList.add("active");
}

function buildCountryItem(lat, lng, aiCountryCode) {

    const country = elements.country;

    if (!aiCountryCode) {
        clearGeoItem("country");
        return;
    }

    const regionNames = new Intl.DisplayNames([uiLang], { type: "region" });

    const flagHtml = getFlagImg(aiCountryCode);

    const countryName = regionNames.of(aiCountryCode.toUpperCase());

    const continentName = getContinentName(aiCountryCode);

    country.innerHTML =
        '<div class="icon">' + flagHtml + '</div>' +
        '<div class="value">' + countryName + '</div>' +
        (continentName ? '<div class="continent">' + continentName + '</div>' : '');

    country.classList.add("active");
}

function getFlagImg(countryCode) {
    if (!countryCode || countryCode.length !== 2) return "";
    const code = countryCode.toLowerCase();
    return '<img src="https://flagcdn.com/h20/' + code + '.png" ' +
        'srcset="https://flagcdn.com/h40/' + code + '.png 2x" ' +
        'height="20" alt="" ' +
        'style="display: inline-block; vertical-align: middle; border-radius: 2px;" ' +
        'onerror="this.style.display=\'none\'">';
}

function getLocalTime(timezone) {
    if (!timezone) return null;

    try {
        const formatter = new Intl.DateTimeFormat(uiLang, {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: uiLang === "en" && navigator.language === "en-US"
        });
        return formatter.format(new Date());
    } catch (e) {
        console.warn("getLocalTime failed:", e, "timezone:", timezone);
        return null;
    }
}

async function getWeatherData(lat, lng) {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat
        + "&longitude=" + lng
        + "&current=temperature_2m,weather_code,is_day"
        + "&daily=sunrise,sunset"
        + "&timezone=auto";

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.warn("getWeatherData failed: non-OK response", response.status, response.statusText);
            return {
                elevation: null,
                timezone: null,
                temperature: null,
                weatherCode: null,
                isDay: null
            };
        }

        const data = await response.json();

        return {
            elevation: data.elevation ?? null,
            timezone: data.timezone ?? null,
            temperature: data.current?.temperature_2m ?? null,
            weatherCode: data.current?.weather_code ?? null,
            isDay: data.current?.is_day === 1
        };
    } catch (e) {
        console.warn("getWeatherData failed:", e);
        return {
            elevation: null,
            timezone: null,
            temperature: null,
            weatherCode: null,
            isDay: null
        };
    }
}

function closeGeoInfo() {
    ["country", "coordinates", "altitude", "distance", "weather", "time"].forEach(clearGeoItem);
}

elements.toggleUnits.addEventListener("click", function () {
    isImperial = !isImperial;
    localStorage.setItem("isImperial", isImperial);

    convertUnits();
});


function convertUnits() {
    const spans = document.querySelectorAll(".convertible");
    spans.forEach(function (span) {
        const type = span.dataset.type;

        if (type === "altitude") {
            const meters = parseFloat(span.dataset.meters);
            span.textContent = formatAltitude(meters);
        } else if (type === "distance") {
            const km = parseFloat(span.dataset.km);
            span.textContent = formatDistance(km);
        } else if (type === "temperature") {
            const c = parseFloat(span.dataset.celsius);
            span.textContent = formatTemperature(c);
        }
    });
}

function formatAltitude(meters) {
    if (isImperial) {
        const feet = Math.round(meters * 3.28084);
        return feet + " " + unit("ft");
    }
    return Math.round(meters) + " " + unit("m");
}

function formatDistance(km) {
    if (isImperial) {
        const miles = Math.round(km * 0.621371);
        return miles + " " + unit("mi");
    }
    if (km < 10) {
        return km.toFixed(1) + " " + unit("km");
    }
    return Math.round(km) + " " + unit("km");
}

function formatTemperature(celsius) {
    if (isImperial) {
        const fahrenheit = Math.round(celsius * 9 / 5 + 32);
        return fahrenheit + "°F";
    }
    return Math.round(celsius) + "°C";
}

function getContinentName(countryCode) {
    if (!countryCode) return null;

    const continentCode = COUNTRY_TO_CONTINENT[countryCode.toUpperCase()];
    if (!continentCode) return null;

    const langTable = CONTINENT_TRANSLATIONS[uiLang] || CONTINENT_TRANSLATIONS.en;
    return langTable[continentCode] || CONTINENT_TRANSLATIONS.en[continentCode] || null;
}

function getWeatherIcon(code, isDay) {
    const entry = WEATHER_ICONS[code];
    if (!entry) return WEATHER_SVGS.thermometer;
    return isDay ? entry.day : entry.night;
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;  // Earth's radius in km

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) *
        Math.cos(lat1Rad) * Math.cos(lat2Rad);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

const COUNTRY_TO_CONTINENT = {
    // Africa (002)
    "DZ": "002", "AO": "002", "BJ": "002", "BW": "002", "BF": "002", "BI": "002",
    "CM": "002", "CV": "002", "CF": "002", "TD": "002", "KM": "002", "CG": "002",
    "CD": "002", "CI": "002", "DJ": "002", "EG": "002", "GQ": "002", "ER": "002",
    "SZ": "002", "ET": "002", "GA": "002", "GM": "002", "GH": "002", "GN": "002",
    "GW": "002", "KE": "002", "LS": "002", "LR": "002", "LY": "002", "MG": "002",
    "MW": "002", "ML": "002", "MR": "002", "MU": "002", "YT": "002", "MA": "002",
    "MZ": "002", "NA": "002", "NE": "002", "NG": "002", "RE": "002", "RW": "002",
    "SH": "002", "ST": "002", "SN": "002", "SC": "002", "SL": "002", "SO": "002",
    "ZA": "002", "SS": "002", "SD": "002", "TZ": "002", "TG": "002", "TN": "002",
    "UG": "002", "EH": "002", "ZM": "002", "ZW": "002",

    // Americas (019) — North + Central + South + Caribbean
    "AI": "019", "AG": "019", "AR": "019", "AW": "019", "BS": "019", "BB": "019",
    "BZ": "019", "BM": "019", "BO": "019", "BQ": "019", "BR": "019", "CA": "019",
    "KY": "019", "CL": "019", "CO": "019", "CR": "019", "CU": "019", "CW": "019",
    "DM": "019", "DO": "019", "EC": "019", "SV": "019", "FK": "019", "GF": "019",
    "GL": "019", "GD": "019", "GP": "019", "GT": "019", "GY": "019", "HT": "019",
    "HN": "019", "JM": "019", "MQ": "019", "MX": "019", "MS": "019", "NI": "019",
    "PA": "019", "PY": "019", "PE": "019", "PR": "019", "BL": "019", "KN": "019",
    "LC": "019", "MF": "019", "PM": "019", "VC": "019", "SX": "019", "SR": "019",
    "TT": "019", "TC": "019", "US": "019", "UY": "019", "VE": "019", "VG": "019",
    "VI": "019",

    // Asia (142)
    "AF": "142", "AM": "142", "AZ": "142", "BH": "142", "BD": "142", "BT": "142",
    "BN": "142", "KH": "142", "CN": "142", "CY": "142", "GE": "142", "HK": "142",
    "IN": "142", "ID": "142", "IR": "142", "IQ": "142", "IL": "142", "JP": "142",
    "JO": "142", "KZ": "142", "KW": "142", "KG": "142", "LA": "142", "LB": "142",
    "MO": "142", "MY": "142", "MV": "142", "MN": "142", "MM": "142", "NP": "142",
    "KP": "142", "OM": "142", "PK": "142", "PS": "142", "PH": "142", "QA": "142",
    "SA": "142", "SG": "142", "KR": "142", "LK": "142", "SY": "142", "TW": "142",
    "TJ": "142", "TH": "142", "TL": "142", "TR": "142", "TM": "142", "AE": "142",
    "UZ": "142", "VN": "142", "YE": "142",

    // Europe (150)
    "AL": "150", "AD": "150", "AT": "150", "BY": "150", "BE": "150", "BA": "150",
    "BG": "150", "HR": "150", "CZ": "150", "DK": "150", "EE": "150", "FO": "150",
    "FI": "150", "FR": "150", "DE": "150", "GI": "150", "GR": "150", "GG": "150",
    "VA": "150", "HU": "150", "IS": "150", "IE": "150", "IM": "150", "IT": "150",
    "JE": "150", "XK": "150", "LV": "150", "LI": "150", "LT": "150", "LU": "150",
    "MT": "150", "MD": "150", "MC": "150", "ME": "150", "NL": "150", "MK": "150",
    "NO": "150", "PL": "150", "PT": "150", "RO": "150", "RU": "150", "SM": "150",
    "RS": "150", "SK": "150", "SI": "150", "ES": "150", "SJ": "150", "SE": "150",
    "CH": "150", "UA": "150", "GB": "150", "AX": "150",

    // Oceania (009)
    "AS": "009", "AU": "009", "CX": "009", "CC": "009", "CK": "009", "FJ": "009",
    "PF": "009", "GU": "009", "KI": "009", "MH": "009", "FM": "009", "NR": "009",
    "NC": "009", "NZ": "009", "NU": "009", "NF": "009", "MP": "009", "PW": "009",
    "PG": "009", "PN": "009", "WS": "009", "SB": "009", "TK": "009", "TO": "009",
    "TV": "009", "UM": "009", "VU": "009", "WF": "009",

    // Antarctica (010) - usually shown as its own region
    "AQ": "010", "BV": "010", "TF": "010", "HM": "010", "GS": "010"
};

const WEATHER_SVGS = {
    sun: `<svg class="weather-icon lucide lucide-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,

    moonStar: `<svg class="weather-icon lucide lucide-moon-star" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 5h4"/><path d="M20 3v4"/><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>`,

    cloudSun: `<svg class="weather-icon lucide lucide-cloud-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>`,

    cloudMoon: `<svg class="weather-icon lucide lucide-cloud-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 16a3 3 0 0 1 0 6H7a5 5 0 1 1 4.9-6z"/><path d="M18.376 14.512a6 6 0 0 0 3.461-4.127c.148-.625-.659-.97-1.248-.714a4 4 0 0 1-5.259-5.26c.255-.589-.09-1.395-.716-1.248a6 6 0 0 0-4.594 5.36"/></svg>`,

    cloudy: `<svg class="weather-icon lucide lucide-cloudy" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 12a1 1 0 1 1 0 9H9.006a7 7 0 1 1 6.702-9z"/><path d="M21.832 9A3 3 0 0 0 19 7h-2.207a5.5 5.5 0 0 0-10.72.61"/></svg>`,

    fog: `<svg class="weather-icon lucide lucide-cloud-fog" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7"/><path d="M17 21H9"/></svg>`,

    cloudSunRain: `<svg class="weather-icon lucide lucide-cloud-sun-rain" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M3 20a5 5 0 1 1 8.9-4H13a3 3 0 0 1 2 5.24"/><path d="M11 20v2"/><path d="M7 19v2"/></svg>`,

    cloudMoonRain: `<svg class="weather-icon lucide lucide-cloud-moon-rain" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20v2"/><path d="M18.376 14.512a6 6 0 0 0 3.461-4.127c.148-.625-.659-.97-1.248-.714a4 4 0 0 1-5.259-5.26c.255-.589-.09-1.395-.716-1.248a6 6 0 0 0-4.594 5.36"/><path d="M3 20a5 5 0 1 1 8.9-4H13a3 3 0 0 1 2 5.24"/><path d="M7 19v2"/></svg>`,

    cloudRain: `<svg class="weather-icon lucide lucide-cloud-rain" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>`,

    cloudRainWind: `<svg class="weather-icon lucide lucide-cloud-rain-wind" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m9.2 22 3-7"/><path d="m9 13-3 7"/><path d="m17 13-3 7"/></svg>`,

    cloudSnow: `<svg class="weather-icon lucide lucide-cloud-snow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/></svg>`,

    snowflake: `<svg class="weather-icon lucide lucide-snowflake" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/></svg>`,

    thunderstorm: `<svg class="weather-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
        <g transform="scale(0.5)">
            <path d="M9.45455 30.9942C6.14242 28.461 4 24.4278 4 19.8851C4 12.2166 10.1052 6 17.6364 6C23.9334 6 29.2336 10.3462 30.8015 16.2533C32.0353 15.6159 33.431 15.2567 34.9091 15.2567C39.9299 15.2567 44 19.4011 44 24.5135C44 28.3094 41.7562 31.5716 38.5455 33"/>
            <path d="M17.4141 22.5858L14.5856 25.4142"/>
            <path d="M26.9996 24L19 32.0012H29.004L21.0003 40.018"/>
            <path d="M33.4141 38.5858L30.5856 41.4142"/>
        </g>
    </svg>`,

    thermometer: `<svg class="weather-icon lucide lucide-thermometer" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>`
};

const WEATHER_ICONS = {
    0: { day: WEATHER_SVGS.sun, night: WEATHER_SVGS.moonStar },
    1: { day: WEATHER_SVGS.sun, night: WEATHER_SVGS.moonStar },

    2: { day: WEATHER_SVGS.cloudSun, night: WEATHER_SVGS.cloudMoon },
    3: { day: WEATHER_SVGS.cloudy, night: WEATHER_SVGS.cloudy },

    45: { day: WEATHER_SVGS.fog, night: WEATHER_SVGS.fog },
    48: { day: WEATHER_SVGS.fog, night: WEATHER_SVGS.fog },

    51: { day: WEATHER_SVGS.cloudSunRain, night: WEATHER_SVGS.cloudMoonRain },
    53: { day: WEATHER_SVGS.cloudRain, night: WEATHER_SVGS.cloudRain },
    55: { day: WEATHER_SVGS.cloudRain, night: WEATHER_SVGS.cloudRain },

    56: { day: WEATHER_SVGS.cloudRain, night: WEATHER_SVGS.cloudRain },
    57: { day: WEATHER_SVGS.cloudRain, night: WEATHER_SVGS.cloudRain },

    61: { day: WEATHER_SVGS.cloudSunRain, night: WEATHER_SVGS.cloudMoonRain },
    63: { day: WEATHER_SVGS.cloudRain, night: WEATHER_SVGS.cloudRain },
    65: { day: WEATHER_SVGS.cloudRainWind, night: WEATHER_SVGS.cloudRainWind },

    66: { day: WEATHER_SVGS.cloudRain, night: WEATHER_SVGS.cloudRain },
    67: { day: WEATHER_SVGS.cloudRainWind, night: WEATHER_SVGS.cloudRainWind },

    71: { day: WEATHER_SVGS.cloudSnow, night: WEATHER_SVGS.cloudSnow },
    73: { day: WEATHER_SVGS.cloudSnow, night: WEATHER_SVGS.cloudSnow },
    75: { day: WEATHER_SVGS.snowflake, night: WEATHER_SVGS.snowflake },
    77: { day: WEATHER_SVGS.snowflake, night: WEATHER_SVGS.snowflake },

    80: { day: WEATHER_SVGS.cloudSunRain, night: WEATHER_SVGS.cloudMoonRain },
    81: { day: WEATHER_SVGS.cloudRain, night: WEATHER_SVGS.cloudRain },
    82: { day: WEATHER_SVGS.cloudRainWind, night: WEATHER_SVGS.cloudRainWind },

    85: { day: WEATHER_SVGS.cloudSnow, night: WEATHER_SVGS.cloudSnow },
    86: { day: WEATHER_SVGS.snowflake, night: WEATHER_SVGS.snowflake },

    95: { day: WEATHER_SVGS.thunderstorm, night: WEATHER_SVGS.thunderstorm },
    96: { day: WEATHER_SVGS.thunderstorm, night: WEATHER_SVGS.thunderstorm },
    99: { day: WEATHER_SVGS.thunderstorm, night: WEATHER_SVGS.thunderstorm }
};

const GEO_ICONS = {
    altitude: '<svg class="geo-info-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/><path d="M4.14 15.08c2.62-1.57 5.24-1.43 7.86.42 2.74 1.94 5.49 2 8.23.19"/></svg>',

    time: '<svg class="geo-info-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4-2"/></svg>',

    coordinates: '<svg class="geo-info-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 13v8"/><path d="M12 3v3"/><path d="M2.354 10.354a1.207 1.207 0 0 1 0-1.708l2.06-2.06A2 2 0 0 1 5.828 6h12.344a2 2 0 0 1 1.414.586l2.06 2.06a1.207 1.207 0 0 1 0 1.708l-2.06 2.06a2 2 0 0 1-1.414.586H5.828a2 2 0 0 1-1.414-.586z"/></svg>',

    distance: '<svg class="geo-info-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 15v-3"/><path d="M14 15v-3"/><path d="M18 15v-3"/><path d="M2 8V4"/><path d="M22 6H2"/><path d="M22 8V4"/><path d="M6 15v-3"/><rect x="2" y="12" width="20" height="8" rx="2"/></svg>'
};
