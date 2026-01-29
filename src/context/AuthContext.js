import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); 

  const login = (email) => {
    console.log("Tentativo Login con:", email); // Debug
    
    // LOGICA ESATTA DEI REQUISITI
    if (email.toLowerCase().includes('admin') || email.toLowerCase().includes('resp')) {
      setUser({ 
        name: 'Mario Rossi', 
        role: 'responsabile', 
        email: email,
        municipality: 'Salerno' 
      });
    } else if (email.toLowerCase().includes('operatore')) {
      setUser({ 
        name: 'Luigi Verdi', 
        role: 'operatore', 
        email: email,
        municipality: 'Salerno' 
      });
    } else {
      // Default: Cittadino
      setUser({ 
        name: 'Giuseppe Bianchi', 
        role: 'cittadino', 
        email: email 
      });
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);