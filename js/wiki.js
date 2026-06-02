/*
 * Additional content builder and Wikipedia article matching cascade.
 *
 * This file builds the optional "Learn more" content shown below a result. It
 * combines a Wikipedia excerpt with a geo info panel from geoinfo.js, then decides
 * whether the learn-more button should be visible.
 *
 * Wikipedia search starts in English because English Wikipedia has much broader
 * coverage than any single local-language edition, and the AI place field is
 * already English for geocoding. When the UI language is different, the app first
 * tries to translate the accepted English article through Wikipedia langlinks.
 * If that fails, it falls back to local-language title search and coordinate
 * geosearch near the mapped result.
 *
 * The cascade is deliberately conservative. Wikipedia search can return pages
 * with similar names, list pages, disambiguation pages, or places far from the
 * mapped result. Scoring uses title tokens, coordinates, and cross-language
 * proper noun checks before accepting an article.
 */

// ── Learn-more content building ────────────────────────────────────

/**
 * Builds all optional information shown behind the learn-more button.
 * Wiki and geo info are built together because the button should only appear
 * when at least one of them has useful content.
 *
 * @param {string|null} aiPlace Original AI place name. Null for EXIF results.
 * @param {string} geocodedPlace Short display name from geocoding or reverse geocoding.
 * @param {number} lat Result latitude.
 * @param {number} lng Result longitude.
 * @param {string} aiConfidence Result confidence level.
 * @param {string} aiCountryCode ISO country code when available.
 * @param {number} searchId Search token captured when this upload started.
 */
async function buildMoreInfo(aiPlace, geocodedPlace, lat, lng, aiConfidence, aiCountryCode, searchId) {

    await buildWikiExcerpt(aiPlace, geocodedPlace, lat, lng, aiConfidence, aiCountryCode, searchId);

    await buildGeoInfo(lat, lng, aiConfidence, aiCountryCode, searchId);

    const hasGeo = document.querySelectorAll("#panelGeoInfo .active").length > 0;
    const hasWiki = elements.wiki.innerHTML.trim().length > 0;
    elements.learnMore.style.display = (hasGeo || hasWiki) ? "flex" : "none";
}

/**
 * Finds and renders a Wikipedia excerpt for the current result.
 * EXIF results do not have an AI place string, so they build an English lookup
 * query from the reverse-geocoded place and country before entering the same
 * wiki cascade.
 */
async function buildWikiExcerpt(aiPlace, geocodedPlace, lat, lng, aiConfidence, aiCountryCode, searchId) {

    let result = null;

    /*
     * EXIF reverse geocoding returns localized names. Wikipedia search works better
     * from an English query, so country names are converted back to English here.
     */
    if (!aiPlace) {
        const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
        const countryName = aiCountryCode ? regionNames.of(aiCountryCode.toUpperCase()) : "";
        const enGeocodedPlace = geocodedPlace.split(",")[0].trim() + ", " + countryName;
        result = await getWikiResult(enGeocodedPlace, geocodedPlace, lat, lng, "exif");

    } else {
        result = await getWikiResult(aiPlace, geocodedPlace, lat, lng, aiConfidence);
    }

    if (!isCurrentSearch(searchId)) return;

    if (!result) {
        elements.wiki.innerHTML = "";
        return;
    }

    // Keep rendering simple here. Article selection and filtering already happened in the cascade.
    const text = result.extract;

    elements.wiki.innerHTML =
        "<strong>" + result.title + "</strong><br>" +
        text + " " +
        (result.fullurl ? '<a href="' + result.fullurl + '" target="_blank">' + READ_MORE_TRANSLATIONS[uiLang] + '</a>' : "");

}

// ── Wikipedia cascade orchestration ────────────────────────────────

