import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { API_BASE } from './config'; 

const AUTH_URL = "http://192.168.72.107:32413/auth";

// Helper per decodificare JWT
const decodeJWT = (token) => {
    try {
        const part = token.split('.')[1];
        const decoded = JSON.parse(global.atob ? global.atob(part) : Buffer.from(part, 'base64').toString('utf8'));
        return decoded;
    } catch(e) {
        console.log("Errore decode JWT", e);
        return null;
    }
};

const mapRoleToString = (roleId) => {
    switch(Number(roleId)) {
        case 1: return 'cittadino';
        case 2: return 'operatore';
        case 3: return 'admin'; 
        default: return 'cittadino';
    }
};

export const login = async (email, password, tenant_id) => {
  try {
    const response = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password, tenant_id })
    });

    const data = await response.json();

    if (response.ok && (data.token || data.access_token)) {
      const token = data.token || data.access_token;
      const refreshToken = data.refresh_token; 
      
      // Salviamo token e anche il tenant_id attuale per futuri refresh
      await AsyncStorage.setItem('app_auth_token', token);
      if (refreshToken) await AsyncStorage.setItem('app_refresh_token', refreshToken);
      if (tenant_id) await AsyncStorage.setItem('app_tenant_id', tenant_id);

      const decoded = decodeJWT(token);
      
      let user = {
          id: decoded?.sub || 'unknown-id',
          role: mapRoleToString(decoded?.role), 
          email: email,
          name: email.split('@')[0], 
          surname: '',
          tenant_id: decoded?.tid || tenant_id
      };

      try {
        // Usiamo authenticatedFetch anche qui per coerenza, o fetch diretto col token appena preso
        const userResp = await fetch(`${API_BASE}/user/${user.id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userResp.ok) {
            const userDataFull = await userResp.json();
            const realUser = Array.isArray(userDataFull) ? userDataFull[0] : (userDataFull.user || userDataFull);
            if (realUser) {
                user.name = realUser.name || user.name;
                user.surname = realUser.surname || user.surname;
                user.phoneNumber = realUser.phonenumber || user.phoneNumber;
            }
        }
      } catch (err) {
          console.log("Impossibile recuperare dettagli profilo post-login", err);
      }

      return { success: true, token: token, user: user };
    }

    return { success: false, error: data.message || 'Login fallito' };
  } catch (e) {
    console.error('AuthService.login', e);
    return { success: false, error: 'Errore di rete' };
  }
};

export const register = async (userData) => {
  try {
    const authPayload = {
        tenant_id: userData.tenant_id,
        email: userData.email,
        password: userData.password
    };

    const response = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(authPayload)
    });

    const data = await response.json();

    if (response.ok) {
        const token = data.token || data.access_token;
        if (token) {
            // Salviamo il token per le chiamate successive
            await AsyncStorage.setItem('app_auth_token', token);
            await AsyncStorage.setItem('app_tenant_id', userData.tenant_id);

            try {
                const userProfileData = {
                    name: userData.name,
                    surname: userData.surname,
                    birth_date: userData.birth_date,
                    phonenumber: userData.phoneNumber
                };
                await fetch(`${API_BASE}/user`, {
                    method: 'POST', 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(userProfileData)
                });
            } catch (err) {
                console.error("Eccezione fetch User:", err);
            }

            const user = {
                id: decodeJWT(token)?.sub,
                email: userData.email,
                name: userData.name,
                surname: userData.surname,
                phoneNumber: userData.phoneNumber,
                role: 'cittadino' 
            };
            return { success: true, token: token, user: user };
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        await AsyncStorage.clear(); // Pulisce tutto (token, user, tenant)
    } catch (e) {
        console.warn('Logout API failed', e);
        await AsyncStorage.clear();
    }
};

// Funzione interna per refresh
const performRefreshToken = async () => {
    try {
        const refresh = await AsyncStorage.getItem('app_refresh_token');
        // Recuperiamo il tenant_id salvato al login
        const tenant_id = await AsyncStorage.getItem('app_tenant_id');

        if (!refresh || !tenant_id) return null;

        console.log("Tentativo Refresh Token...");
        const response = await fetch(`${AUTH_URL}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant_id, refresh_token: refresh })
        });
        
        const data = await response.json();
        if (response.ok && data.access_token) {
            await AsyncStorage.setItem('app_auth_token', data.access_token);
            if (data.refresh_token) {
                await AsyncStorage.setItem('app_refresh_token', data.refresh_token);
            }
            return data.access_token;
        }
        return null;
    } catch (e) {
        console.error("Refresh token failed", e);
        return null;
    }
};

// --- NUOVA FUNZIONE CENTRALE PER LE CHIAMATE ---
// Usa questa funzione negli altri service invece di fetch()
export const authenticatedFetch = async (url, options = {}) => {
    let token = await AsyncStorage.getItem('app_auth_token');
    
    // Imposta headers di default
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Se riceviamo 401 (Unauthorized), proviamo a fare refresh
    if (response.status === 401) {
        console.log("Ricevuto 401, provo refresh...");
        const newToken = await performRefreshToken();
        
        if (newToken) {
            console.log("Refresh OK, ripeto richiesta.");
            // Aggiorna header con nuovo token
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, { ...options, headers });
        } else {
            console.log("Refresh fallito o token mancante.");
            // Opzionale: Qui si potrebbe forzare il logout o lanciare un evento
        }
    }

    return response;
};