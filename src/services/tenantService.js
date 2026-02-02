import { API_BASE } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      throw new Error('Errore server verifica zona');
    }

    const data = await response.json();

    // MODIFICA QUI: Adattiamo il parsing alla risposta reale del backend
    // Il backend restituisce "geometry" e "tenant_id" direttamente nella root dell'oggetto
    if (data && data.tenant_id) {
      return {
        // Ricostruiamo l'oggetto tenant come se lo aspetta l'App
        tenant: {
            id: data.tenant_id,
            name: data.label,
            istat_code: data.istat_code
        },
        // Mappiamo "geometry" (nome campo API) su "boundary" (nome variabile App)
        boundary: data.geometry, 
      };
    }

    return null;
  } catch (e) {
    console.error('tenantService.searchTenantByCoordinates', e);
    return null;
  }
};