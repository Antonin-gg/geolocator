/*
 * App configuration and shared constants.
 *
 * This file contains values that are read by several parts of the app: external
 * service endpoints, the AI prompt, SVG icon strings, animation timings, gesture
 * thresholds, and UI delays. Keeping them together makes it easier to tune the
 * app without hunting through the files.
 *
 * Most constants here are intentionally global because the project uses plain
 * script files instead of modules.
 */

// External services used by geocoding and AI identification.
const STADIA_API_KEY = "ad458a92-6631-4afe-95ca-8fc26f5498e4";
const MAPTILER_API_KEY = "p0sSWaGV2NHhSvdpC8uI";
const OPENCAGE_WORKER_URL = "https://geolocator-opencage.a-gg.workers.dev";
const AI_WORKER_URL = "https://geolocator-ai.a-gg.workers.dev";
const AI_MODEL = "gpt-5.5";

/*
 * Static AI prompt shared by all requests.
 *
 * Language-specific instructions are appended at request time in locator.js.
 * Keeping the large stable part here helps prompt caching, while still letting
 * the selected UI language change without duplicating the whole prompt.
 */
const AI_PROMPT = "Look at this image and identify where in the world it was taken.\n\nLANGUAGE — CRITICAL: All user-facing text fields (method, displaySentence) MUST be written in the language specified in the system instructions appended to this prompt. Only the \"place\" field stays in English (it is used for geocoding lookups, not displayed to the user). If you are uncertain which language to use, default to English. Never mix languages within a single response.\n\nRespond with ONLY a JSON object in this exact format, nothing else:\n{\n  \"place\": \"the most specific location name you can identify, ALWAYS in English for geocoding\",\n  \"countryCode\": \"ISO 3166-1 alpha-2 country code for the identified location, uppercase, or empty string if unknown\",\n  \"confidence\": \"landmark\" | \"city\" | \"region\" | \"country\" | \"unknown\" | \"space\",\n  \"method\": \"a single short sentence explaining the key visual evidence used to identify this location, written in the user's language\",\n  \"displaySentence\": \"a complete, grammatically natural sentence in the user's language announcing where the photo was taken, with the place name written naturally in that language and woven into the sentence. Empty string if confidence is unknown.\"\n}\n\nABSOLUTE RULE — check this first before anything else: If the image is clearly not a real photograph taken by a camera in the real world — this includes cartoons, illustrations, paintings, drawings, sketches, AI-generated images, screenshots of apps or websites, social media posts, food delivery or e-commerce interfaces, video game captures, memes, or any digital interface with visible UI elements — you MUST set confidence to \"unknown\", place to \"unknown\", countryCode to an empty string, method to \"This image is not a real photograph.\" (translated to the user's language), and displaySentence to an empty string. This rule applies ONLY when the image is clearly not a real-world camera photo. ATTENTION : If the image appears to be a real photo but the location cannot be identified, DO NOT SAY it is not a real photograph; instead return \"unknown\" because the location is not identifiable.\n\nEvidence rules — apply before identifying any location:\n- Use a balanced evidence standard. The goal is to identify locations when the visible evidence strongly converges, while refusing uncertain or generic cases.\n- Prioritize unique, explicit, low-frequency clues: flags, language, script, signage, road markings, architecture, culturally specific objects.\n- License plates indicate where a vehicle is registered, not necessarily where the photo was taken. Treat license plates as supporting evidence only when they agree with other independent visible context, such as readable local signage, flags, road markings, architecture, landscape, or country-specific street details. A license plate alone IS NOT ENOUGH to identify a country, city, region, or landmark. If the only meaningful clue is a license plate, return \"unknown\".\n- Treat terrain and landscape as weak evidence unless combined with unique identifiers.\n- Mountain ranges, arid landscapes, forests, coastlines, and generic rural or urban scenes are not sufficient evidence on their own — return \"unknown\" UNLESS the landscape has highly distinctive, well-known features that strongly narrow the location, or unless it is combined with independent non-landscape clues.\n- Generic modern architecture (glass facades, clean lines, light wood interiors, minimalist design, contemporary airports, shopping centers, office buildings) is NOT sufficient evidence on its own. These styles are global. Return \"unknown\" for modern buildings unless distinctive non-architectural clues are present (visible signage in a specific language, flags, named branding, identifiable surroundings).\n- Partial views of buildings (close-ups, sections, interiors without clear identifying features) cannot be confidently identified unless they contain a recognisable named element. A glass wall, a staircase, a generic interior — these are not identifiable. Return \"unknown\".\n- Replicas, themed structures, mall displays, and decorative monuments do not identify the real landmark or its city. Return unknown unless independent evidence (signage, surroundings) confirms the location.\n- Do NOT rely on visual similarity or vibe. Avoid bias toward overrepresented regions (USA, Western Europe) without explicit evidence.\n- Spanish-speaking countries can be confused easily: Spain, Mexico, Argentina, Colombia and others share language and some architectural styles. Look for distinguishing details — license plates, flags, peninsular vs Latin American architecture, regional vegetation, or text using country-specific vocabulary.\n- If a rare or region-specific clue is present, it overrides generic landscape similarity.\n- Before deciding, internally test whether any visible detail contradicts your candidate location. If it does, eliminate it.\n- Always answer at the highest safe level of specificity: landmark if certain, otherwise city, otherwise region, otherwise country, otherwise unknown.\n- Do not over-refuse when the image contains enough combined evidence for a country, region, city, or landmark.\n- Do not over-specify. If the exact city is uncertain but the country or region is likely, return the safer broader level.\n- If two or more plausible places remain after checking contradictions, return unknown or choose the broader shared level.\n- A wrong specific answer is worse than a broader correct answer.\n- If multiple locations that don't have a broader shared level remain plausible after elimination, return \"unknown\".\n- For photos not taken on Earth (Moon, Mars, ISS, deep space, other planets or astronomical objects): set confidence to \"space\", set the English \"place\" field to \"unknown\", countryCode to an empty string, write method explaining the visual evidence used, and write displaySentence as a complete sentence announcing where the photo was taken with a note that it cannot be shown on the map. Example displaySentence: \"This photo was taken on the Moon, which cannot be displayed on this map.\"\n\nFormatting rules (for the English \"place\" field):\n- Always separate parts of a location with commas. Never join two place names with just a space. Correct: \"Luxembourg, Luxembourg\", \"Mexico City, Mexico\", \"Panama City, Panama\". Incorrect: \"Luxembourg Luxembourg\", \"Mexico Mexico\".\n- Use commas to separate the place from its region or country in every confidence level.\n- If unknown, return \"unknown\".\n\nIdentification rules :\n- Confidence is fundamentally about how the place appears on a map. A landmark is a pinpoint — something you would mark with a single pin. A city/neighborhood/district is an urban area. A region is an outlined large area — something you would draw as a polygon. Use this mental test whenever you are uncertain.\n- Use \"landmark\" ONLY for a specific, individually named physical object or site with a small footprint on a map: a single building, monument, tower, bridge, statue, station, temple, church, museum, stadium, waterfall, cliff viewpoint, or named attraction. Include city/region and country (e.g. \"Eiffel Tower, Paris, France\", \"Berliner Dom, Berlin, Germany\", \"Cliffs of Moher, County Clare, Ireland\").\n- Do NOT use \"landmark\" for named urban areas. Named districts, business districts, financial districts, neighborhoods, suburbs, quarters, boroughs, city zones, plazas used as districts, and urban redevelopment areas are \"city\", not \"landmark\". Examples: \"La Défense, Île-de-France, France\" is \"city\"; \"Manhattan, New York, USA\" is \"city\"; \"Shibuya, Tokyo, Japan\" is \"city\"; \"Canary Wharf, London, United Kingdom\" is \"city\". Only use \"landmark\" if the image clearly identifies one specific building, monument, station, bridge, tower, statue, or attraction inside that area.\n- If the place name can refer both to an area and to a specific object, choose \"city\" unless the specific object is visually identifiable. For example, \"La Défense\" alone is a district, not a landmark; \"Grande Arche de la Défense, Puteaux, France\" is a landmark.\n- Use \"city\" for any urban area with high certainty: village, town, suburb, neighborhood, district, business district, financial district, quarter, borough, city zone, or city. Include region/state if ambiguous (e.g. \"Portland, Oregon, USA\"). When the city and country share a name, format with a comma between them (e.g. \"Luxembourg, Luxembourg\", \"Singapore, Singapore\", \"Monaco, Monaco\").\n- Use \"region\" for any large named area that covers significant geographic extent rather than a single point: states, provinces, country subdivisions, recognised natural regions (Patagonia, Tuscany, Bavaria, Provence, Cornwall, Sahara), national parks and protected areas (Yellowstone, Serengeti), archipelagos and major islands (Lofoten, Galápagos, Easter Island), mountain ranges, peninsulas, and similar large features. Use this whenever the place is something you would draw on a map as an outlined area rather than a pin.\n- Use \"country\" only if the country is identifiable with high certainty but nothing more specific.\n- Use \"unknown\" if: evidence is weak or generic, multiple locations remain plausible, or any visible detail is inconsistent with the chosen answer.\n- For locations that span multiple countries (waterfalls, mountains, lakes on borders): pick ONE country to anchor the location — the most photographed side or the side most visible in the image — rather than listing both. E.g. \"Iguazu Falls, Paraná, Brazil\" or \"Iguazu Falls, Misiones, Argentina\" — never \"Iguazu Falls, Argentina/Brazil\". The same applies to any cross-border feature.\n\nGeocodability rules — the \"place\" field will be sent to Nominatim and OpenCage for lookup. Optimize for these geocoders:\n- Use the most common and shortest official name. Not \"The Republic of South Africa\" but \"South Africa\".\n- Preserve official accents and diacritics in Latin-script place names when they are normally used, especially for cities, regions, and countries: \"Liège, Belgium\", not \"Liege, Belgium\"; \"São Luís, Maranhão, Brazil\", not \"Sao Luis, Maranhao, Brazil\";\n- Drop English-attached descriptors that aren't part of the canonical name: \"Lofoten\" not \"Lofoten Islands\", \"Atacama\" not \"Atacama Desert\", \"Galápagos\" not \"Galápagos Islands\". Use descriptors ONLY when they're part of the official name (e.g., \"Great Barrier Reef\", \"Easter Island\").\n- ALWAYS include the administrative parent (region/state/province) between a natural feature and the country (e.g., \"Lofoten, Nordland, Norway\", not \"Lofoten, Norway\").\n- Never use slashes or \"or\": \"Iguazu Falls, Misiones, Argentina\" not \"Iguazu Falls, Argentina/Brazil\".\n- Use English exonyms only when the English name is genuinely different from the local name, not merely a diacritic-free spelling. Still use true English exonyms where standard: \"Munich\" not \"München\", \"Florence\" not \"Firenze\", \"Moscow\" not \"Москва\".\n\nMethod rules:\n- The method must be a single concise sentence describing the most decisive visual evidence used to identify the location, in the user's language.\n- Be specific about what was recognised: the landmark name, the language on signage, the type of architecture, a national flag, distinctive vegetation, etc.\n- Examples (shown in English but should be written in the user's language):\n  - \"The building in the image was identified as Berliner Dom.\"\n  - \"Arabic script on the storefronts and the surrounding architecture indicate a certain Gulf country.\"\n  - \"The basalt sea stacks and turf-roofed houses are characteristic of the Faroe Islands.\"\n  - \"Road signage in Portuguese combined with the tropical urban landscape points to Brazil.\"\n- If confidence is \"unknown\" and the image appears to be a real photo, set method to a single sentence in the user's language explaining that the location could not be determined from the visible evidence. Do not say the image is not a real photograph unless it clearly is not one.\n\ndisplaySentence rules:\n- The displaySentence must be a complete, grammatically natural sentence in the user's language announcing where the photo was taken. It is shown directly to the user.\n- Write the place name naturally in the user's language inside the sentence: translate country names, region names, and well-known city names; keep proper nouns (specific landmark names, small place names) in their original form when no translation exists.\n- Weave the place name into the sentence according to the grammar of the user's language. Different languages place prepositions, particles, and word order differently, write whatever sounds natural.\n- Example for the location \"Berliner Dom, Berlin, Germany\":\n  - English: \"This photo was taken at Berliner Dom in Berlin, Germany.\"\n- If confidence is \"unknown\", set displaySentence to an empty string \"\".\n\nFinal check — MANDATORY before returning your answer:\n- Ask: what is the strongest piece of evidence, and does it uniquely support this location?\n- Is the chosen specificity safe, or should it be broader?\n- Verify that method and displaySentence are in the user's specified language.\n\nDo not make unsupported guesses. Prefer a broader correct answer over a risky precise answer.\nReturn unknown only when even a broader answer is not well supported.\n\nReturn ONLY the JSON object, no explanation, no markdown.";

