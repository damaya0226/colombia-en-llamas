/* ─────────────────────────────────────────────────────────
   data.js — Historical data generator for Colombia en Llamas
   Sources: CNMH, UNODC, IDEAM, CERAC
───────────────────────────────────────────────────────── */
'use strict';

// ── Seeded deterministic PRNG
function prng(seed) {
  let s = (seed * 1000003) | 0;
  return () => {
    s = Math.imul(48271, s) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

// ── UNODC official coca hectares (approximate)
const COCA_HA = {
  1985:15000, 1986:17000, 1987:20000, 1988:25000, 1989:32000,
  1990:40000, 1991:44000, 1992:37000, 1993:39000, 1994:45000,
  1995:51000, 1996:68000, 1997:79000, 1998:102000, 1999:160000,
  2000:163000, 2001:145000, 2002:102000, 2003:86000, 2004:80000,
  2005:86000, 2006:78000, 2007:99000, 2008:81000, 2009:68000,
  2010:62000, 2011:64000, 2012:48000, 2013:48000, 2014:69000,
  2015:96000, 2016:146000, 2017:171000, 2018:169000, 2019:154000,
  2020:143000, 2021:204000, 2022:230000, 2023:230000, 2024:210000,
  2025:195000
};

// ── IDEAM deforestation hectares/year (approximate)
const DEFO_HA = {
  1985:260000, 1986:265000, 1987:270000, 1988:275000, 1989:280000,
  1990:300000, 1991:295000, 1992:290000, 1993:285000, 1994:270000,
  1995:260000, 1996:250000, 1997:240000, 1998:235000, 1999:230000,
  2000:220000, 2001:210000, 2002:200000, 2003:190000, 2004:185000,
  2005:180000, 2006:175000, 2007:170000, 2008:165000, 2009:155000,
  2010:150000, 2011:148000, 2012:145000, 2013:140000, 2014:145000,
  2015:155000, 2016:178000, 2017:220000, 2018:197000, 2019:159000,
  2020:172000, 2021:174000, 2022:168000, 2023:120000, 2024:112000,
  2025:105000
};

// ── Conflict intensity curve (0–1)
const CONFLICT_INT = {
  1985:0.30, 1986:0.32, 1987:0.34, 1988:0.38, 1989:0.42,
  1990:0.48, 1991:0.50, 1992:0.48, 1993:0.45, 1994:0.42,
  1995:0.46, 1996:0.50, 1997:0.58, 1998:0.70, 1999:0.82,
  2000:0.95, 2001:1.00, 2002:0.98, 2003:0.85, 2004:0.78,
  2005:0.72, 2006:0.65, 2007:0.60, 2008:0.55, 2009:0.50,
  2010:0.45, 2011:0.42, 2012:0.38, 2013:0.35, 2014:0.33,
  2015:0.32, 2016:0.28, 2017:0.30, 2018:0.32, 2019:0.35,
  2020:0.38, 2021:0.40, 2022:0.42, 2023:0.40, 2024:0.38,
  2025:0.36
};

// Victims (killed + per-100-displaced proxy)
const VICTIMS = {};
for (const y in CONFLICT_INT) {
  VICTIMS[y] = Math.round(CONFLICT_INT[y] * 180000);
}

// ── Spatial zones
const CONFLICT_ZONES = [
  { name:'Urabá',            lat: 7.90, lng:-76.80, w:1.0 },
  { name:'Bajo Cauca',       lat: 7.90, lng:-74.70, w:0.85 },
  { name:'Córdoba',          lat: 8.30, lng:-75.90, w:0.80 },
  { name:'Chocó',            lat: 6.00, lng:-76.70, w:0.75 },
  { name:'Catatumbo',        lat: 8.40, lng:-73.10, w:0.80 },
  { name:'Arauca',           lat: 7.10, lng:-70.90, w:0.70 },
  { name:'Sur de Bolívar',   lat: 8.50, lng:-73.60, w:0.72 },
  { name:'Oriente Ant.',     lat: 6.20, lng:-74.90, w:0.70 },
  { name:'Putumayo',         lat: 0.80, lng:-76.50, w:0.85 },
  { name:'Nariño',           lat: 1.80, lng:-78.10, w:0.80 },
  { name:'Cauca',            lat: 2.50, lng:-76.80, w:0.72 },
  { name:'Meta',             lat: 3.20, lng:-73.30, w:0.75 },
  { name:'Caquetá',          lat: 1.00, lng:-75.40, w:0.68 },
  { name:'Sierra Nevada',    lat:10.80, lng:-73.40, w:0.50 },
  { name:'La Guajira',       lat:11.50, lng:-72.50, w:0.40 },
];

const COCA_ZONES = [
  { name:'Putumayo',         lat: 0.50, lng:-76.50, w:1.00 },
  { name:'Catatumbo',        lat: 8.40, lng:-73.00, w:0.90 },
  { name:'Nariño',           lat: 1.60, lng:-77.70, w:0.85 },
  { name:'Cauca',            lat: 2.50, lng:-77.00, w:0.70 },
  { name:'Sur de Bolívar',   lat: 8.70, lng:-73.90, w:0.65 },
  { name:'Meta',             lat: 3.00, lng:-73.00, w:0.55 },
  { name:'Antioquia',        lat: 7.50, lng:-75.50, w:0.48 },
  { name:'Guainía',          lat: 3.50, lng:-68.00, w:0.42 },
  { name:'Vichada',          lat: 5.00, lng:-69.50, w:0.35 },
  { name:'Córdoba',          lat: 8.00, lng:-76.00, w:0.38 },
];

const DEFO_ZONES = [
  { name:'Caquetá Amazónico', lat: 0.50, lng:-74.50, w:1.00 },
  { name:'Meta Amazónico',    lat: 3.00, lng:-73.00, w:0.90 },
  { name:'Guaviare',          lat: 2.30, lng:-72.50, w:0.85 },
  { name:'Putumayo Selva',    lat: 0.30, lng:-75.80, w:0.72 },
  { name:'Amazonas Norte',    lat: 1.00, lng:-72.00, w:0.70 },
  { name:'Chocó Pacífico',    lat: 6.00, lng:-76.50, w:0.65 },
  { name:'Norte Santander',   lat: 8.00, lng:-73.30, w:0.60 },
  { name:'Vichada Sur',       lat: 4.50, lng:-70.00, w:0.50 },
];

// ── Generate random offset keeping point near Colombia
function jitter(rnd, base, spread) {
  return base + (rnd() - 0.5) * spread;
}

// ── Build GeoJSON FeatureCollection for a layer / year
function buildGeoJSON(zones, year, totalHa, densityFactor) {
  const rnd = prng(year * 97 + densityFactor);
  const features = [];
  const pointsPerZone = Math.max(6, Math.round(50 * densityFactor));

  for (const zone of zones) {
    const n = Math.round(pointsPerZone * zone.w);
    for (let i = 0; i < n; i++) {
      const lat = jitter(rnd, zone.lat, 0.9 * zone.w);
      const lng = jitter(rnd, zone.lng, 0.9 * zone.w);
      const weight = rnd() * zone.w;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { weight, zone: zone.name }
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

// ── Public API
const ColombiaData = {
  getYear(year) {
    const conflictInt = CONFLICT_INT[year] || 0.3;
    const cocaHa      = COCA_HA[year]      || 0;
    const defoHa      = DEFO_HA[year]      || 0;
    const victims     = VICTIMS[year]      || 0;

    return {
      year,
      stats: { conflictInt, cocaHa, defoHa, victims },
      conflictGeoJSON: buildGeoJSON(CONFLICT_ZONES, year, victims, conflictInt),
      cocaGeoJSON:     buildGeoJSON(COCA_ZONES, year, cocaHa,  cocaHa / 230000),
      defoGeoJSON:     buildGeoJSON(DEFO_ZONES, year, defoHa,  defoHa / 300000),
    };
  },

  getCumulativeVictims(toYear) {
    let total = 0;
    for (let y = 1985; y <= toYear; y++) {
      total += VICTIMS[y] || 0;
    }
    return total;
  }
};
