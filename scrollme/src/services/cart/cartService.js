import client from '../../api/client';
import { CART_ENDPOINTS } from '../../api/endPoints';

// Every call returns the full cart as computed by the server
// ({ items, totalQuantity, summary, deliveryOptions, issues }).
export const viewCartAPI = async (delivery = 'standard') => (await client.get(CART_ENDPOINTS.VIEW_CART, { params: { delivery } })).data;

export const addToCartAPI = async ({ productId, quantity = 1, size = '' }) => (await client.post(CART_ENDPOINTS.ADD_TO_CART, { productId, quantity, size })).data;

export const updateCartItemAPI = async ({ productId, quantity, size = '' }) =>
  (await client.put(CART_ENDPOINTS.UPDATE_CART_ITEM, { productId, quantity, size })).data;

export const deleteCartItemAPI = async ({ productId, size = '' }) => (await client.delete(CART_ENDPOINTS.DELETE_CART_ITEM, { data: { productId, size } })).data;

export const clearCartAPI = async () => (await client.delete(CART_ENDPOINTS.CLEAR_CART)).data;
