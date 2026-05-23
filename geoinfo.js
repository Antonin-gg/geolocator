var userCoordinatesPromise = null;

function getUserCoordinates() {
    if (userCoordinatesPromise) return userCoordinatesPromise;

    userCoordinatesPromise = new Promise(function (resolve) {
        if (!("geolocation" in navigator)) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            function (position) {
                resolve([position.coords.latitude, position.coords.longitude]);
            },
            function () {
                resolve(null);
            },
            { timeout: 5000, maximumAge: 600000 }
        );
    });

    return userCoordinatesPromise;
}

var geoInfoCache = {
    altitudeMeters: null,
    distanceKm: null,
    weatherTempC: null,
    weatherCode: null,
    timeZone: null,
    isDay: null
};



async function buildGeoInfo(lat, lng, aiConfidence, aiCountryCode) {
    if (aiConfidence !== "country") {

        buildCoordinatesItem(lat, lng);

        var weatherData = await getWeatherData(lat, lng);

        geoInfoCache.altitudeMeters = weatherData.elevation;
        geoInfoCache.weatherTempC = weatherData.temperature;
        geoInfoCache.weatherCode = weatherData.weatherCode;
        geoInfoCache.isDay = weatherData.isDay;
        geoInfoCache.timeZone = weatherData.timezone;

        await buildAltitudeItem(lat, lng, geoInfoCache.altitudeMeters);

        buildWeatherItem(geoInfoCache.weatherTempC, geoInfoCache.weatherCode, geoInfoCache.isDay);

        buildTimeItem(geoInfoCache.timeZone);

    } else {
        document.getElementById("coordinates").classList.remove("active");
        document.getElementById("coordinates").innerHTML = '<div class="emoji"></div>' +
            '<div class="value"></div>';

        document.getElementById("altitude").classList.remove("active");
        document.getElementById("altitude").innerHTML = '<div class="emoji"></div>' +
            '<div class="value"></div>';

        document.getElementById("weather").classList.remove("active");
        document.getElementById("weather").innerHTML = '<div class="emoji"></div>' +
            '<div class="value"></div>';

        document.getElementById("time").classList.remove("active");
        document.getElementById("time").innerHTML = '<div class="emoji"></div>' +
            '<div class="value"></div>';
    }

    buildCountryItem(lat, lng, aiCountryCode);

    await buildDistanceItem(lat, lng);

    var hasAltitude = document.getElementById("altitude").classList.contains("active");
    var hasDistance = document.getElementById("distance").classList.contains("active");
    var hasWeather = document.getElementById("weather").classList.contains("active");
    var hasConvertible = hasAltitude || hasDistance || hasWeather;
    document.getElementById("toggleUnits").classList.toggle("active", hasConvertible);

    balanceGeoInfoLayout();
}

function buildCoordinatesItem(lat, lng) {
    var coordinates = document.getElementById("coordinates");

    if (lat === null || lat === undefined || lng === null || lng === undefined) {
        coordinates.classList.remove("active");
        coordinates.innerHTML = '<div class="emoji"></div>' +
            '<div class="value"></div>';
        return;
    }

    var formatted = formatCoordinatesDMS(lat, lng);

    coordinates.innerHTML =
        '<div class="emoji">📍</div>' +
        '<div class="value">' + formatted + '</div>';

    coordinates.classList.add("active");
}

function formatCoordinatesDMS(lat, lng) {
    function toDMS(deg, posChar, negChar) {
        var absDeg = Math.abs(deg);
        var d = Math.floor(absDeg);
        var minFloat = (absDeg - d) * 60;
        var m = Math.floor(minFloat);
        var s = Math.round((minFloat - m) * 60);

        if (s === 60) { s = 0; m += 1; }
        if (m === 60) { m = 0; d += 1; }
        var dir = deg >= 0 ? posChar : negChar;
        return d + "° " + m + "' " + s + '" ' + coord(dir);
    }

    return toDMS(lat, "N", "S") + "<br>" + toDMS(lng, "E", "W");
}

