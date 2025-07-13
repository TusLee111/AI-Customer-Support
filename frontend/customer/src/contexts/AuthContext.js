import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { API_BASE_URL, STORAGE_KEYS } from '../config';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for existing token on app load
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    
    async function fetchProfile() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/customer/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const profile = await res.json();
          // Ensure consistent format: add 'id' field if it doesn't exist
          if (!profile.id && profile._id) {
            profile.id = profile._id;
          }
          setUser(profile);
          localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(profile));
        } else {
          // Token hết hạn hoặc lỗi, xóa local
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER_DATA);
          setUser(null);
        }
      } catch {
        setUser(null);
      }
      setLoading(false);
    }

    if (token) {
      fetchProfile();
    } else if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Ensure consistent format: add 'id' field if it doesn't exist
        if (!parsedUser.id && parsedUser._id) {
          parsedUser.id = parsedUser._id;
        }
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      // Step 1: Get the token from the login endpoint
      const response = await fetch(`${API_BASE_URL}/api/auth/customer/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: email, password }),
      });

      const tokenData = await response.json();

      if (!response.ok) {
        throw new Error(tokenData.detail || 'Login failed');
      }

      // Step 2: Save the token to local storage immediately
      const { access_token } = tokenData;
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);

      // Step 3: Use the new token to fetch the full user profile
      const profileResponse = await fetch(`${API_BASE_URL}/api/auth/customer/profile`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile after login.');
      }

      const profile = await profileResponse.json();

      // Step 4: Ensure data consistency ('id' vs '_id')
      if (profile._id && !profile.id) {
        profile.id = profile._id;
      }
      
      // Step 5: Save the complete user profile to state and local storage
      setUser(profile);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(profile));
      
      console.log('[AuthContext:login] Full profile fetched and state set:', profile);

      return profile; // Return the full user profile
    } catch (err) {
      // Clear any partial data if the process fails
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      setError(err.message);
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/customer/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (Array.isArray(data.detail)) {
          throw new Error(data.detail.join('\n'));
        }
        throw new Error(data.detail || 'Registration failed');
      }

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data.user));
      localStorage.setItem('customer_id', data.user_id);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setError(null);
    // Có thể thêm callback hoặc event để các context khác reset theo nếu cần
  };

  const getAuthToken = () => {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  };

  const isAuthenticated = () => {
    return !!getAuthToken() && !!user;
  };

  const value = useMemo(() => ({
    user,
    loading,
    error,
    login,
    register,
    logout,
    getAuthToken: () => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
    isAuthenticated: () => !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) && !!user,
  }), [user, loading, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 