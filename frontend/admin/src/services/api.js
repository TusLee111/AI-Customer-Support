import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../config';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

export const markRoomAsRead = async (roomId) => {
  return api.post(`/api/admin/rooms/${roomId}/mark-read`);
}; 