/* ─────────────────────────────────────────────────────────
   map.js — MapLibre GL JS map initialisation & layer logic
───────────────────────────────────────────────────────── */
'use strict';

const ColombiaMap = (() => {
    let map = null;
    let ready = false;
    const layerVis = { conflict: true, coca: true, defo: false };

    const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

    // ── Colour expressions
    const CONFLICT_COLOR = ['interpolate', ['linear'], ['get', 'weight'],
        0, 'rgba(239,68,68,0.1)',
        0.4, 'rgba(239,68,68,0.55)',
        1, 'rgba(255,200,200,0.9)'
    ];
    const COCA_HEATMAP_COLOR = ['interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.2, 'rgba(245,158,11,0.15)',
        0.5, 'rgba(245,158,11,0.55)',
        0.8, 'rgba(251,191,36,0.80)',
        1, 'rgba(254,240,138,0.95)'
    ];
    const DEFO_HEATMAP_COLOR = ['interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.2, 'rgba(34,197,94,0.15)',
        0.5, 'rgba(22,163,74,0.55)',
        0.8, 'rgba(16,122,54,0.80)',
        1, 'rgba(6,95,70,0.95)'
    ];

    function initSources() {
        const empty = { type: 'FeatureCollection', features: [] };
        map.addSource('conflict', { type: 'geojson', data: empty });
        map.addSource('coca', { type: 'geojson', data: empty });
        map.addSource('defo', { type: 'geojson', data: empty });
    }

    function initLayers() {
        // ── Deforestation heatmap (bottom)
        map.addLayer({
            id: 'defo-heat', type: 'heatmap', source: 'defo',
            paint: {
                'heatmap-radius': 40,
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 8, 3],
                'heatmap-weight': ['get', 'weight'],
                'heatmap-color': DEFO_HEATMAP_COLOR,
                'heatmap-opacity': 0.88,
            }
        });

        // ── Coca heatmap (middle)
        map.addLayer({
            id: 'coca-heat', type: 'heatmap', source: 'coca',
            paint: {
                'heatmap-radius': 35,
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 3, 0.7, 8, 3],
                'heatmap-weight': ['get', 'weight'],
                'heatmap-color': COCA_HEATMAP_COLOR,
                'heatmap-opacity': 0.90,
            }
        });

        // ── Conflict: outer glow
        map.addLayer({
            id: 'conflict-glow', type: 'circle', source: 'conflict',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0, 10, 1, 28],
                'circle-color': '#ef4444',
                'circle-opacity': 0.12,
                'circle-blur': 1.2,
            }
        });

        // ── Conflict: mid halo
        map.addLayer({
            id: 'conflict-halo', type: 'circle', source: 'conflict',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0, 5, 1, 14],
                'circle-color': '#ef4444',
                'circle-opacity': 0.35,
                'circle-blur': 0.6,
            }
        });

        // ── Conflict: core dot
        map.addLayer({
            id: 'conflict-core', type: 'circle', source: 'conflict',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 0, 2, 1, 5],
                'circle-color': CONFLICT_COLOR,
                'circle-opacity': 0.95,
                'circle-blur': 0,
                'circle-stroke-width': 0.5,
                'circle-stroke-color': 'rgba(255,255,255,0.3)',
            }
        });

        applyLayerVisibility();
    }

    function applyLayerVisibility() {
        if (!ready) return;
        const vis = (k) => layerVis[k] ? 'visible' : 'none';
        ['conflict-glow', 'conflict-halo', 'conflict-core'].forEach(id =>
            map.setLayoutProperty(id, 'visibility', vis('conflict'))
        );
        map.setLayoutProperty('coca-heat', 'visibility', vis('coca'));
        map.setLayoutProperty('defo-heat', 'visibility', vis('defo'));
    }

    function updateData(yearData) {
        if (!ready) return;
        map.getSource('conflict').setData(yearData.conflictGeoJSON);
        map.getSource('coca').setData(yearData.cocaGeoJSON);
        map.getSource('defo').setData(yearData.defoGeoJSON);
    }

    function toggleLayer(key) {
        layerVis[key] = !layerVis[key];
        applyLayerVisibility();
        return layerVis[key];
    }

    // ── Tooltip
    function setupTooltip() {
        const tooltip = document.getElementById('tooltip');

        map.on('mouseenter', 'conflict-core', (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const { zone, weight } = e.features[0].properties;
            const victims = Math.round(weight * 3500);
            tooltip.innerHTML = `
        <div class="tooltip-title">⚔️ ${zone}</div>
        <div class="tooltip-row">Víctimas aprox: <span>~${victims.toLocaleString('es-CO')}</span></div>
        <div class="tooltip-row">Intensidad: <span>${(weight * 100).toFixed(0)}%</span></div>
      `;
            tooltip.className = 'tooltip visible';
        });

        map.on('mousemove', 'conflict-core', (e) => {
            tooltip.style.left = (e.point.x + 14) + 'px';
            tooltip.style.top = (e.point.y - 10) + 'px';
        });

        map.on('mouseleave', 'conflict-core', () => {
            map.getCanvas().style.cursor = '';
            tooltip.className = 'tooltip';
        });
    }

    return {
        init() {
            map = new maplibregl.Map({
                container: 'map',
                style: BASEMAP,
                center: [-74.5, 4.0],
                zoom: 5.2,
                minZoom: 4,
                maxZoom: 12,
                attributionControl: false,
            });

            map.on('load', () => {
                initSources();
                initLayers();
                setupTooltip();
                ready = true;

                // Fire event so app can update with initial year
                map.fire('layers-ready');
            });

            return map;
        },

        updateData,
        toggleLayer,
        isReady: () => ready,
        onReady: (cb) => map.once('layers-ready', cb),
    };
})();
