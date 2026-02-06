import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { API_BASE } from './config'; 

//const AUTH_URL = "http://192.168.72.107:32413/auth";
const AUTH_URL = "http://127.0.0.1:32413/auth";
const decodeJWT = (token) => {
    try {
        const part = token.split('.')[1];
        return JSON.parse(global.atob ? global.atob(part) : Buffer.from(part, 'base64').toString('utf8'));
    } catch(e) {
        console.log("Errore decode JWT", e);
        return null;
    }
};

const mapRoleToString = (roleId) => {
    // Se non c'è ruolo, è cittadino
    if (roleId === undefined || roleId === null) return 'cittadino';

    switch(Number(roleId)) {
        case 1: return 'operatore';    // CORRETTO: 1 è Operatore
        case 2: return 'responsabile'; // CORRETTO: 2 è Responsabile
        case 3: return 'admin';        // CORRETTO: 3 è Admin
        default: return 'cittadino';
    }
};

export const login = async (email, password) => {
  try {
    // La password va inviata in chiaro su protocollo HTTPS.
    const response = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password }) 
    });
    const data = await response.json();

    if (response.ok && (data.token || data.access_token)) {
      const token = data.token || data.access_token;
      const refreshToken = data.refresh_token; 
      
      await setAuthTokens(token, refreshToken);
      await AsyncStorage.setItem('user_email', email);
      
      const decoded = decodeJWT(token);
      let user = {
          id: decoded?.sub || 'unknown-id',
          role: mapRoleToString(decoded?.role), 
          email: email,
          name: email.split('@')[0], 
          surname: '',
          tenant_id: decoded?.tid 
      };

      // Recupero dati anagrafici (GET /api/user/id)
      try {
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
                user.phonenumber = realUser.phonenumber || user.phonenumber;
                user.birth_date = realUser.birth_date || user.birth_date;
            }
        }
      } catch (err) {
          console.log("Impossibile recuperare dettagli profilo post-login", err);
      }
      return { success: true, token: token, user: user };
    }
    return { success: false, error: data.message || 'Login fallito' };
  } catch (e) {
    return { success: false, error: 'Errore di rete o di codice' };
  }
};

// --- LOGIN CON GOOGLE ---
export const googleLogin = async (idToken) => {
    try {
        // L'endpoint corretto fornito dal tuo amico
        const response = await fetch(`${AUTH_URL}/google`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Accept': 'application/json' 
            },
            // Il body richiesto: "id_token"
            body: JSON.stringify({ id_token: idToken }) 
        });

        const data = await response.json();

        if (response.ok && (data.token || data.access_token)) {
            const token = data.token || data.access_token;
            const refreshToken = data.refresh_token;

            // Salvataggio token
            await setAuthTokens(token, refreshToken);

            const decoded = decodeJWT(token);
            // Restituiamo l'utente formattato per il context
            const user = {
                id: decoded?.sub || 'unknown-id',
                role: mapRoleToString(decoded?.role), // Usiamo la tua funzione di mapping
                email: decoded?.email || '',
                name: data.user?.name || 'Utente',
                surname: data.user?.surname || 'Google',
                tenant_id: decoded?.tid
            };

            return { success: true, token, user };
        }
        return { success: false, error: data.message || 'Autenticazione Google fallita' };
    } catch (e) {
        console.error("Errore Google Login Service:", e);
        return { success: false, error: 'Errore di connessione al server' };
    }
};

export const register = async (userData) => {
  try {
    // Registra un utente. Ritorna ACCESS_TOKEN e REFRESH_TOKEN
    // Il body deve contenere SOLO email e password secondo il txt.
    const authPayload = { 
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
        const refreshToken = data.refresh_token;

        if (token) {
            await setAuthTokens(token, refreshToken);
            const decoded = decodeJWT(token);
            const userId = decoded?.sub;

            // Creazione anagrafica utente dopo la registrazione
            try {
                const userProfileData = {
                    user_id: userId,
                    name: userData.name || '',
                    surname: userData.surname || '',
                    birth_date: userData.birth_date || null,
                    phonenumber: userData.phoneNumber || ''
                };
                await fetch(`${API_BASE}/user`, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(userProfileData)
                });
            } catch (err) {
                console.error("Eccezione fetch User Profile:", err);
            }

            // L'utente appena registrato è inizialmente senza ruolo (o cittadino di default lato FE)
            const user = {
                id: userId,
                email: userData.email,
                name: userData.name,
                surname: userData.surname,
                role: 'cittadino', // Assunto lato app
                tenant_id: null
            };
            return { success: true, token: token, user: user };
        }
    }
    return { success: false, error: data.message || 'Registrazione fallita' };
  } catch (e) {
    return { success: false, error: 'Errore di rete' };
  }
};

export const logout = async () => {
    try {
        const token = await AsyncStorage.getItem('app_access_token');
        const refresh = await AsyncStorage.getItem('app_refresh_token');
        // Logout invalida il refresh token
        if (refresh) {
            await fetch(`${AUTH_URL}/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ refresh_token: refresh })
            });
        }
        await clearAuthTokens();
    } catch (e) {
        await clearAuthTokens();
    }
};

const performRefreshToken = async () => {
    try {
        const refresh = await AsyncStorage.getItem('app_refresh_token');
        if (!refresh) return null;

        const response = await fetch(`${AUTH_URL}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refresh })
        });
        
        const data = await response.json();
        if (response.ok && data.access_token) {
            await AsyncStorage.setItem('app_access_token', data.access_token);
            if (data.refresh_token) await AsyncStorage.setItem('app_refresh_token', data.refresh_token);
            return data.access_token;
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const authenticatedFetch = async (url, options = {}) => {
    let token = await AsyncStorage.getItem('app_access_token');
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        const newToken = await performRefreshToken();
        if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, { ...options, headers });
        }
    }
    return response;
};

const setAuthTokens = async (token, refreshToken) => {
    try {
        await AsyncStorage.setItem('app_access_token', token);
        if (refreshToken) {
            await AsyncStorage.setItem('app_refresh_token', refreshToken);
        }
    } catch (e) {
        console.error("Errore salvataggio token", e);
    }
};

const clearAuthTokens = async () => {
    try {
        await AsyncStorage.removeItem('app_access_token');
        await AsyncStorage.removeItem('app_refresh_token');
        await AsyncStorage.removeItem('user_email');
    } catch (e) {
        console.error("Errore rimozione token", e);
    }
};