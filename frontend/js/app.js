/* ─────────────────────────────────────────────────────────
   app.js — Main orchestrator
───────────────────────────────────────────────────────── */
'use strict';

(function main() {
    // 1. Init map
    ColombiaMap.init();

    // 2. When map layers are ready, hook up UI
    ColombiaMap.onReady(() => {
        // Init UI — pass the year-change callback
        ColombiaUI.init((year) => {
            const yearData = ColombiaData.getYear(year);
            ColombiaMap.updateData(yearData);
            ColombiaUI.updateStats(yearData);
        });

        // Render initial year
        const initial = ColombiaData.getYear(1985);
        ColombiaMap.updateData(initial);
        ColombiaUI.updateStats(initial);
    });
})();
