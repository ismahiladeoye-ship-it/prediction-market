import client from '../../api/client';
import { PRODUCT_ENDPOINTS } from '../../api/endPoints';

// List products. `params` may contain page, limit, q, category, brand,
// minPrice, maxPrice, inStock and sort; the second form (page, limit) is kept
// for the original callers.
export const listProductsAPI = async (params = 1, limit = 40) => {
  const query = typeof params === 'object' ? params : { page: params, limit };
  const clean = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const response = await client.get(PRODUCT_ENDPOINTS.LIST_PRODUCTS, { params: clean });
  return response.data;
};

export const listCategoriesAPI = async () => {
  const response = await client.get(PRODUCT_ENDPOINTS.CATEGORIES);
  return response.data.categories;
};

export const getProductByIdAPI = async (productId) => {
  const response = await client.get(PRODUCT_ENDPOINTS.GET_PRODUCT_BY_ID(productId));
  return response.data;
};
