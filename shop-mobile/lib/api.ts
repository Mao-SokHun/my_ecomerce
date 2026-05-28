import axios from 'axios';
import { tokenStorage } from './storage';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;
    if (isRefreshing) return Promise.reject(error);
    isRefreshing = true;
    const rt = await tokenStorage.getRefreshToken();
    isRefreshing = false;
    if (!rt) {
      await tokenStorage.clear();
      return Promise.reject(error);
    }
    try {
      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: rt });
      const { token, refreshToken } = data.data;
      await tokenStorage.setTokens(token, refreshToken);
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      await tokenStorage.clear();
      return Promise.reject(error);
    }
  },
);

export const authApi = {
  login: (data: { identifier: string; password: string }) => api.post('/auth/login', data),
  register: (data: { name: string; email?: string; phone: string; password: string }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const productApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/products', { params }),
  getFeatured: (lang: string) => api.get('/products/featured', { params: { lang } }),
  getBySlug: (slug: string, lang: string) => api.get(`/products/${slug}`, { params: { lang } }),
  suggest: (params: { q: string; limit?: number; lang?: string }) =>
    api.get('/products/suggestions', { params }),
};

export const categoryApi = {
  getAll: () => api.get('/categories'),
};

export const cartApi = {
  get: () => api.get('/cart'),
  add: (data: { productId: string; quantity: number; variantId?: string }) =>
    api.post('/cart', data),
  update: (itemId: string, quantity: number) => api.put(`/cart/${itemId}`, { quantity }),
  remove: (itemId: string) => api.delete(`/cart/${itemId}`),
};
