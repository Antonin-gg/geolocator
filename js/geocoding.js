/*
 * Geocoding cascade.
 *
 * The AI gives us one English place string, but geocoders often need a few
 * different versions of that string before they find the right result. This file
 * builds those fallback queries, tries them through Nominatim and OpenCage, and
 * filters the results so the returned map location matches the AI confidence.
 *
 * Nominatim is preferred for most city, region, and country results because it
 * often returns polygons and good administrative data. OpenCage is useful as a
 * backup, especially for landmarks, because it can find named places that
 * Nominatim sometimes misses.
 *
 * The cascade has a strict pass and a loose pass. The strict pass requires the
 * geocoder result type to match the expected map level. That avoids accepting a
 * similarly named city when the AI meant a region, or a region when the AI meant
 * a country. The loose pass retries without that filter, because geocoders do
 * not always classify places the same way this app does.
 *
 * Landmarks get special handling. There are too many possible landmark-like
 * geocoder types to whitelist reliably, so landmarks use a blacklist instead.
 * They also try Nominatim and OpenCage for each query before moving to the next
 * fallback query, because specific named sites are more fragile than broad
 * areas.
 *
 * When OpenCage finds a place, we still try to enrich it with a matching
 * Nominatim result. That can recover a localized short name, a more accurate
 * coordinate, and sometimes a polygon for the map outline.
 */

/**
 * Finds map data for an AI place result.
 * The pass order depends on the confidence level because landmarks and broad
 * areas fail in different ways. Landmarks benefit from trying both providers
 * early, while areas are safer when Nominatim is exhausted first.
 *
 * @param {string} aiPlace Place name returned by the AI, in English.
 * @param {string} aiConfidence Expected map level: landmark, city, region, or country.
 * @param {string} aiCountryCode Optional ISO country code used to narrow geocoder results.
 * @returns {Promise<Object|null>} Normalized location data, or null if nothing safe is found.
 */
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

/**
 * Runs the generated queries through the configured geocoding passes.
 * The fallback flag is shared with the wiki cascade so Wikipedia knows when the
 * geocoder needed a safer simplified query before it found a location.
 *
 * @param {string[]} queries Place query variants, ordered from most specific to broadest.
 * @param {Array<{sources: string[], filterByType: string|null}>} passes Provider and filter strategy.
 * @param {string} aiCountryCode Optional ISO country code.
 * @returns {Promise<Object|null>} First accepted location result, or null.
 */
async function runGeocodingCascade(queries, passes, aiCountryCode) {
    didGeocodingFallBack = 0;

    for (let p = 0; p < passes.length; p++) {
        const pass = passes[p];

        for (let i = 0; i < queries.length; i++) {
            if (i === 2) didGeocodingFallBack = 1;

            for (let s = 0; s < pass.sources.length; s++) {
                const result = await tryGeocodingSource(
                    pass.sources[s],
                    queries[i],
                    pass.filterByType,
                    aiCountryCode
                );

                if (result === "error") {
                    didGeocodingFallBack = 0;
                    return null;
                }

                if (result) {
                    return result;
                }
            }
        }
        didGeocodingFallBack = 0;
    }
    return null;
}

/**
 * Dispatches one cascade attempt to the selected provider.
 */
async function tryGeocodingSource(source, query, filterByType, aiCountryCode) {
    if (source === "nominatim") {
        return await tryNominatim(query, filterByType, aiCountryCode);
    }

    if (source === "opencage") {
        return await tryOpenCage(query, filterByType, aiCountryCode);
    }

    return null;
}

/**
 * Searches Nominatim and normalizes the best accepted result.
 * Nominatim is the preferred source when possible because it can return polygons,
 * localized names, address details, and bounding boxes in one response.
 *
 * @param {string} query Search query sent to Nominatim.
 * @param {string|null} aiConfidence Type filter for the current cascade pass.
 * @param {string} aiCountryCode Optional country filter. Antarctica is excluded because Nominatim can miss Antarctic features when constrained.
 * @returns {Promise<Object|string|null>} Location object, "error" on network failure, or null.
 */
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
                shortName: buildShortNameFromNominatim(result),
                showPolygon: showPolygon(aiConfidence, result.geojson)
            };
        }
    }

    return null;
}