async function buildDistanceItem(lat, lng) {

    userCoordinates = await getUserCoordinates();

    var distanceEl = document.getElementById("distance");

    if (!userCoordinates) {
        distanceEl.innerHTML = '<div class="value"></div>';
        distanceEl.classList.remove("active");
        return;
    }

    var userLat = userCoordinates[0];
    var userLong = userCoordinates[1];
    geoInfoCache.distanceKm = Math.floor(haversineKm(lat, lng, userLat, userLong));

    distanceEl.innerHTML =
        '<div class="value">' + formatDistanceSentence(geoInfoCache.distanceKm) + '</div>';
    distanceEl.classList.add("active");

}

function formatDistanceSentence(km) {
    var template = DISTANCE_TRANSLATIONS[currentLang] || DISTANCE_TRANSLATIONS.en;

    var parts = template.split("{distance}");
    var before = parts[0].trim();
    var after = parts[1] ? parts[1].trim() : "";

    var distanceHtml =
        '<span class="convertible distance-value" data-type="distance" data-km="' + km + '">' +
        formatDistance(km) +
        '</span>';

    var html = '';
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

    var weather = document.getElementById("weather");

    if (!temp) {
        weather.innerHTML = '<div class="emoji"></div>' +
            '<div class="value"></div>';
        weather.classList.remove("active");
        return;
    }

    var emoji = getWeatherEmoji(weatherCode, isDay);
    weather.innerHTML =
        '<div class="emoji">' + emoji + '</div>' +
        '<div class="value">' +
        '<span class="convertible" data-type="temperature" data-celsius="' + temp + '">' +
        formatTemperature(temp) +
        '</span>' +
        '</div>';
    weather.classList.add("active");

}

async function buildAltitudeItem(lat, lng, elevation) {
    var altitude = document.getElementById("altitude");
    var altitudeMeters = null;

    if (elevation || elevation === 0) {
        altitude.innerHTML =
            '<div class="emoji">🏔️</div>' +
            '<div class="value">' +
            '<span class="convertible" data-type="altitude" data-meters="' + elevation + '">' +
            formatAltitude(elevation) +
            '</span>' +
            '</div>';
        altitude.classList.add("active");
        return;
    } else {

        if (lat === null || lat === undefined || lng === null || lng === undefined) {
            altitude.classList.remove("active");
            altitude.innerHTML = '<div class="emoji"></div>' +
                '<div class="value"></div>';
            return;
        }

        altitudeMeters = await getAltitude(lat, lng);

        if (altitudeMeters) {
            altitude.innerHTML =
                '<div class="emoji">🏔️</div>' +
                '<div class="value">' +
                '<span class="convertible" data-type="altitude" data-meters="' + altitudeMeters + '">' +
                formatAltitude(altitudeMeters) +
                '</span>' +
                '</div>';
            altitude.classList.add("active");

            return;
        }
    }

    altitude.classList.remove("active");
    altitude.innerHTML = '<div class="emoji"></div>' +
        '<div class="value"></div>';
}

async function getAltitude(lat, lng) {
    var url = "https://api.open-elevation.com/api/v1/lookup?locations=" + lat + "," + lng;

    try {
        var response = await fetch(url);
        if (!response.ok) return null;

        var data = await response.json();
        if (!data.results || !data.results[0]) return null;

        var elevation = data.results[0].elevation;
        if (elevation === null || elevation === undefined) return null;

        return elevation;
    } catch (e) {
        return null;
    }
}

function buildTimeItem(timezone) {
    var time = document.getElementById("time");

    if (!timezone) {
        time.innerHTML = '<div class="emoji"></div>' +
            '<div class="value"></div>';
        time.classList.remove("active");
        return;
    }

    var localTime = getLocalTime(timezone);
    if (!localTime) {
        time.innerHTML = '<div class="emoji"></div>' +
            '<div class="value"></div>';
        time.classList.remove("active");
        return;
    }

    time.innerHTML =
        '<div class="emoji">🕐</div>' +
        '<div class="value">' + localTime + '</div>';
    time.classList.add("active");
}

