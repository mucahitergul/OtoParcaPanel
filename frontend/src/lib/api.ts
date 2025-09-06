import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Try to get token from sessionStorage first, then cookies
    let token = null;
    if (typeof window !== 'undefined') {
      token = sessionStorage.getItem('auth_token') || Cookies.get('auth_token');
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('auth_token');
      }
      Cookies.remove('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api.post('/auth/register', data),
  
  getProfile: (token?: string) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return api.get('/auth/profile', { headers });
  },
  
  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot-password', data),
  
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
  
  getCurrentUser: () =>
    api.get('/auth/me'),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/auth/change-password', data),
  
  updateProfile: (data: { firstName?: string; lastName?: string; email?: string; phone?: string }) =>
    api.patch('/auth/profile', data),
  
  logout: () =>
    api.post('/auth/logout'),
  
  refreshToken: (data: { refreshToken: string }) =>
    api.post('/auth/refresh-token', data),
  
  verifyEmail: (token: string) =>
    api.post(`/auth/verify-email/${token}`),
  
  resendVerification: () =>
    api.post('/auth/resend-verification'),
};

// Product API endpoints
export const productApi = {
  getProducts: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    stockStatus?: 'instock' | 'outofstock' | 'onbackorder';
    hasStock?: boolean;
    priceMin?: number;
    priceMax?: number;
    supplier?: 'Dinamik' | 'Başbuğ' | 'Doğuş';
    needsSync?: boolean;
  }) => api.get('/products', { params }),

  getProduct: (id: number) => api.get(`/products/${id}`),

  getProductBySku: (sku: string) => api.get(`/products/sku/${sku}`),

  getStatistics: () => api.get('/products/statistics'),

  getProductStatistics: () => api.get('/products/statistics'),

  getProductsNeedingSync: (limit?: number) => 
    api.get('/products/needs-sync', { params: { limit } }),

  getSupplierPrices: (productId: number) => 
    api.get(`/products/${productId}/supplier-prices`),

  getUpdateHistory: (productId: number, limit?: number) => 
    api.get(`/products/${productId}/history`, { params: { limit } }),

  updateStock: (productId: number, stockQuantity: number) => 
    api.put(`/products/${productId}/stock`, { stock_quantity: stockQuantity }),

  updatePrice: (productId: number, price: number) => 
    api.put(`/products/${productId}/price`, { price }),

  updateProduct: (productId: number, data: {
    urun_adi: string;
    stok_kodu: string;
    regular_price: number;
    stok_miktari: number;
    stock_status: 'instock' | 'outofstock' | 'onbackorder';
    description?: string;
    short_description?: string;
    sale_price?: number;
  }) => api.put(`/products/${productId}`, data),

  updateSupplierPrice: (productId: number, data: {
    supplier: 'Dinamik' | 'Başbuğ' | 'Doğuş';
    price: number;
    stock_quantity: number;
    stock_status: 'instock' | 'outofstock' | 'onbackorder';
  }) => api.put(`/products/${productId}/supplier-price`, data),

  syncProducts: (options?: { forceUpdate?: boolean; batchSize?: number }) => 
    api.post('/products/sync', options),

  // WooCommerce sync
  pushToWooCommerce: (options?: { productIds?: number[]; batchSize?: number }) =>
    api.post('/products/push-to-woocommerce', options),
  
  // Single product sync
  syncSingleProduct: (productId: number) =>
    api.post('/products/sync-single', { productId }),

  // Bulk Operations
  bulkSync: (productIds: number[], batchSize?: number) => 
    api.post('/products/bulk/sync', { productIds, batchSize }),

  bulkDelete: (productIds: number[]) => 
    api.post('/products/bulk/delete', { productIds }),

  bulkPriceUpdate: (productIds: number[], updateType: 'fixed' | 'percentage_increase' | 'percentage_decrease' | 'amount_increase' | 'amount_decrease', value: number) => 
    api.post('/products/bulk/price-update', { productIds, updateType, value }),

  bulkStockUpdate: (productIds: number[], updateType: 'fixed' | 'increase' | 'decrease', value: number) => 
    api.post('/products/bulk/stock-update', { productIds, updateType, value }),

  bulkExport: (productIds: number[], format: 'csv' | 'excel' | 'pdf', fields?: string[]) => 
    api.post('/products/bulk/export', { productIds, format, fields }),

  getSyncStatus: () => api.get('/products/sync/status'),

  triggerImmediateSync: (options?: { forceUpdate?: boolean; productIds?: number[] }) => 
    api.post('/products/sync/immediate', options),

  markForSync: (productIds: number[]) => 
    api.post('/products/mark-for-sync', { productIds }),

  getProductsNeedingSync: (limit?: number) => 
    api.get('/products/needs-sync', { params: { limit } }),

  deleteProduct: (id: number) => api.delete(`/products/${id}`),

  deleteAllProducts: () => api.post('/products/delete-all'),
};

// WooCommerce API endpoints
export const wooCommerceApi = {
  testConnection: () => api.get('/woocommerce/test-connection'),

  getConfigStatus: () => api.get('/woocommerce/config-status'),

  getProducts: (params?: { page?: number; per_page?: number }) => 
    api.get('/woocommerce/products', { params }),

  getProduct: (id: number) => api.get(`/woocommerce/products/${id}`),

  getProductBySku: (sku: string) => api.get(`/woocommerce/products/sku/${sku}`),

  updateProductStock: (productId: number, stockQuantity: number) => 
    api.put(`/woocommerce/products/${productId}/stock`, { stock_quantity: stockQuantity }),

  updateProductPrice: (productId: number, price: string) => 
    api.put(`/woocommerce/products/${productId}/price`, { price }),

  syncProducts: () => api.post('/woocommerce/sync-products'),
};

// Reports API endpoints
export const reportsApi = {
  getOverviewReport: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/overview', { params }),

  getInventoryReport: (params?: { category?: string; stockStatus?: 'instock' | 'outofstock' | 'onbackorder' }) =>
    api.get('/reports/inventory', { params }),

  getSynchronizationReport: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/synchronization', { params }),

  getTrendsReport: (params?: { period?: 'daily' | 'weekly' | 'monthly'; startDate?: string; endDate?: string }) =>
    api.get('/reports/trends', { params }),

  getPriceAnalysisReport: (params?: { supplier?: 'Dinamik' | 'Başbuğ' | 'Doğuş' }) =>
    api.get('/reports/price-analysis', { params }),

  getPerformanceMetrics: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/performance', { params }),
};

export default api;