/**
 * Searches OpenCage and normalizes the best accepted result.
 * OpenCage is used as a fallback because it often finds specific named places
 * that Nominatim misses. When it succeeds, we try to recover Nominatim data so
 * the final result can still use polygons and localized names when available.
 *
 * @param {string} query Search query sent to OpenCage.
 * @param {string|null} aiConfidence Type filter for the current cascade pass.
 * @param {string} aiCountryCode Optional country filter.
 * @returns {Promise<Object|string|null>} Location object, "error" on network failure, or null.
 */
async function tryOpenCage(query, aiConfidence, aiCountryCode) {

    let url = OPENCAGE_WORKER_URL +
        "?q=" + encodeURIComponent(query);

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
            const extraDataFromNominatim = (await enrichOpenCageWithNominatim(result, aiConfidence, aiCountryCode)) || {};
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

/**
 * Tries to recover Nominatim data for an OpenCage result.
 * OpenCage can find the place, but Nominatim often gives better map metadata.
 * We first search by formatted name, then by the primary name, and finally use a
 * reverse lookup near the OpenCage coordinate.
 *
 * @param {Object} openCageResult Result selected from OpenCage.
 * @param {string|null} aiConfidence Expected map level.
 * @param {string} aiCountryCode Optional ISO country code.
 * @returns {Promise<Object|null>} Extra Nominatim data, or null if no useful match is found.
 */
async function enrichOpenCageWithNominatim(openCageResult, aiConfidence, aiCountryCode) {
    let query = openCageResult.formatted;
    if (!query) return null;

    // Remove postal codes and duplicate commas before asking Nominatim to match the OpenCage label.
    query = query
        .replace(/\b\d{4,6}(-\d{3,4})?\b/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/\s+/g, ' ')
        .trim();

    /*
     * First try the full formatted label. If that fails, try only the primary place
     * name, which avoids extra address parts confusing Nominatim.
     */
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
                shortName: buildShortNameFromNominatim(matching)
            };
        }
    }

    /*
     * If name search cannot recover the place, reverse lookup near the OpenCage
     * coordinate can still provide an address, bounds, or polygon.
     */
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
            shortName: buildShortNameFromNominatim(reverseResult)
        };
    }
    return null;
}

/**
 * Picks the closest Nominatim polygon that looks like the OpenCage result.
 * Distance limits depend on confidence because a country can be far from its
 * label point, while a landmark match needs to be very close.
 *
 * @param {Object[]} results Nominatim results.
 * @param {Object} openCageResult OpenCage result to compare against.
 * @param {string|null} aiConfidence Expected map level.
 * @returns {Object|null} Closest matching Nominatim result.
 */
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

    // Broader places can tolerate larger center-point differences than landmarks.
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

/**
 * Builds safer query variants from the AI place string.
 * The exact AI result is tried first. Later queries remove noisy descriptors or
 * intermediate place parts while keeping enough parent context to avoid jumping
 * to a different place with a similar name.
 *
 * @param {string} aiPlace Place string returned by the AI.
 * @returns {string[]} Query variants ordered from strictest to broadest.
 */
function generateFallbackQueries(aiPlace) {
    let cleaned = aiPlace.replace(/(\w+)\/(\w+)/g, "$1");

    // Convert repeated names like "Luxembourg Luxembourg" into a geocoder-friendly comma form.
    if (!cleaned.includes(",")) {
        cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, "$1, $1");
    }

    const parts = cleaned.split(",").map(p => p.trim());
    const queries = [cleaned];

    /*
 * Stopword removal gives Wikipedia and geocoders a simpler name to try without
 * discarding the original query. This is useful for names like "Mount Teide",
 * where the canonical article or geocoder result may simply be "Teide".
 */
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

    // Drop middle administrative parts one by one while keeping the first and last anchors.
    for (let skip = 1; skip < parts.length - 1; skip++) {
        const trimmed = [parts[0]].concat(parts.slice(skip + 1));
        if (trimmed.length > 1 && trimmed.length < parts.length) {
            queries.push(trimmed.join(", "));
        }
    }

    // Try the primary place alone, then broader parent chains.
    if (parts.length > 1) {
        queries.push(parts[0]);
    }

    for (let i = 1; i < parts.length; i++) {
        queries.push(parts.slice(i).join(", "));
    }

    return queries;
}

