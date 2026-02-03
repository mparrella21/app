import React, { createContext, useState, useEffect, useContext } from 'react';
import { login as apiLogin, register as apiRegister } from '../services/authService';
import { setAuthTokens, clearAuthTokens, getAuthTokens } from '../services/authStorage';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { jwtDecode } from 'jwt-decode';
export const AuthContext = createContext();
import { API_BASE } from '../services/config';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const extractUserFromToken = (token) => {
    try {
      const decoded = jwtDecode(token);
      
      const rawRole = decoded.role;
      let mappedRole = 'cittadino'; 

      if (typeof rawRole === 'string') {
          mappedRole = rawRole.toLowerCase();
      } else if (typeof rawRole === 'number') {
          if (rawRole === 2) mappedRole = 'operatore';
          else if (rawRole === 3) mappedRole = 'responsabile';
          else mappedRole = 'cittadino'; 
      }

      return {
        id: decoded.sub,
        email: decoded.email,
        role: mappedRole, 
        tenant_id: decoded.tid 
      };
    } catch (e) {
      console.error("Errore decodifica token", e);
      return null;
    }
  };

  const checkLoggedIn = async () => {
    try {
      const tokens = await getAuthTokens();
      if (tokens && tokens.access_token) {
        // 1. Estrae i dati base dal token (ID, Email, Ruolo)
        const userData = extractUserFromToken(tokens.access_token);
        const savedEmail = await AsyncStorage.getItem('user_email');
        userData.email = savedEmail || 'Nessuna email';
        // 2. RECUPERA IL NOME DAL DATABASE (Nuovo codice!)
        try {
          const response = await fetch(`${API_BASE}/user/${userData.id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tokens.access_token}` }
          });
          if (response.ok) {
            const profileData = await response.json();
            const realUser = Array.isArray(profileData) ? profileData[0] : (profileData.user || profileData);
            if (realUser) {
              userData.name = realUser.name || userData.name;
              userData.surname = realUser.surname || userData.surname;
            }
          }
        } catch(err) {
          console.log("Errore nel recupero del nome al riavvio", err);
        }

        // 3. Salva l'utente COMPLETO di nome
        setUser(userData);
      }
    } catch (e) {
      console.error('Error checking auth', e);
    } finally {
      setLoading(false);
    }
  };

  const setDirectLogin = async (token, userData) => {
    setUser(userData);
  };

  useEffect(() => {
    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiLogin(email, password);
      
      if (response.success) {
        await setAuthTokens(response.token, response.refreshToken); 
        setUser(response.user); 
        return true;
      }
      return false;
    } catch (e) {
      console.error('Login error', e);
      return false;
    }
  };

  const register = async (email, password) => {
    try {
      await apiRegister({ email, password });
      return await login(email, password);
    } catch (e) {
      console.error('Registration error', e);
      return false;
    }
  };

  const logout = async () => {
    await clearAuthTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setDirectLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);