/**
 * Runs the Wikipedia article matching cascade.
 *
 * Fallback logic:
 * 1. Search English Wikipedia with the current generated query.
 *
 * 2. If an English result is found and the UI language is not English:
 *    a. Try to find the translated article title in the current UI language.
 *    b. Only at the local fallback index, also try local-language fallbacks
 *       before keeping the English result. This index is usually the first
 *       generated query, but shifts when buildWikiFallbackQueries() adds a
 *       blacklisted/simplified query or when geocoding itself had to fall back.
 *       This gives the cascade a chance to try those safer generated queries
 *       before switching to local title search or coordinate geosearch.
 *    c. If translation or step 2b fails, keep the English result as a fallback.
 *    d. First try searching the local-language Wikipedia using the geocoded shortName.
 *    e. If that fails, try local-language coordinate geosearch.
 *    f. If those local fallbacks fail, keep the original English result.
 *
 * 3. If no English result is found:
 *    a. Only at the local fallback index, try local-language fallbacks. This waits
 *       until any blacklisted/simplified wiki query and/or geocoder fallback query
 *       has had a chance to run first.
 *    b. First try searching the local-language Wikipedia using the geocoded shortName.
 *    c. Then try local-language coordinate geosearch.
 *    d. If the UI language is not English, also try English coordinate geosearch,
 *       then translate that result if possible.
 *
 * 4. If nothing works, continue to the next generated query.
 *
 * @returns {Promise<Object|null>} A Wikipedia page object, or null.
 */
async function getWikiResult(aiPlace, geocodedPlace, lat, lng, aiConfidence) {

    wikiQueryWasBlacklisted = 0;

    const queries = buildWikiFallbackQueries(aiPlace);

    const localFallbackIndex = wikiQueryWasBlacklisted + didGeocodingFallBack;

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

            //Step 2b
            if (i === localFallbackIndex) {
                const enResult = result;

                result = await getWikiData(geocodedPlace, uiLang, lat, lng, aiConfidence);
                if (result) break;

                result = await wikiGeoSearch(geocodedPlace, uiLang, lat, lng, aiConfidence);
                if (result) break;

                result = enResult;
            }
        }

        //Step 2c : English result from step 1 is kept but only after 2b
        if (result) {
            if (uiLang === "en") break;

            const shouldWaitForLocalFallback =
                i < localFallbackIndex &&
                localFallbackIndex < queries.length;

            if (!shouldWaitForLocalFallback) break;

            result = null;
        }

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

// ── Wikipedia API calls ────────────────────────────────────────────

/**
 * Searches Wikipedia by title text and returns the best accepted page.
 * The raw search results are noisy, so selection is delegated to
 * pickBestWikiResult().
 */
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

/**
 * Fetches one exact Wikipedia page by title.
 * This is used after a langlink translation, where the title should already be
 * the correct local-language article.
 */
async function getWikiPageByTitle(title, language) {
    const url = buildWikiApiUrl(language, "&titles=" + encodeURIComponent(title));

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const pages = Object.values((data.query && data.query.pages) || {});
    const page = pages[0];

    // Missing, disambiguation, and list pages are not useful as result summaries.
    if (!page || page.missing !== undefined) return null;
    if (page.pageprops && Object.prototype.hasOwnProperty.call(page.pageprops, "disambiguation")) return null;
    if (isListPage(page)) return null;

    return page;
}

/**
 * Searches Wikipedia pages near the mapped coordinates.
 * This is a fallback for cases where title search fails but the mapped location
 * is accurate enough to find a nearby article.
 */
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

/**
 * Builds a Wikipedia API URL with the shared page properties needed by scoring.
 * Langlinks are fetched broadly because isProperNounAcrossLanguages() needs a
 * sample of translated titles to reject generic or mismatched pages.
 */
function buildWikiApiUrl(language, params) {
    return "https://" + language + ".wikipedia.org/w/api.php?action=query" +
        params +
        "&redirects=1" +
        "&prop=extracts|coordinates|info|langlinks|pageprops" +
        "&exintro=1" +
        "&explaintext=1" +
        "&inprop=url" +
        "&lllimit=max" +
        "&format=json" +
        "&origin=*";
}

// ── Query generation ───────────────────────────────────────────────

/**
 * Builds title-search variants for Wikipedia.
 * Wikipedia articles often use shorter names than geocoders, so the cascade
 * tries the primary name, a simplified primary name, parent-context variants,
 * and finally the cleaned full query.
 *
 * @param {string} query Place query from AI or EXIF conversion.
 * @returns {string[]|null} Search queries ordered from safest to broadest.
 */
