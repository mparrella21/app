// Simple Nominatim geocoding service with robust parsing and better error messages
export const geocode = async (query) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    const ct = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!ct.includes('application/json')) {
      // Nominatim sometimes returns HTML (rate-limit or error). Surface a helpful error.
      throw new Error('Nominatim non ha risposto JSON. Contenuto: ' + (text ? text.substr(0, 300) : 'vuoto'));
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Parsing JSON da Nominatim fallito: ' + e.message);
    }

    if (data && data.length > 0) {
      const res = data[0];
      return { lat: Number(res.lat), lon: Number(res.lon), display_name: res.display_name };
    }

    return null;
  } catch (e) {
    console.error('nominatim.geocode', e);
    throw e; // rethrow so callers can surface the message
  }
};