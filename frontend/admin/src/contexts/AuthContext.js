import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, STORAGE_KEYS, API_BASE_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
  const [isLoading, setIsLoading] = useState(true);

  // Set up axios interceptor for authentication
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    }
  }, [token]);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Only fetch user if a token exists but the user object doesn't
      if (token && !user) {
        try {
          const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.ME}`);
          console.log("[DEBUG] /api/auth/me response:", response.data);
          setUser(response.data);
        } catch (error) {
          console.error('[DEBUG] Auth check failed, logging out:', error);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token, user]);

  const login = useCallback(async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.LOGIN}`, {
      username,
      password
    });
    // Correctly destructure the user info from the login response
    const { access_token, user_id, username: resUsername, user_type } = response.data;
    setToken(access_token);
    setUser({ id: user_id, username: resUsername, user_type });
    return response.data;
  }, []);

  const logout = useCallback(() => {
    console.log("[DEBUG] Logout called");
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    login,
    logout,
  }), [user, token, isLoading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 