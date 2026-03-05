/* ─────────────────────────────────────────────────────────
   api.js — Real data fetcher from datos.gov.co (CNMH/SOCRATA)
   Falls back to mock data from data.js if API unavailable
───────────────────────────────────────────────────────── */
'use strict';

const ColombiaAPI = (() => {
    /* ── Endpoints ─────────────────────────────────────── */
    const BASE = 'https://www.datos.gov.co/resource';

    // CNMH SIEVCAC — Masacres con coordenadas (lat/lng reales)
    const CONFLICT_DATASET = 'cj8q-zu3u';

    /* ── Cache ─────────────────────────────────────────── */
    const cache = {};       // { year: GeoJSON }
    const summaryCache = {};// { year: { count, victims } }
    const pending = {};     // { year: Promise }

    /* ── Helpers ───────────────────────────────────────── */
    function toGeoJSON(rows) {
        const features = rows
            .filter(r => r.latitud_longitud && r.latitud_longitud.coordinates)
            .map(r => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: r.latitud_longitud.coordinates  // [lng, lat]
                },
                properties: {
                    municipio: r.municipio || '—',
                    depto: r.departamento || '—',
                    year: r.a_o,
                    mes: r.mes,
                    sexo: r.sexo || '—',
                    calidad: r.calidad_de_la_v_ctima_o_la || '—',
                    weight: 0.7 + Math.random() * 0.3   // visual weight
                }
            }));

        return { type: 'FeatureCollection', features };
    }

    /* ── Fetch single year ─────────────────────────────── */
    async function fetchYear(year) {
        if (cache[year]) return cache[year];
        if (pending[year]) return pending[year];

        const url = `${BASE}/${CONFLICT_DATASET}.json` +
            `?$where=a_o='${year}'` +
            `&$limit=5000` +
            `&$select=id_caso,municipio,departamento,a_o,mes,sexo,calidad_de_la_v_ctima_o_la,latitud_longitud`;

        pending[year] = fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(rows => {
                const geojson = toGeoJSON(rows);
                cache[year] = { geojson, count: rows.length, rawRows: rows };
                delete pending[year];
                return cache[year];
            })
            .catch(err => {
                console.warn(`[API] Fallback to mock for ${year}:`, err.message);
                delete pending[year];
                // Return null → caller uses mock
                return null;
            });

        return pending[year];
    }

    /* ── Pre-warm years around current ─────────────────── */
    function prewarm(year) {
        const neighbors = [year - 1, year, year + 1, year + 2].filter(y => y >= 1985 && y <= 2025);
        neighbors.forEach(y => { if (!cache[y] && !pending[y]) fetchYear(y); });
    }

    /* ── Victim count per year (aggregated via SOQL) ───── */
    async function fetchSummary(year) {
        if (summaryCache[year]) return summaryCache[year];

        const url = `${BASE}/${CONFLICT_DATASET}.json` +
            `?$select=count(id_persona)` +
            `&$where=a_o='${year}'`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const rows = await res.json();
            const count = parseInt(rows[0]?.count_id_persona || 0);
            summaryCache[year] = count;
            return count;
        } catch (e) {
            return null; // use mock
        }
    }

    return {
        fetchYear,
        prewarm,
        fetchSummary,
        isCached: (year) => !!cache[year],
    };
})();