function buildCountryItem(lat, lng, aiCountryCode) {

    var country = document.getElementById("country");

    if (!aiCountryCode) {
        country.innerHTML = '<div class="emoji"></div>' +
            '<div class="value"></div>' +
            '<div class="continent"></div>';
        country.classList.remove("active");
        return;
    }

    var regionNames = new Intl.DisplayNames([currentLang], { type: "region" });

    var flagHtml = getFlagImg(aiCountryCode);

    var countryName = regionNames.of(aiCountryCode.toUpperCase());

    var continentName = getContinentName(aiCountryCode);

    country.innerHTML =
        '<div class="emoji">' + flagHtml + '</div>' +
        '<div class="value">' + countryName + '</div>' +
        (continentName ? '<div class="subvalue">' + continentName + '</div>' : '');

    country.classList.add("active");
}

function getFlagImg(countryCode) {
    if (!countryCode || countryCode.length !== 2) return "";
    var code = countryCode.toLowerCase();
    return '<img src="https://flagcdn.com/h20/' + code + '.png" ' +
        'srcset="https://flagcdn.com/h40/' + code + '.png 2x" ' +
        'height="20" alt="" ' +
        'style="display: inline-block; vertical-align: middle; border-radius: 2px;" ' +
        'onerror="this.style.display=\'none\'">';
}

function getLocalTime(timezone) {
    if (!timezone) return null;

    try {
        var formatter = new Intl.DateTimeFormat(currentLang, {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: currentLang === "en" && navigator.language === "en-US"
        });
        return formatter.format(new Date());
    } catch (e) {
        return null;
    }
}

async function getWeatherData(lat, lng) {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat
        + "&longitude=" + lng
        + "&current=temperature_2m,weather_code,is_day"
        + "&daily=sunrise,sunset"
        + "&timezone=auto";

    try {
        var response = await fetch(url);
        if (!response.ok) return null;

        var data = await response.json();

        return {
            elevation: data.elevation,
            timezone: data.timezone,
            temperature: data.current && data.current.temperature_2m,
            weatherCode: data.current && data.current.weather_code,
            isDay: data.current && data.current.is_day === 1,
        };
    } catch (e) {
        return null;
    }
}

function closeGeoInfo() {
    var items = ["country", "coordinates", "altitude", "distance", "weather", "time"];

    items.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;

        el.classList.remove("active");

        if (id === "country") {
            el.innerHTML =
                '<div class="emoji"></div>' +
                '<div class="value"></div>' +
                '<div class="continent"></div>';
        } else {
            el.innerHTML =
                '<div class="emoji"></div>' +
                '<div class="value"></div>';
        }
    });
}

document.getElementById("toggleUnits").addEventListener("click", function () {
    isImperial = !isImperial;
    localStorage.setItem("isImperial", isImperial);

    convertUnits();
});

function balanceGeoInfoLayout() {
    var container = document.getElementById("panelGeoInfo");
    var activeItems = container.querySelectorAll(":scope > div.active");
    var total = activeItems.length;
    if (total === 0) return;

    container.style.removeProperty("--geo-cols");

    var firstTop = activeItems[0].offsetTop;
    var perRow = 0;
    for (var i = 0; i < activeItems.length; i++) {
        if (activeItems[i].offsetTop === firstTop) perRow++;
        else break;
    }

    var forcedCols = null;
    if (perRow === 3 && total === 4) forcedCols = 2;
    if ((perRow === 4 && total >= 5) || (perRow === 5 && total === 6)) forcedCols = 3;

    if (forcedCols !== null) {
        container.style.setProperty("--geo-cols", forcedCols);
    }
}

function convertUnits() {
    var spans = document.querySelectorAll(".convertible");
    spans.forEach(function (span) {
        var type = span.dataset.type;

        if (type === "altitude") {
            var meters = parseFloat(span.dataset.meters);
            span.textContent = formatAltitude(meters);
        } else if (type === "distance") {
            var km = parseFloat(span.dataset.km);
            span.textContent = formatDistance(km);
        } else if (type === "temperature") {
            var c = parseFloat(span.dataset.celsius);
            span.textContent = formatTemperature(c);
        }
    });
}

