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
      const decoded = decodeJWT(token);
      
      let user = {
          id: decoded?.sub || 'unknown-id',
          role: mapRoleToString(decoded?.role), 
          email: email,
          name: email.split('@')[0], 
          surname: '',
          tenant_id: decoded?.tid || tenant_id
      };

      // Scarichiamo i dati reali dal profilo
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
    // 1. REGISTRAZIONE AUTH (Crea account)
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
            // 2. CREAZIONE PROFILO USER (Crea anagrafica)
            try {
                // PAYLOAD RIDOTTO ALL'OSSO (Come Postman)
                // Il backend prenderà ID, Tenant ed Email dal Token
                const userProfileData = {
                    name: userData.name,
                    surname: userData.surname,
                    birth_date: userData.birth_date,   // YYYY-MM-DD
                    phonenumber: userData.phoneNumber  // "phonenumber" minuscolo come nel tuo JSON funzionante
                };

                console.log("Creazione Profilo User (Payload Postman):", userProfileData);

                const userResponse = await fetch(`${API_BASE}/user`, {
                    method: 'POST', 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // Qui dentro ci sono ID e Tenant!
                    },
                    body: JSON.stringify(userProfileData)
                });

                if (!userResponse.ok) {
                    const errText = await userResponse.text();
                    console.error("Errore User Service (" + userResponse.status + "):", errText);
                } else {
                    console.log("Profilo creato con successo!");
                }
                
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
    } catch (e) {
        console.warn('Logout API failed', e);
    }
};