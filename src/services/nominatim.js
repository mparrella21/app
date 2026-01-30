export const getAddressFromCoordinates = async (lat, lng) => {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'CivitasApp/1.0' } // Nominatim richiede User-Agent
        });
        const data = await response.json();
        return data.display_name;
    } catch (error) {
        console.error("Errore Nominatim Reverse:", error);
        return "Indirizzo non trovato";
    }
};

export const searchCity = async (query) => {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'CivitasApp/1.0' }
        });
        const data = await response.json();
        if (data && data.length > 0) {
            return { lat: data[0].lat, lon: data[0].lon };
        }
        return null;
    } catch (error) {
        console.error("Errore Nominatim Search:", error);
        return null;
    }
};