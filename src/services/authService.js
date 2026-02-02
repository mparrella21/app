import AsyncStorage from '@react-native-async-storage/async-storage';

// Endpoint base per Auth (senza /api/ come da tuoi test)
const AUTH_URL = "http://192.168.72.107:32413/auth";

export const login = async (email, password, phoneNumber, tenant_id) => {
  try {
    const response = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ 
        email, 
        password, 
        phoneNumber, // Aggiunto come da test Postman
        tenant_id    // Aggiunto come da test Postman
      })
    });

    const data = await response.json();

    if (response.ok && (data.token || data.access_token)) {
      return { 
          success: true, 
          token: data.token || data.access_token, 
          user: data.user 
      };
    }

    return { success: false, error: data.message || 'Login fallito' };
  } catch (e) {
    console.error('AuthService.login', e);
    return { success: false, error: 'Errore di rete' };
  }
};

export const register = async (userData) => {
  try {
    const response = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      // Il body ora contiene esattamente i campi validati: tenant_id, name, surname, email, password, phoneNumber
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (response.ok) {
        if (data.token || data.access_token) {
            return { 
                success: true, 
                token: data.token || data.access_token, 
                user: data.user 
            };
        }
        return { success: true };
    }

    return { success: false, error: data.message || 'Registrazione fallita' };
  } catch (e) {
    console.error('AuthService.register', e);
    return { success: false, error: 'Errore di rete' };
  }
};

export const logout = async () => {
    try {
        const token = await AsyncStorage.getItem('app_auth_token');
        if (!token) return;

        await fetch(`${AUTH_URL}/logout`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            }
        });
    } catch (e) {
        console.warn('Logout API failed', e);
    }
};