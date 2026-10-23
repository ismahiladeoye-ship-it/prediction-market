import client from '../../api/client';
import { WISHLIST_ENDPOINTS } from '../../api/endPoints';

export const getWishlistAPI = async () => (await client.get(WISHLIST_ENDPOINTS.LIST)).data.items;
export const addWishlistAPI = async (productId) => (await client.post(WISHLIST_ENDPOINTS.LIST, { productId })).data.items;
export const removeWishlistAPI = async (productId) => (await client.delete(WISHLIST_ENDPOINTS.ITEM(productId))).data.items;
export const mergeWishlistAPI = async (productIds) => (await client.post(WISHLIST_ENDPOINTS.MERGE, { productIds })).data.items;
