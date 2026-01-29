import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null, 'cittadino', 'operatore', 'responsabile'

  const login = (email) => {
    // SIMULAZIONE RUOLI BASATA SULLA EMAIL
    if (email.includes('admin')) {
      setUser({ name: 'Mario Responsabile', role: 'responsabile', email });
    } else if (email.includes('operatore')) {
      setUser({ name: 'Luigi Tecnico', role: 'operatore', email });
    } else {
      setUser({ name: 'Giuseppe Cittadino', role: 'cittadino', email });
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