import client from '../../api/client';
import { ADMIN_ENDPOINTS } from '../../api/endPoints';

const clean = (params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const getStatsAPI = async () => (await client.get(ADMIN_ENDPOINTS.STATS)).data;
export const listAdminProductsAPI = async (params) => (await client.get(ADMIN_ENDPOINTS.PRODUCTS, { params: clean(params) })).data;
export const createProductAPI = async (data) => (await client.post(ADMIN_ENDPOINTS.PRODUCTS, data)).data.product;
export const updateProductAPI = async (productId, data) => (await client.patch(ADMIN_ENDPOINTS.PRODUCT(productId), data)).data.product;
export const deactivateProductAPI = async (productId) => (await client.delete(ADMIN_ENDPOINTS.PRODUCT(productId))).data.product;
export const adjustStockAPI = async (productId, delta) => (await client.post(ADMIN_ENDPOINTS.STOCK(productId), { delta })).data.product;
// One photo per request; the API returns { url, width, height }. The explicit
// multipart type stops the client's JSON default from serialising the form.
export const uploadPhotoAPI = async (file) => {
  const form = new FormData();
  form.append('image', file);
  return (await client.post(ADMIN_ENDPOINTS.UPLOADS, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })).data;
};

// Spreadsheet check/import. Row problems come back as a 400 with the same
// shape as a success, so the preview can list them.
export const importProductsAPI = async ({ csv, dryRun, photos }) => {
  try {
    return (await client.post(ADMIN_ENDPOINTS.IMPORT, { csv, dryRun, photos }, { timeout: 120000 })).data;
  } catch (err) {
    if (err.response?.status === 400 && Array.isArray(err.response.data?.rows)) return err.response.data;
    throw err;
  }
};

export const listAdminOrdersAPI = async (params) => (await client.get(ADMIN_ENDPOINTS.ORDERS, { params: clean(params) })).data;
export const getAdminOrderAPI = async (orderId) => (await client.get(ADMIN_ENDPOINTS.ORDER(orderId))).data;
export const updateOrderStatusAPI = async (orderId, body) => (await client.patch(ADMIN_ENDPOINTS.ORDER_STATUS(orderId), body)).data;