/*
 * Words removed from some wiki fallback queries.
 *
 * These descriptors often make a good AI place name harder for Wikipedia search
 * to match. Removing them gives the cascade a simpler second attempt while the
 * original full query is still tried first.
 */
const STOPWORDS = ["the", "and", "of", "de", "mount", "mountain", "volcano", "island", "islands", "lake"];

/*
 * Inline SVGs used by the compact mobile controls.
 *
 * Keeping them as strings avoids extra icon files and lets the buttons inherit
 * the current text color from the active theme.
 */
const ICONS = {
    moon: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>',

    sun: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v1"/><path d="M12 20v1"/><path d="M3 12h1"/><path d="M20 12h1"/><path d="m18.364 5.636-.707.707"/><path d="m6.343 17.657-.707.707"/><path d="m5.636 5.636.707.707"/><path d="m17.657 17.657.707.707"/></svg>',

    map: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>',

    satellite: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m13.5 6.5-3.148-3.148a1.205 1.205 0 0 0-1.704 0L6.352 5.648a1.205 1.205 0 0 0 0 1.704L9.5 10.5"/><path d="M16.5 7.5 19 5"/><path d="m17.5 10.5 3.148 3.148a1.205 1.205 0 0 1 0 1.704l-2.296 2.296a1.205 1.205 0 0 1-1.704 0L13.5 14.5"/><path d="M9 21a6 6 0 0 0-6-6"/><path d="M9.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l4.296-4.296a1.205 1.205 0 0 0 0-1.704l-2.296-2.296a1.205 1.205 0 0 0-1.704 0z"/></svg>',

    language: '<svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>'
};

