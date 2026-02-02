import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Endpoint: GET /api/tenant/search?lat=...&lon=...
export const searchTenantByCoordinates = async (lat, lon) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');
    const url = `${API_BASE}/tenant/search?lat=${lat}&lon=${lon}`;

    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) return null;

    const data = await response.json();

    if (data && (data.tenant_id || data.istat_code) && data.geometry) {
      const safeBoundary = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              id: data.tenant_id,
              istat: data.istat_code,
              name: data.label
            },
            geometry: data.geometry
          }
        ]
      };

      return {
        tenant: {
            id: data.tenant_id,
            name: data.label,
            istat_code: data.istat_code
        },
        boundary: safeBoundary,
      };
    }
    return null;
  } catch (e) {
    console.error('tenantService.searchTenantByCoordinates', e);
    return null;
  }
};

// Recupera tutti i tenant
export const getAllTenants = async () => {
    try {
        const response = await fetch(`${API_BASE}/tenant`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) {
        console.error('tenantService.getAllTenants', e);
        return [];
    }
};

// Recupera province
export const getProvinces = async () => {
    try {
        const response = await fetch(`${API_BASE}/tenant/provincia`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) {
        console.error('tenantService.getProvinces', e);
        return [];
    }
};

// Recupera regioni
export const getRegions = async () => {
    try {
        const response = await fetch(`${API_BASE}/tenant/regione`, { method: 'GET' });
        if (response.ok) return await response.json();
        return [];
    } catch (e) {
        console.error('tenantService.getRegions', e);
        return [];
    }
};

// Recupera i confini specifici di un tenant (per ISTAT code o ID)
export const getTenantBoundary = async (idOrIstat) => {
    try {
        const response = await fetch(`${API_BASE}/tenant/boundaries/${idOrIstat}`, { method: 'GET' });
        if (response.ok) {
            const data = await response.json();
            // Impacchetta in GeoJSON FeatureCollection per coerenza con la mappa
            return {
                type: "FeatureCollection",
                features: [{
                    type: "Feature",
                    properties: { istat_code: data.istat_code },
                    geometry: data.geometry
                }]
            };
        }
        return null;
    } catch (e) {
        console.error('tenantService.getTenantBoundary', e);
        return null;
    }
};