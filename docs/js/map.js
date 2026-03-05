/* ─────────────────────────────────────────────────────────
   map.js — MapLibre GL JS + Deck.gl integration
───────────────────────────────────────────────────────── */
'use strict';

const ColombiaMap = (() => {
    let map = null;
    let deckOverlay = null;
    let ready = false;
    let tooltipEl = null;

    const layerVis = { conflict: true, coca: true, defo: false, deptos: false };

    // Store current data to re-render layer arrays smoothly
    let currentData = { conflictGeoJSON: null, cocaGeoJSON: null, defoGeoJSON: null };
    let deptosGeoJSON = null;

    const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

    // Deck.gl heatmap color ranges (RGBA)
    const COCA_COLORS = [
        [0, 0, 0, 0],
        [245, 158, 11, 38],    // 0.15 opacity
        [245, 158, 11, 140],   // 0.55 opacity
        [251, 191, 36, 204],   // 0.80 opacity
        [254, 240, 138, 242],  // 0.95 opacity
        [255, 251, 190, 255]   // Hot core
    ];

    const DEFO_COLORS = [
        [0, 0, 0, 0],
        [34, 197, 94, 38],
        [22, 163, 74, 140],
        [16, 122, 54, 204],
        [6, 95, 70, 242],
        [0, 50, 40, 255]
    ];

    // Helper to map weight (0-1) to Core dot color
    function getConflictColor(weight) {
        // Mapbox had [239,68,68,0.1] to [255,200,200,0.9]
        if (weight <= 0.4) {
            const t = weight / 0.4;
            return [239, 68, 68, Math.round(25 + t * 115)];
        } else {
            const t = (weight - 0.4) / 0.6;
            const r = 239 + t * (255 - 239);
            const g = 68 + t * (200 - 68);
            const b = 68 + t * (200 - 68);
            return [Math.round(r), Math.round(g), Math.round(b), Math.round(140 + t * 90)];
        }
    }

    function handleHover(info) {
        if (info.object) {
            map.getCanvas().style.cursor = 'pointer';

            const { zone, municipio, depto, weight } = info.object.properties;
            const locationName = municipio && depto ? `${municipio}, ${depto}` : (zone || 'Desconocido');
            const victims = Math.round(weight * 3500);

            tooltipEl.innerHTML = `
                <div class="tooltip-title">⚔️ ${locationName}</div>
                <div class="tooltip-row">Víctimas aprox: <span>~${victims.toLocaleString('es-CO')}</span></div>
                <div class="tooltip-row">Intensidad: <span>${(weight * 100).toFixed(0)}%</span></div>
            `;
            tooltipEl.style.left = (info.x + 14) + 'px';
            tooltipEl.style.top = (info.y - 10) + 'px';
            tooltipEl.className = 'tooltip visible';
        } else {
            map.getCanvas().style.cursor = '';
            tooltipEl.className = 'tooltip';
        }
    }

    // Build the array of Deck.gl layers based on current state & data
    function renderLayers() {
        if (!deckOverlay || !currentData.conflictGeoJSON) return;

        const layers = [];

        // ── Deforestation Heatmap
        if (layerVis.defo && currentData.defoGeoJSON) {
            layers.push(new deck.HeatmapLayer({
                id: 'defo-heat',
                data: currentData.defoGeoJSON.features,
                getPosition: d => d.geometry.coordinates,
                getWeight: d => d.properties.weight,
                radiusPixels: 40,
                intensity: 1.2,
                colorRange: DEFO_COLORS,
                opacity: 0.88,
                aggregation: 'SUM'
            }));
        }

        // ── Department Polygons
        if (layerVis.deptos && deptosGeoJSON) {
            layers.push(new deck.GeoJsonLayer({
                id: 'deptos-poly',
                data: deptosGeoJSON,
                stroked: true,
                filled: true,
                lineWidthMinPixels: 1,
                getLineColor: [255, 255, 255, 30],
                getFillColor: f => {
                    const deptoName = f.properties.NOMBRE_DPT || '';
                    let intensity = 0;
                    if (currentData.conflictGeoJSON) {
                        let sumWeight = 0;
                        for (let pt of currentData.conflictGeoJSON.features) {
                            const pProps = pt.properties;
                            // API data has `depto: 'ANTIOQUIA'`
                            if (pProps.depto && deptoName.includes(pProps.depto)) {
                                sumWeight += pProps.weight;
                            }
                            // Mock data has `zone`, we lazily map if relevant
                            else if (!pProps.depto && pProps.zone && deptoName.includes(pProps.zone.toUpperCase())) {
                                sumWeight += pProps.weight;
                            }
                        }
                        // Normalize intensity. Some areas might have sumWeight > 2.0 depending on data density
                        intensity = Math.min(1.0, sumWeight / 2.5);
                    }
                    if (intensity === 0) return [0, 0, 0, 0];
                    return [239, 68, 68, Math.round(intensity * 180)]; // Translucent red
                },
                updateTriggers: {
                    getFillColor: currentData.conflictGeoJSON
                },
                transitions: { getFillColor: 300 }
            }));
        }

        // ── Coca Heatmap
        if (layerVis.coca && currentData.cocaGeoJSON) {
            layers.push(new deck.HeatmapLayer({
                id: 'coca-heat',
                data: currentData.cocaGeoJSON.features,
                getPosition: d => d.geometry.coordinates,
                getWeight: d => d.properties.weight,
                radiusPixels: 35,
                intensity: 1.2,
                colorRange: COCA_COLORS,
                opacity: 0.90,
                aggregation: 'SUM'
            }));
        }

        // ── Conflict Points (Glow, Halo, Core)
        if (layerVis.conflict && currentData.conflictGeoJSON) {
            layers.push(new deck.ScatterplotLayer({
                id: 'conflict-glow',
                data: currentData.conflictGeoJSON.features,
                getPosition: d => d.geometry.coordinates,
                getRadius: d => d.properties.weight * 18 + 10,
                radiusUnits: 'pixels',
                getFillColor: [239, 68, 68, 30], // 0.12 alpha
                stroked: false,
                transitions: { getRadius: 200 }
            }));

            layers.push(new deck.ScatterplotLayer({
                id: 'conflict-halo',
                data: currentData.conflictGeoJSON.features,
                getPosition: d => d.geometry.coordinates,
                getRadius: d => d.properties.weight * 9 + 5,
                radiusUnits: 'pixels',
                getFillColor: [239, 68, 68, 90], // 0.35 alpha
                stroked: false,
                transitions: { getRadius: 200 }
            }));

            layers.push(new deck.ScatterplotLayer({
                id: 'conflict-core',
                data: currentData.conflictGeoJSON.features,
                getPosition: d => d.geometry.coordinates,
                getRadius: d => d.properties.weight * 3 + 2,
                radiusUnits: 'pixels',
                getFillColor: d => getConflictColor(d.properties.weight),
                stroked: true,
                getLineColor: [255, 255, 255, 76], // 0.3 alpha
                lineWidthMinPixels: 0.5,
                pickable: true,   // Enables hover
                onHover: handleHover,
                transitions: { getRadius: 200 }
            }));
        }

        deckOverlay.setProps({ layers });
    }

    function toggleLayer(key) {
        layerVis[key] = !layerVis[key];
        renderLayers();
        return layerVis[key];
    }

    function updateData(yearData) {
        if (!ready) return;
        currentData.cocaGeoJSON = yearData.cocaGeoJSON;
        currentData.defoGeoJSON = yearData.defoGeoJSON;
        currentData.conflictGeoJSON = yearData.conflictGeoJSON;
        renderLayers();
    }

    function updateConflictLayer(geojson) {
        if (!ready) return;
        currentData.conflictGeoJSON = geojson;
        renderLayers();
    }

    return {
        init() {
            tooltipEl = document.getElementById('tooltip');

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
                // Initialize Deck.gl instance interlaced with MapLibre
                deckOverlay = new deck.MapboxOverlay({
                    interleaved: true, // Draws layers in the MapLibre webgl context
                    layers: []
                });
                map.addControl(deckOverlay);

                // Pre-load department topological data
                fetch('data/departamentos.geojson')
                    .then(res => res.json())
                    .then(data => {
                        deptosGeoJSON = data;
                        renderLayers();
                    })
                    .catch(e => console.error('Error loading deptos GEOJSON', e));

                ready = true;
                map.fire('layers-ready');
            });

            return map;
        },

        updateData,
        updateConflictLayer,
        toggleLayer,
        isReady: () => ready,
        onReady: (cb) => map.once('layers-ready', cb),
    };
})();
