import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(() => {
    return localStorage.getItem('barley_admin_token') || null;
  });

  const isAuthenticated = !!adminToken;

  const login = async (password) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        const data = await res.json();
        setAdminToken(data.token);
        localStorage.setItem('barley_admin_token', data.token);
        return { success: true };
      }
    } catch (_) {}

    // Fallback if backend server is not running or standalone mode
    if (password === 'barleyadmin2024') {
      const fallbackToken = 'barleyadmin2024';
      setAdminToken(fallbackToken);
      localStorage.setItem('barley_admin_token', fallbackToken);
      return { success: true };
    }

    return { success: false, error: 'Nieprawidłowe hasło' };
  };

  const logout = () => {
    setAdminToken(null);
    localStorage.removeItem('barley_admin_token');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, adminToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
