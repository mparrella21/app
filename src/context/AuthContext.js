import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const t = await AsyncStorage.getItem('app_auth_token');
        const u = await AsyncStorage.getItem('app_user_info');
        if (t) setToken(t);
        if (u) setUser(JSON.parse(u));
      } catch (e) {
        console.warn('AuthProvider load', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const login = async (email, password) => {
    // Normal login using backend when available
    const res = await AuthService.login(email, password);
    if (res && res.token) {
      await AsyncStorage.setItem('app_auth_token', res.token);
      await AsyncStorage.setItem('app_user_info', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return { success: true };
    }
    return { success: false, message: res.error || 'Login fallito' };
  };

  const register = async (name, email, password) => {
    return await AuthService.register(name, email, password);
  };

  // Local/mock login (no network). Useful for static/UI testing.
  const loginLocal = async (name = 'Utente di Test') => {
    try {
      const fakeToken = `local_${Date.now()}`;
      const fakeUser = { name };
      await AsyncStorage.setItem('app_auth_token', fakeToken);
      await AsyncStorage.setItem('app_user_info', JSON.stringify(fakeUser));
      setToken(fakeToken);
      setUser(fakeUser);
      return { success: true };
    } catch (e) {
      console.warn('loginLocal', e);
      return { success: false };
    }
  };

  const registerLocal = async (name = 'Utente Test') => {
    // Just sign in locally after register for UI testing
    return loginLocal(name);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('app_auth_token');
    await AsyncStorage.removeItem('app_user_info');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginLocal, registerLocal, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);