const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'src', 'assets', 'data', 'limits_IT_municipalities.geojson');
const outputPath = path.join(__dirname, '..', 'src', 'assets', 'data', 'limits_IT_simplified.geojson');

const STEP = 10; // take every N-th coordinate

function simplifyCoordinates(coords) {
  // coords: array of [lon, lat]
  if (!coords || !coords.length) return coords;
  const out = [];
  for (let i = 0; i < coords.length; i += STEP) {
    out.push(coords[i]);
  }
  // Ensure polygon closed
  const first = out[0];
  const last = out[out.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    out.push([first[0], first[1]]);
  }
  return out;
}

function processFeature(feature) {
  if (!feature || !feature.geometry) return feature;
  const geom = feature.geometry;
  if (geom.type === 'Polygon') {
    geom.coordinates = geom.coordinates.map(ring => simplifyCoordinates(ring));
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates = geom.coordinates.map(polygon => polygon.map(ring => simplifyCoordinates(ring)));
  }
  // Keep only useful properties to reduce size
  feature.properties = {
    name: feature.properties && (feature.properties.name || feature.properties.NOME || feature.properties.nome)
  };
  return feature;
}

(async () => {
  try {
    console.log('Reading', inputPath);
    const raw = fs.readFileSync(inputPath, 'utf8');
    const geo = JSON.parse(raw);
    console.log('Features:', (geo.features && geo.features.length) || 0);

    const out = {
      type: 'FeatureCollection',
      features: geo.features.map(processFeature)
    };

    fs.writeFileSync(outputPath, JSON.stringify(out));
    console.log('Simplified GeoJSON written to', outputPath);
  } catch (e) {
    console.error('Error simplifying geojson', e.message);
    process.exit(1);
  }
})();