/**
 * Chooses a fallback zoom level for point results.
 * Broader confidence levels need lower zoom so the map does not overfocus on a
 * single coordinate inside a large area.
 */
function getZoomLevel(aiConfidence) {
    if (aiConfidence === "landmark") return 13;
    if (aiConfidence === "city") return 11;
    if (aiConfidence === "region") return 8;
    if (aiConfidence === "country") return 3;
    return 10;
}

/**
 * Returns type filters for the current AI confidence.
 * City, region, and country use whitelists. Landmarks use a blacklist because
 * valid landmarks appear under too many different geocoder types to list safely.
 *
 * @param {string} aiConfidence AI confidence level.
 * @returns {string[]} Accepted types, or rejected types for landmarks.
 */
function getPreferredTypes(aiConfidence) {
    if (aiConfidence === "country") return ["country"];
    if (aiConfidence === "region") return [
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
    if (aiConfidence === "city") return [
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
    if (aiConfidence === "landmark") return [
        // Landmark mode uses these as rejected types, not accepted types.
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

/**
 * Decides whether a polygon should be shown for the result.
 * Area-level results are useful as outlines. Landmark polygons are only shown
 * when they are large enough to help, because tiny building outlines can look
 * noisy or misleading.
 */
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

/**
 * Roughly estimates whether a landmark polygon is large enough to be useful.
 * This is intentionally simple because it only decides visibility, not precise
 * area measurement.
 */
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

/**
 * Selects the safest Nominatim result for the AI query.
 * Type filtering prevents wrong-level matches, then token matching checks that
 * the result name and the AI place actually refer to the same place.
 *
 * @param {Object[]} results Raw Nominatim results.
 * @param {string} aiPlace Original query.
 * @param {string|null} aiConfidence Expected map level.
 * @returns {Object|null} Best accepted result.
 */
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

    /*
     * Nominatim display names can include a lot of parent context. Matching both the
     * full AI place and the primary place part gives specific names a fair chance
     * without accepting unrelated parent regions.
     */
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

/**
 * Selects the safest OpenCage result for the AI query.
 * OpenCage exposes different component fields from Nominatim, so matching checks
 * both the formatted label and likely place-name components.
 *
 * @param {Object[]} results Raw OpenCage results.
 * @param {string} aiPlace Original query.
 * @param {string|null} aiConfidence Expected map level.
 * @returns {Object|null} Best accepted result.
 */
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

/**
 * Builds the localized display name for a Nominatim result.
 * The panel should use a readable short label, not the full geocoder address.
 */
function buildShortNameFromNominatim(result) {
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

/**
 * Builds a readable display name from OpenCage components.
 * This is used when Nominatim enrichment did not recover a better localized
 * short name.
 */
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

// Very short names create too many accidental token matches.
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

/**
 * Normalizes a place name into comparable tokens.
 * Accents and punctuation are removed so "Liège" can match "Liege", while very
 * short words and common filler words are ignored to reduce false matches.
 */
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

/**
 * Returns true when every meaningful token from source appears in target.
 * This allows partial geocoder labels to match longer display names without
 * requiring exact string equality.
 */
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

/**
 * Checks token containment in both directions.
 * This catches cases where either the AI query or the geocoder label is the more
 * detailed version of the same place.
 */
function bidirectionalTokenMatch(a, b) {
    return containsTokens(a, b) || containsTokens(b, a);
}