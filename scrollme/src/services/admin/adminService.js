import client from '../../api/client';
import { ADMIN_ENDPOINTS } from '../../api/endPoints';

const clean = (params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const getStatsAPI = async () => (await client.get(ADMIN_ENDPOINTS.STATS)).data;
export const listAdminProductsAPI = async (params) => (await client.get(ADMIN_ENDPOINTS.PRODUCTS, { params: clean(params) })).data;
export const createProductAPI = async (data) => (await client.post(ADMIN_ENDPOINTS.PRODUCTS, data)).data.product;
export const updateProductAPI = async (productId, data) => (await client.patch(ADMIN_ENDPOINTS.PRODUCT(productId), data)).data.product;
export const deactivateProductAPI = async (productId) => (await client.delete(ADMIN_ENDPOINTS.PRODUCT(productId))).data.product;
export const adjustStockAPI = async (productId, delta) => (await client.post(ADMIN_ENDPOINTS.STOCK(productId), { delta })).data.product;
export const listAdminOrdersAPI = async (params) => (await client.get(ADMIN_ENDPOINTS.ORDERS, { params: clean(params) })).data;
export const getAdminOrderAPI = async (orderId) => (await client.get(ADMIN_ENDPOINTS.ORDER(orderId))).data;
export const updateOrderStatusAPI = async (orderId, body) => (await client.patch(ADMIN_ENDPOINTS.ORDER_STATUS(orderId), body)).data;
