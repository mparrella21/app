import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); 

  const login = (email) => {
    // LOGICA RUOLI BASATA SUI REQUISITI DI PROGETTO
    if (email.includes('admin') || email.includes('resp')) {
      // Responsabile della Manutenzione: Vede Dashboard, gestisce ticket
      setUser({ 
        name: 'Mario Rossi', 
        role: 'responsabile', 
        email,
        municipality: 'Salerno' 
      });
    } else if (email.includes('operatore')) {
      // Operatore: Vede lista incarichi, cambia stato
      setUser({ 
        name: 'Luigi Verdi', 
        role: 'operatore', 
        email,
        municipality: 'Salerno' 
      });
    } else {
      // Cittadino: Segnala (Tasto +), vede mappa
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