function buildWikiFallbackQueries(query) {

    if (!query) return null;

    // Remove slash alternatives because Wikipedia search usually prefers one title.
    const cleaned = query.replace(/(\w+)\/(\w+)/g, "$1");
    const parts = cleaned.split(",").map(p => p.trim()).filter(Boolean);

    const primary = parts[0] || cleaned;
    const country = parts.length > 1 ? parts[parts.length - 1] : null;
    const admin = parts.length > 2 ? parts[1] : null;

    const queries = [];

    queries.push(primary);

    /*
     * Removing generic descriptors gives canonical titles a chance. For example,
     * "Mount Teide" may need a plain "Teide" search.
     */
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
        // Tell the main cascade to wait one query longer before local fallbacks.
        wikiQueryWasBlacklisted++;
    }

    // Add parent context without commas because Wikipedia search often matches that better.
    if (country) {
        queries.push(primary + " " + country);
    }

    if (admin) {
        queries.push(primary + " " + admin);
    }

    queries.push(cleaned);

    return queries;
}

// ── Article scoring and selection ──────────────────────────────────

/**
 * Scores and selects the safest Wikipedia page from raw API results.
 * A page must survive structural filters, title matching, coordinate checks, and
 * a cross-language proper noun sanity check before it is accepted.
 *
 * @param {Object[]} results Raw Wikipedia pages.
 * @param {string} query Query used for this search.
 * @param {number|null} lat Mapped latitude.
 * @param {number|null} lng Mapped longitude.
 * @param {string} aiConfidence Result confidence level.
 * @returns {Object|null} Best accepted page.
 */
