import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api';

interface User {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_photo_url?: string;
  premium_tier?: string;
  profile_completeness?: number;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isNewUser: boolean;
  login: (accessToken: string, refreshToken: string, user: User, isNew: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isNewUser: false,
  login: async () => {},
  logout: async () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Check for existing session on app launch
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Set up API interceptor for token refresh
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = await SecureStore.getItemAsync('refresh_token');
            if (!refreshToken) throw new Error('No refresh token');

            const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken });
            await SecureStore.setItemAsync('access_token', data.access_token);
            await SecureStore.setItemAsync('refresh_token', data.refresh_token);
            setToken(data.access_token);

            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
            return api(originalRequest);
          } catch {
            await logout();
          }
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await SecureStore.getItemAsync('access_token');
      if (storedToken) {
        api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        setToken(storedToken);
      }
    } catch {
      // Token expired or invalid — user needs to log in again
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
    } finally {
      setIsLoading(false);
    }
  }

  async function login(accessToken: string, refreshToken: string, userData: User, isNew: boolean) {
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    setToken(accessToken);
    setUser(userData);
    setIsNewUser(isNew);
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    delete api.defaults.headers.common.Authorization;
    setToken(null);
    setUser(null);
    setIsNewUser(false);
  }

  function updateUser(updates: Partial<User>) {
    setUser((prev) => prev ? { ...prev, ...updates } : null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isNewUser, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
