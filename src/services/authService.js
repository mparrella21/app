import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

const AUTH_URL = "http://192.168.72.107:32413/auth";

// Helper per decodificare JWT
const decodeJWT = (token) => {
    try {
        const part = token.split('.')[1];
        // Decodifica base64 sicura per React Native
        const decoded = JSON.parse(global.atob ? global.atob(part) : Buffer.from(part, 'base64').toString('utf8'));
        return decoded;
    } catch(e) {
        console.log("Errore decode JWT", e);
        return null;
    }
};

// Mappatura Ruoli: Backend (Numeri) -> Frontend (Stringhe)
// Questo impedisce il crash "toLowerCase is not a function"
const mapRoleToString = (roleId) => {
    switch(Number(roleId)) {
        case 1: return 'cittadino';
        case 2: return 'operatore';
        case 3: return 'admin'; 
        default: return 'cittadino'; // Fallback
    }
};

export const login = async (email, password, phoneNumber, tenant_id) => {
  try {
    const response = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password, phoneNumber, tenant_id })
    });

    const data = await response.json();

    if (response.ok && (data.token || data.access_token)) {
      const token = data.token || data.access_token;
      
      // Decodifica token per ottenere ID e Ruolo
      const decoded = decodeJWT(token);
      
      // Costruiamo l'oggetto user manualmente perché il backend non lo invia
      const user = {
          id: decoded?.sub || 'unknown-id',
          // FIX IMPORTANTE: Convertiamo il numero in stringa
          role: mapRoleToString(decoded?.role), 
          email: email,
          name: data.user?.name || email.split('@')[0], 
          surname: data.user?.surname || '',
          phoneNumber: phoneNumber, // REINSERITO: Importante per il profilo
          tenant_id: decoded?.tid || tenant_id
      };

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
    const response = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (response.ok) {
        if (data.token || data.access_token) {
            const token = data.token || data.access_token;
            // Costruzione utente post-registrazione
            const user = {
                email: userData.email,
                name: userData.name,
                surname: userData.surname,
                phoneNumber: userData.phoneNumber, // REINSERITO
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