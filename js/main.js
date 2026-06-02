/*
 * App startup.
 *
 * This file restores saved preferences, creates the Leaflet map, creates the
 * Panel instance, applies the initial theme and map layer, then wires the upload
 * input. It should load last because it depends on the globals defined by the
 * other script files.
 */

/*
 * Use the browser language as the first default when the app supports it.
 * Saved language preference is applied below and takes priority.
 */
const browserLang = navigator.language.split("-")[0];
if (TRANSLATIONS[browserLang]) {
    uiLang = browserLang;
    changeLanguage();
}

/*
 * Restore saved user preferences before the map and panel are finalized.
 * These values control the initial layer, theme, language, and unit system.
 */
const savedDark = localStorage.getItem("isDark");
if (savedDark !== null) isDark = savedDark === "true";

const savedSatellite = localStorage.getItem("isSatellite");
if (savedSatellite !== null) isSatellite = savedSatellite === "true";

const savedLang = localStorage.getItem("uiLang");
if (savedLang !== null && TRANSLATIONS[savedLang]) {
    uiLang = savedLang;
    changeLanguage();
}

/*
 * Default US English users to imperial units, unless they already chose a saved
 * preference.
 */
if (uiLang === "en" && navigator.language === "en-US") isImperial = true;

const savedImperial = localStorage.getItem("isImperial");
if (savedImperial !== null) isImperial = savedImperial === "true";

/*
 * Wait one frame before aligning translated labels, so fonts and text widths are
 * available.
 */
setTimeout(alignToggleChevrons, 50);

document.querySelector('[data-lang="' + uiLang + '"]').classList.add("active-lang");

/*
 * Base map setup.
 *
 * Light mode uses CARTO directly (no key needed, no rate limits to worry about).
 * Dark mode uses Stadia for a more polished look, with CARTO's dark_all as a
 * fallback if Stadia tile requests fail.
 *
 * Satellite uses Esri imagery
 */

const mapLayerLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
});

const mapLayerDark = L.tileLayer(
    'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=' + STADIA_API_KEY,
    {
        tileSize: 256,
        maxZoom: 20,
        attribution: '<a href="https://www.stadiamaps.com/" target="_blank">© Stadia Maps</a> <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a>',
        crossOrigin: true,
        errorTileUrl: ''
    }
).on('tileerror', function (e) {
    const subdomain = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
    e.tile.src = 'https://' + subdomain + '.basemaps.cartocdn.com/dark_all/' +
        e.coords.z + '/' + e.coords.x + '/' + e.coords.y + '.png';
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: '© Esri'
});

const map = L.map('map').setView([0, 0], 2);

mapLayerLight.addTo(map);

map.attributionControl.setPrefix('<a href="https://github.com/antonin-gg" target="_blank">© A.G.</a>');

elements.welcome.textContent = translate("welcome");

/*
 * The panel needs the map instance for invalidateSize calls and state-dependent
 * map behavior, so it is created after the map.
 */
const panel = new Panel(map);

/*
 * Apply saved visual state.
 * Dark mode changes the UI and styled base layer. Satellite mode overrides the
 * styled map layer entirely.
 */
if (isDark) {
    applyTheme();
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

/*
 * Start a search when the user selects an image.
 */
elements.imageInput.addEventListener("change", function (e) { locateImage(e.target) });