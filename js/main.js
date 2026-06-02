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
 * Stadia Maps serves the styled raster tiles. Labels appear in each location's
 * native script, which fits a photo geolocator: the map mirrors how each place
 * actually labels itself in the world.
 *
 * A CARTO fallback handles tile failures (rate limit, outage, blocked region):
 * if a Stadia tile request fails, the same z/x/y tile is fetched from CARTO so
 * the map keeps rendering.
 */
function fallbackToCarto(e, cartoStyle) {
    const subdomain = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
    e.tile.src = 'https://' + subdomain + '.basemaps.cartocdn.com/' + cartoStyle +
        '/' + e.coords.z + '/' + e.coords.x + '/' + e.coords.y + '.png';
}

const stadiaOptions = {
    tileSize: 256,
    maxZoom: 20,
    attribution: '<a href="https://www.stadiamaps.com/" target="_blank">© Stadia Maps</a> <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
    crossOrigin: true,
    errorTileUrl: ''
};

const map = L.map('map').setView([0, 0], 2);

const mapLayerLight = L.tileLayer(
    'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=' + STADIA_API_KEY,
    stadiaOptions
).on('tileerror', function (e) { fallbackToCarto(e, 'rastertiles/voyager'); });

const mapLayerDark = L.tileLayer(
    'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=' + STADIA_API_KEY,
    stadiaOptions
).on('tileerror', function (e) { fallbackToCarto(e, 'dark_all'); });

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18,
    attribution: '© Esri'
});

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