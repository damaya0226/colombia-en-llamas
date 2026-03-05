/* ─────────────────────────────────────────────────────────
   ui.js — Timeline, stats counter, layer toggles
───────────────────────────────────────────────────────── */
'use strict';

const ColombiaUI = (() => {
    let currentYear = 1985;
    let playing = false;
    let timer = null;
    let intervalMs = 900;
    let onYearChange = null;

    // ── Number animation
    function animateNumber(el, target) {
        const current = parseInt(el.textContent.replace(/\D/g, '')) || 0;
        if (current === target) return;
        const diff = target - current;
        const steps = 18;
        const step = diff / steps;
        let count = 0;
        const tick = () => {
            count++;
            const val = Math.round(current + step * count);
            el.textContent = val.toLocaleString('es-CO');
            if (count < steps) requestAnimationFrame(tick);
            else el.textContent = target.toLocaleString('es-CO');
        };
        requestAnimationFrame(tick);
    }

    function updateStats(yearData) {
        const { victims, cocaHa, defoHa } = yearData.stats;
        const year = yearData.year;
        const cumul = ColombiaData.getCumulativeVictims(year);

        document.getElementById('stats-year').textContent = year;
        document.getElementById('year-wm').textContent = year;

        animateNumber(document.getElementById('v-conflict'), victims);
        animateNumber(document.getElementById('v-coca'), cocaHa);
        animateNumber(document.getElementById('v-defo'), defoHa);
        animateNumber(document.getElementById('v-cumulative'), cumul);

        // colour-code intensity
        const intensity = yearData.stats.conflictInt;
        const wm = document.getElementById('year-wm');
        if (intensity > 0.8) wm.style.color = 'rgba(239,68,68,0.09)';
        else if (intensity > 0.5) wm.style.color = 'rgba(245,158,11,0.07)';
        else wm.style.color = 'rgba(255,255,255,0.035)';
    }

    // ── Slider
    function initSlider() {
        const slider = document.getElementById('timeline');
        const fill = document.getElementById('slider-fill');

        function updateFill() {
            const pct = (slider.value - 1985) / (2025 - 1985) * 100;
            fill.style.width = pct + '%';
        }

        slider.addEventListener('input', () => {
            currentYear = parseInt(slider.value);
            updateFill();
            if (onYearChange) onYearChange(currentYear);
        });

        updateFill();
    }

    // ── Playback
    function setYear(y) {
        currentYear = y;
        const slider = document.getElementById('timeline');
        slider.value = y;
        const pct = (y - 1985) / (2025 - 1985) * 100;
        document.getElementById('slider-fill').style.width = pct + '%';
        if (onYearChange) onYearChange(y);
    }

    function startPlay() {
        if (currentYear >= 2025) setYear(1985);
        playing = true;
        document.getElementById('icon-play').style.display = 'none';
        document.getElementById('icon-pause').style.display = 'inline';
        document.getElementById('play-label').textContent = 'Pausar';

        const tick = () => {
            if (!playing) return;
            if (currentYear < 2025) {
                setYear(currentYear + 1);
                timer = setTimeout(tick, intervalMs);
            } else {
                stopPlay();
            }
        };
        timer = setTimeout(tick, intervalMs);
    }

    function stopPlay() {
        playing = false;
        clearTimeout(timer);
        document.getElementById('icon-play').style.display = 'inline';
        document.getElementById('icon-pause').style.display = 'none';
        document.getElementById('play-label').textContent = 'Reproducir';
    }

    function initPlayback() {
        document.getElementById('play-btn').addEventListener('click', () => {
            playing ? stopPlay() : startPlay();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            stopPlay();
            setYear(1985);
        });

        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                intervalMs = parseInt(btn.dataset.ms);
            });
        });
    }

    // ── Layer toggles
    function initLayerToggles() {
        document.querySelectorAll('.layer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const layer = btn.dataset.layer;
                const isActive = ColombiaMap.toggleLayer(layer);
                btn.classList.toggle('active', isActive);

                const statId = { conflict: 'sb-conflict', coca: 'sb-coca', defo: 'sb-defo' }[layer];
                if (statId) {
                    document.getElementById(statId).classList.toggle('dimmed', !isActive);
                }
            });
        });
    }

    return {
        init(yearChangeCb) {
            onYearChange = yearChangeCb;
            initSlider();
            initPlayback();
            initLayerToggles();
        },
        updateStats,
        getCurrentYear: () => currentYear,
    };
})();
