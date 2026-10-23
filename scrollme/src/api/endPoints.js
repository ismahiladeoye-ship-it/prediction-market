// Relative by default so the browser talks to the same origin (CRA dev proxy
// or the nginx reverse proxy in production) and cookies stay first-party.
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const AUTH_ENDPOINTS = {
  SIGN_IN: `${API_BASE_URL}/auth/login`,
  SIGN_UP: `${API_BASE_URL}/auth/register`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,
  REFRESH: `${API_BASE_URL}/auth/refresh-token`,
  ME: `${API_BASE_URL}/auth/me`,
  GOOGLE: `${API_BASE_URL}/auth/google`,
  FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
};

export const PRODUCT_ENDPOINTS = {
  ADD_PRODUCT: `${API_BASE_URL}/product/add`,
  LIST_PRODUCTS: `${API_BASE_URL}/product/list`,
  CATEGORIES: `${API_BASE_URL}/product/categories`,
  GET_PRODUCT_BY_ID: (productId) => `${API_BASE_URL}/product/${productId}`,
  UPDATE_PRODUCT: (productId) => `${API_BASE_URL}/product/update/${productId}`,
  DELETE_PRODUCT: (productId) => `${API_BASE_URL}/product/delete/${productId}`,
};

export const CART_ENDPOINTS = {
  ADD_TO_CART: `${API_BASE_URL}/cart/add`,
  VIEW_CART: `${API_BASE_URL}/cart/view`,
  UPDATE_CART_ITEM: `${API_BASE_URL}/cart/update`,
  DELETE_CART_ITEM: `${API_BASE_URL}/cart/delete`,
  CLEAR_CART: `${API_BASE_URL}/cart/clear`,
};

export const WISHLIST_ENDPOINTS = {
  LIST: `${API_BASE_URL}/wishlist`,
  MERGE: `${API_BASE_URL}/wishlist/merge`,
  ITEM: (productId) => `${API_BASE_URL}/wishlist/${productId}`,
};

export const ORDER_ENDPOINTS = {
  ORDERS: `${API_BASE_URL}/orders`,
  ORDER: (orderId) => `${API_BASE_URL}/orders/${orderId}`,
  CANCEL: (orderId) => `${API_BASE_URL}/orders/${orderId}/cancel`,
  PAY: (orderId) => `${API_BASE_URL}/orders/${orderId}/pay`,
  MOCK_COMPLETE: (orderId) => `${API_BASE_URL}/payments/mock/${orderId}/complete`,
};

export const ADMIN_ENDPOINTS = {
  STATS: `${API_BASE_URL}/admin/stats`,
  PRODUCTS: `${API_BASE_URL}/admin/products`,
  PRODUCT: (productId) => `${API_BASE_URL}/admin/products/${productId}`,
  STOCK: (productId) => `${API_BASE_URL}/admin/products/${productId}/stock`,
  ORDERS: `${API_BASE_URL}/admin/orders`,
  ORDER: (orderId) => `${API_BASE_URL}/admin/orders/${orderId}`,
  ORDER_STATUS: (orderId) => `${API_BASE_URL}/admin/orders/${orderId}/status`,
};

export const AUTH_STATUS = {
  AUTH_STATUS: `${API_BASE_URL}/auth/status`,
};
