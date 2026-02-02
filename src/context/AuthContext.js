import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as loginService, logout as logoutService } from '../services/authService';

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

  // Funzione helper per salvare la sessione (usata da login e post-registrazione)
  const handleSessionSuccess = async (token, userData) => {
      try {
        await AsyncStorage.setItem('app_auth_token', token);
        await AsyncStorage.setItem('app_user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      } catch (e) {
          return { success: false, error: "Errore salvataggio dati" };
      }
  };

  const login = async (email, password) => {
    const result = await loginService(email, password);

    if (result.success && result.token && result.user) {
      return await handleSessionSuccess(result.token, result.user);
    } else {
      return { success: false, error: result.error || "Credenziali non valide" };
    }
  };

  // Permette di loggare l'utente direttamente (es. dopo registrazione)
  const setDirectLogin = async (token, userData) => {
      return await handleSessionSuccess(token, userData);
  };

  const logout = async () => {
    // Chiama l'API per invalidare il token (Diagramma 04)
    await logoutService();
    
    // Pulizia locale
    await AsyncStorage.removeItem('app_auth_token');
    await AsyncStorage.removeItem('app_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, setDirectLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);