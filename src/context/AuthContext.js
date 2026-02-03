import React, { createContext, useState, useEffect, useContext } from 'react';
import { login as apiLogin, register as apiRegister } from '../services/authService';
import { setAuthTokens, clearAuthTokens, getAuthTokens } from '../services/authStorage';
import jwtDecode from 'jwt-decode'; 

export const AuthContext = createContext();

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
        // Sarà null per i cittadini, e pieno per operatori/responsabili. Perfetto.
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
        const userData = extractUserFromToken(tokens.access_token);
        setUser(userData);
      }
    } catch (e) {
      console.error('Error checking auth', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      // Non serve più il tenant_id qui
      const response = await apiLogin(email, password);
      if (response.access_token) {
          await setAuthTokens(response.access_token, response.refresh_token);
          const userData = extractUserFromToken(response.access_token);
          setUser(userData);
          return true;
      }
      return false;
    } catch (e) {
      console.error('Login error', e);
      return false;
    }
  };

  // Niente più tenant_id
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
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);