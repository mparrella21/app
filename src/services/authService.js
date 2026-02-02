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
      const refreshToken = data.refresh_token; // Salviamo anche il refresh token
      
      if (refreshToken) {
          await AsyncStorage.setItem('app_refresh_token', refreshToken);
      }

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
        await AsyncStorage.removeItem('app_auth_token');
        await AsyncStorage.removeItem('app_refresh_token');
    } catch (e) {
        console.warn('Logout API failed', e);
    }
};

export const refreshToken = async () => {
    try {
        const refresh = await AsyncStorage.getItem('app_refresh_token');
        const token = await AsyncStorage.getItem('app_auth_token');
        // Necessario recuperare il tenant_id in qualche modo (es. dal vecchio token o storage)
        const decoded = decodeJWT(token); 
        const tenant_id = decoded?.tid;

        if (!refresh || !tenant_id) return null;

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