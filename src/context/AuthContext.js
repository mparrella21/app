import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as loginService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al riavvio dell'app, controlliamo se c'è un utente salvato
  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('app_user');
      const storedToken = await AsyncStorage.getItem('app_auth_token');
      
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Errore caricamento sessione", e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    // Chiamata al servizio reale
    const result = await loginService(email, password);

    if (result.token && result.user) {
      // 1. Salva Token e Utente nello storage persistente
      await AsyncStorage.setItem('app_auth_token', result.token);
      await AsyncStorage.setItem('app_user', JSON.stringify(result.user));
      
      // 2. Aggiorna lo stato
      setUser(result.user);
      return { success: true };
    } else {
      return { success: false, error: result.error || "Credenziali non valide" };
    }
  };

  const loginWithGoogle = async (idToken) => {
    const result = await loginService.loginWithGoogle(idToken);
    if (result.token && result.user) {
      await AsyncStorage.setItem('app_auth_token', result.token);
      await AsyncStorage.setItem('app_user', JSON.stringify(result.user));
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error || 'Google login failed' };
  };

  const logout = async () => {
    await AsyncStorage.removeItem('app_auth_token');
    await AsyncStorage.removeItem('app_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);