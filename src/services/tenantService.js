import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cerca il Tenant (Comune) in base alle coordinate geografiche.
// Se il punto è all'interno di un comune gestito, restituisce i dati del tenant e il boundary (GeoJSON).
// Se il punto non è coperto, restituisce null.
// Endpoint: GET /api/tenants/search?lat=...&lon=...

export const searchTenantByCoordinates = async (lat, lon) => {
  try {
    const token = await AsyncStorage.getItem('app_auth_token');

    // Costruzione URL con query params
    const url = `${API_BASE}/tenants/search?lat=${lat}&lon=${lon}`;

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
      throw new Error('Errore server verifica zona');
    }

    const data = await response.json();

    if (data && data.boundary) {
      return {
        tenant: data.tenant,
        boundary: data.boundary,
      };
    }

    return null;
  } catch (e) {
    console.error('tenantService.searchTenantByCoordinates', e);
    return null;
  }
};
