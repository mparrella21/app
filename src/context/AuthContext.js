import React, { createContext, useState, useEffect, useContext } from 'react';
import { login as apiLogin, register as apiRegister, authenticatedFetch } from '../services/authService'; // IMPORTATO authenticatedFetch
import { setAuthTokens, clearAuthTokens, getAuthTokens } from '../services/authStorage';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { jwtDecode } from 'jwt-decode';
import { API_BASE } from '../services/config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Funzione Helper per aggiornare stato E memoria locale
  const updateUser = async (userData) => {
      setUserState(userData);
      if (userData) {
          await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      } else {
          await AsyncStorage.removeItem('user_data');
      }
  };

  const extractUserFromToken = (token) => {
    try {
      const decoded = jwtDecode(token);
      
      const rawRole = decoded.role;
      let mappedRole = 'cittadino'; 

      if (typeof rawRole === 'string') {
          mappedRole = rawRole.toLowerCase();
      } else if (typeof rawRole === 'number') {
          if (rawRole === 1) mappedRole = 'operatore';
          else if (rawRole === 2) mappedRole = 'responsabile'; 
          else if (rawRole === 3) mappedRole = 'admin'; 
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
      
      // 1. TENTATIVO RECUPERO DATI CACHED (Risolve il problema della 'U')
      const cachedUser = await AsyncStorage.getItem('user_data');
      if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          setUserState(parsedUser); // Impostiamo subito i dati vecchi (completi di nome)
      }

      if (tokens && tokens.access_token) {
        // Estrae dati freschi dal token
        const tokenUser = extractUserFromToken(tokens.access_token);
        
        // Se avevamo dati in cache, li uniamo a quelli del token (il token vince su ruolo/id)
        let currentUser = cachedUser ? { ...JSON.parse(cachedUser), ...tokenUser } : tokenUser;
        const storedEmail = await AsyncStorage.getItem('user_email');
        // 2. RECUPERO DATI AGGIORNATI DAL SERVER
        // Usiamo authenticatedFetch per gestire refresh token automatico
        try {
          const response = await authenticatedFetch(`${API_BASE}/user/${currentUser.id}`, {
            method: 'GET'
          });
          
          if (response.ok) {
            const profileData = await response.json();
            const realUser = Array.isArray(profileData) ? profileData[0] : (profileData.user || profileData);
            console.log("Fetched user profile on app start:", realUser);
            if (realUser) {
              currentUser.name = realUser.name || currentUser.name;
              currentUser.surname = realUser.surname || currentUser.surname;
              currentUser.phonenumber = realUser.phonenumber || currentUser.phonenumber;
              currentUser.birth_date = realUser.birth_date || currentUser.birth_date;
              currentUser.email= storedEmail;
              // Aggiorniamo stato e cache
              await updateUser(currentUser);
            }
          } else {
             console.log("Fetch user profile failed, keeping cached data.");
          }
        } catch(err) {
          console.log("Errore connessione profilo al riavvio:", err);
          // Non facciamo nulla, teniamo l'utente che abbiamo caricato dalla cache
        }
        
        // Se non avevamo cache e la fetch è fallita, impostiamo almeno i dati del token
        if (!user && !cachedUser) {
            updateUser(currentUser);
        }
      } else {
          // Nessun token, puliamo tutto
          updateUser(null);
      }
    } catch (e) {
      console.error('Error checking auth', e);
      updateUser(null);
    } finally {
      setLoading(false);
    }
  };

  const setDirectLogin = async (token, userData) => {
    // Usato da Google Login o Registrazione
    await updateUser(userData);
  };

  useEffect(() => {
    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiLogin(email, password);
      
      if (response.success) {
        // AuthStorage è già gestito nel service, qui aggiorniamo lo stato
        await updateUser(response.user); 
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
    await updateUser(null); // Pulisce stato e AsyncStorage
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        loading, 
        login, 
        register, 
        logout, 
        setDirectLogin,
        setUser: updateUser // Esponiamo updateUser come setUser per ProfileScreen
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);