import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Endpoint: GET /api/tenant/search?lat=...&lon=...
export const searchTenantByCoordinates = async (lat, lon) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    const url = `${API_BASE}/tenant/search?lat=${lat}&lon=${lon}`;

    console.log('[TenantService] Searching:', url);

    const headers = {
      Accept: 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      return null; 
    }

    const data = await response.json();


    if (data && data.tenant_id && data.geometry) {
      
      // La mappa vuole un oggetto che contenga un array "features", 
      // altrimenti crasha cercando di fare .filter() su undefined.
      const safeBoundary = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              id: data.tenant_id,
              name: data.label
            },
            geometry: data.geometry // Inseriamo qui il MultiPolygon dell'API
          }
        ]
      };

      return {
        tenant: {
            id: data.tenant_id,
            name: data.label,
            istat_code: data.istat_code
        },
        boundary: safeBoundary, // Passiamo alla mappa la versione "impacchettata"
      };
    }

    return null;
  } catch (e) {
    console.error('tenantService.searchTenantByCoordinates', e);
    return null;
  }
};