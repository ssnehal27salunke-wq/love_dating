import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://lovemarriage-api.onrender.com/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 35000, // 35s — handles Render free tier cold start (~15-30s)
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {}
    return config;
  },
  (error) => Promise.reject(error)
);