function pickBestWikiResult(results, query, lat, lng, aiConfidence) {
    // Structural pages are filtered before scoring because they are never useful as excerpts.
    results = results.filter(function (r) {
        return !(r.pageprops && Object.prototype.hasOwnProperty.call(r.pageprops, "disambiguation"));
    });

    results = results.filter(function (r) {
        return !isListPage(r);
    });

    const scored = results.map(function (r, index) {
        let score = wikiTitleScore(r.title || "", query);
        let isClose = false;

        /*
         * Coordinates are a strong sanity check. A title can match perfectly while still
         * referring to the wrong place, especially with reused names.
         */
        if (lat != null && lng != null && r.coordinates && r.coordinates[0]) {
            const dist = haversineKm(lat, lng, r.coordinates[0].lat, r.coordinates[0].lon);

            let maxDist =
                aiConfidence === "country" ? 1000 :
                    aiConfidence === "region" ? 300 :
                        aiConfidence === "exif" ? 70 :
                            aiConfidence === "city" ? 50 :
                                aiConfidence === "landmark" ? 30 :
                                    1;
            // When geocoding had to fall back, the mapped point may be broader than usual.
            if (didGeocodingFallBack) maxDist = 800;

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

        // Wikipedia search order is useful as a tie-breaker, but should not override better evidence.
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

    /*
     * A very close, high-scoring coordinate match can be accepted directly. Other
     * candidates need the proper-noun check to avoid generic title matches.
     */
    for (let i = 0; i < scored.length; i++) {
        if (scored[i].close && scored[i].score >= 90) return scored[i].page;
        if (isProperNounAcrossLanguages(scored[i].page)) {
            return scored[i].page;
        }
    }

    return null;
}

/**
 * Scores how well a Wikipedia title matches the query.
 * Exact token matches score highest, partial title matches are penalized, and
 * suspicious prefixes or accent loss can reject otherwise tempting matches.
 */
function wikiTitleScore(title, query) {
    const primaryQuery = query.split(",")[0].trim();
    const primaryTokens = tokenizePlaceName(primaryQuery);
    const titleTokens = tokenizePlaceName(title);

    if (primaryTokens.length === 0 || titleTokens.length === 0) return -100;

    /*
     * Extra words before the first query token often mean the title is a different
     * concept that merely contains the place name.
     */
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

    /*
     * If the query includes an accent and the title only matches after removing it,
     * prefer rejecting the page. This avoids accepting a different proper noun that
     * only looks similar without diacritics.
     */
    const queryHasAccent = hasAccent(primaryQuery);
    const titleHasAccent = hasAccent(title);

    const accentInsensitiveMatch =
        stripAccents(primaryQuery) === stripAccents(title);

    const badAccentDirection =
        queryHasAccent &&
        !titleHasAccent &&
        accentInsensitiveMatch;

    // Best case: title and query contain the same meaningful tokens.
    if (
        containsTokens(primaryQuery, title) &&
        containsTokens(title, primaryQuery) &&
        !hasForeignPrefix
    ) {
        if (badAccentDirection) return -100;

        return 100;
    }

    // Accept titles that contain all primary tokens, but penalize extra title words.
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

    // Also allow shorter canonical titles when the query was more descriptive.
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

/**
 * Checks whether a page title behaves like a stable proper noun across languages.
 * Real place names often keep at least one recognizable token across many
 * translated titles. Generic concepts and wrong matches tend to change more.
 */
function isProperNounAcrossLanguages(page) {

    // With too few langlinks, there is not enough evidence to reject the page safely.
    if (!page) return true;
    if (!page.langlinks || page.langlinks.length < 3) return true;

    const allTitles = page.langlinks.map(function (l) { return l["*"]; });
    allTitles.push(page.title);

    // Require a token to appear in a meaningful minority of translated titles.
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

// ── Article filter helpers ─────────────────────────────────────────

// List pages usually summarize many places and make poor result excerpts.
function isListPage(page) {
    const title = (page.title || "").toLowerCase().trim();

    return title.startsWith("list of ") ||
        title.startsWith("lists of ");
}

// Detects whether the original string used diacritics before normalization.
function hasAccent(str) {
    return /[\u0300-\u036f]/.test((str || "").normalize("NFD"));
}

// Lowercase accent-free form used for conservative title comparison.
function stripAccents(str) {
    return (str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

// ── Article translation helpers ────────────────────────────────────

/**
 * Converts an accepted English wiki result into the current UI language.
 * If translation fails, callers can still decide whether to keep the English
 * page or continue through local fallbacks.
 */
async function translateWikiResultToCurrentLang(result) {
    if (!result || uiLang === "en") return null;

    const translatedTitle = await getWikiTitleTranslation(result);
    if (!translatedTitle) return null;

    return await getWikiPageByTitle(translatedTitle, uiLang);
}

/**
 * Gets the local-language title for a Wikipedia page.
 * The normal API response usually includes langlinks, but a targeted fallback is
 * kept because generated search responses can occasionally omit the needed link.
 */
async function getWikiTitleTranslation(page) {
    if (!page || uiLang === "en") return null;

    if (page.langlinks) {
        const match = page.langlinks.find(function (link) {
            return link.lang === uiLang;
        });

        if (match) return match["*"];
    }

    return await getWikiTitleTranslationFromApi(page.title);
}

/**
 * Performs a targeted langlink lookup for one English article title.
 * This is the recovery path when the broader search response did not include
 * the selected UI language in its langlinks.
 */
async function getWikiTitleTranslationFromApi(title) {
    if (!title || uiLang === "en") return null;

    /*
     * Ask only for the selected UI language here. The broad langlink list is useful
     * for scoring, but this fallback only needs one exact translation.
     */
    const url = "https://en.wikipedia.org/w/api.php?action=query" +
        "&titles=" + encodeURIComponent(title) +
        "&redirects=1" +
        "&prop=langlinks" +
        "&lllang=" + encodeURIComponent(uiLang) +
        "&lllimit=1" +
        "&format=json" +
        "&origin=*";

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.warn("Wiki targeted translation search failed:", response.status, response.statusText);
            return null;
        }

        const data = await response.json();
        const pages = Object.values((data.query && data.query.pages) || {});
        const page = pages[0];

        return page && page.langlinks && page.langlinks[0]
            ? page.langlinks[0]["*"]
            : null;

    } catch (e) {
        console.warn("Wiki targeted translation search failed:", e);
        return null;
    }
}