function formatAltitude(meters) {
    if (isImperial) {
        var feet = Math.round(meters * 3.28084);
        return feet + " " + unit("ft");
    }
    return Math.round(meters) + " " + unit("m");
}

function formatDistance(km) {
    if (isImperial) {
        var miles = Math.round(km * 0.621371);
        return miles + " " + unit("mi");
    }
    if (km < 10) {
        return km.toFixed(1) + " " + unit("km");
    }
    return Math.round(km) + " " + unit("km");
}

function formatTemperature(celsius) {
    if (isImperial) {
        var fahrenheit = Math.round(celsius * 9 / 5 + 32);
        return fahrenheit + "°F";
    }
    return Math.round(celsius) + "°C";
}

function getContinentName(countryCode) {
    if (!countryCode) return null;
    
    var continentCode = COUNTRY_TO_CONTINENT[countryCode.toUpperCase()];
    if (!continentCode) return null;
    
    var langTable = CONTINENT_TRANSLATIONS[currentLang] || CONTINENT_TRANSLATIONS.en;
    return langTable[continentCode] || CONTINENT_TRANSLATIONS.en[continentCode] || null;
}

function getWeatherEmoji(code, isDay) {
    var entry = WEATHER_ICONS[code];
    if (!entry) return "🌡️";
    return isDay ? entry.day : entry.night;
}

function haversineKm(lat1, lng1, lat2, lng2) {
    var R = 6371;  // Earth's radius in km

    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;

    var lat1Rad = lat1 * Math.PI / 180;
    var lat2Rad = lat2 * Math.PI / 180;

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) *
        Math.cos(lat1Rad) * Math.cos(lat2Rad);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

var COUNTRY_TO_CONTINENT = {
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

var WEATHER_ICONS = {
    // Clear / Cloudy
    0: { day: "☀️", night: "🌙" },   // Clear sky
    1: { day: "🌤️", night: "🌙" },   // Mainly clear
    2: { day: "⛅", night: "☁️" },   // Partly cloudy
    3: { day: "☁️", night: "☁️" },   // Overcast

    // Fog
    45: { day: "🌫️", night: "🌫️" },  // Fog
    48: { day: "🌫️", night: "🌫️" },  // Depositing rime fog

    // Drizzle
    51: { day: "🌦️", night: "🌧️" },  // Light drizzle
    53: { day: "🌦️", night: "🌧️" },  // Moderate drizzle
    55: { day: "🌧️", night: "🌧️" },  // Dense drizzle

    // Freezing drizzle
    56: { day: "🌧️", night: "🌧️" },  // Light freezing drizzle
    57: { day: "🌧️", night: "🌧️" },  // Dense freezing drizzle

    // Rain
    61: { day: "🌦️", night: "🌧️" },  // Slight rain
    63: { day: "🌧️", night: "🌧️" },  // Moderate rain
    65: { day: "🌧️", night: "🌧️" },  // Heavy rain

    // Freezing rain
    66: { day: "🌧️", night: "🌧️" },  // Light freezing rain
    67: { day: "🌧️", night: "🌧️" },  // Heavy freezing rain

    // Snow
    71: { day: "🌨️", night: "🌨️" },  // Slight snow fall
    73: { day: "🌨️", night: "🌨️" },  // Moderate snow fall
    75: { day: "❄️", night: "❄️" },   // Heavy snow fall
    77: { day: "❄️", night: "❄️" },   // Snow grains

    // Rain showers
    80: { day: "🌦️", night: "🌧️" },  // Slight rain showers
    81: { day: "🌧️", night: "🌧️" },  // Moderate rain showers
    82: { day: "⛈️", night: "⛈️" },   // Violent rain showers

    // Snow showers
    85: { day: "🌨️", night: "🌨️" },  // Slight snow showers
    86: { day: "❄️", night: "❄️" },   // Heavy snow showers

    // Thunderstorms
    95: { day: "⛈️", night: "⛈️" },   // Thunderstorm
    96: { day: "⛈️", night: "⛈️" },   // Thunderstorm with slight hail
    99: { day: "⛈️", night: "⛈️" }    // Thunderstorm with heavy hail
};