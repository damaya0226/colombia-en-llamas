/* ─────────────────────────────────────────────────────────
   app.js — Main orchestrator (real API + mock fallback)
───────────────────────────────────────────────────────── */
'use strict';

// ── Loading indicator helpers
function showLoading(year) {
    const el = document.getElementById('year-wm');
    el.style.opacity = '0.5';
}
function hideLoading() {
    document.getElementById('year-wm').style.opacity = '1';
}

// ── Render a year using real API for conflict, mock for coca/defo
async function renderYear(year) {
    const mockData = ColombiaData.getYear(year);

    // Always update coca + deforestation immediately from mock (UNODC/IDEAM data is embedded)
    ColombiaMap.updateData(mockData);
    ColombiaUI.updateStats(mockData);

    // Pre-warm neighbors for smoother playback
    ColombiaAPI.prewarm(year);

    // Fetch real conflict data and overlay it
    showLoading(year);
    const realData = await ColombiaAPI.fetchYear(year);
    hideLoading();

    if (realData && realData.geojson && realData.geojson.features.length > 0) {
        // Replace conflict layer with real API data
        ColombiaMap.updateConflictLayer(realData.geojson);

        // Update victim count with real data
        const realVictimCount = realData.count;
        ColombiaUI.updateConflictStat(realVictimCount, year);
    }
    // If API fails, mock conflict layer is already on the map from updateData above
}

(function main() {
    ColombiaMap.init();

    ColombiaMap.onReady(() => {
        ColombiaUI.init((year) => renderYear(year));
        renderYear(1985);
    });
})();
