import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); 

  const login = (email) => {
    // SIMULAZIONE LOGICA RUOLI (Come da Requisiti UC-01)
    if (email.includes('admin') || email.includes('resp')) {
      // Responsabile: Gestisce ticket e operatori
      setUser({ 
        name: 'Mario Rossi (Resp)', 
        role: 'responsabile', 
        email,
        municipality: 'Salerno' 
      });
    } else if (email.includes('operatore')) {
      // Operatore: Prende in carico ticket
      setUser({ 
        name: 'Luigi Verdi (Op)', 
        role: 'operatore', 
        email,
        municipality: 'Salerno' 
      });
    } else {
      // Cittadino: Segnala e monitora
      setUser({ 
        name: 'Giuseppe Bianchi', 
        role: 'cittadino', 
        email 
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