/*
 * UI timing constants.
 *
 * Values that mirror CSS transitions should stay in sync with the matching CSS.
 * The JS waits for these durations before measuring layout or restoring map
 * size, so mismatches can create small visual jumps.
 */
const ERROR_DISPLAY_MS = 3000;
const PANEL_TRANSITION_MS = 300;

/*
 * Map and layout tuning.
 *
 * The ultra map peek must match the width left visible by the ultra panel CSS.
 * Padding is kept small so fitted bounds remain visible inside the reduced map
 * area when the panel is open.
 */
const ULTRA_MAP_PEEK_PX = 30;
const MAP_FIT_PADDING_PX = 15;
const DEFAULT_ZOOM = 13;

/*
 * Mobile mode breakpoints.
 *
 * Touch devices always use the mobile layout. These breakpoints only
 * decide when non-touch devices should also switch to the compact layout.
 */
const MOBILE_MAX_WIDTH = 768;
const LANDSCAPE_MAX_HEIGHT = 500;

/*
 * Gesture thresholds.
 *
 * Distance handles deliberate drags, velocity handles quick flicks, and axis
 * lock prevents diagonal movement from switching meaning halfway through a
 * gesture.
 */
const SWIPE_DISTANCE = 40;
const SWIPE_VELOCITY = 0.4;
const AXIS_LOCK = 8;
const SNAP_RESISTANCE = 0.4;
const COMMIT_THRESHOLD_RATIO = 0.3;
const DOWN_DRAG_RESISTANCE = 0.2;
const CLOSE_SWIPE_DISTANCE = 80;
const CLOSE_FADE_DISTANCE = 120;
const CLOSE_FADE_OPACITY = 0.6;

/*
 * Locate-user preview timings.
 *
 * The preview intentionally pauses on the user's position, then shows the
 * relation to the photo location before returning. The safety timer keeps the
 * map from staying locked if an animation event is missed.
 */
const LOCATE_BTN_DELAY_MS = 320;
const HINT_DURATION_MS = 7000;
const PREVIEW_START_DELAY_MS = 1000;
const PREVIEW_LINE_HOLD_MS = 2500;
const PREVIEW_FADE_MS = 700;
const PREVIEW_SAFETY_MS = 12000;
