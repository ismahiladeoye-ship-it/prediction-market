import client from '../../api/client';
import { SITE_ENDPOINTS } from '../../api/endPoints';

// { heroSlides, heroMono }; heroSlides is null until an admin saves some.
export const getHomeContentAPI = async () => (await client.get(SITE_ENDPOINTS.HOME)).data;
// Who runs the shop (Admin → Shop details) and the delivery terms.
export const getShopDetailsAPI = async () => (await client.get(SITE_ENDPOINTS.BUSINESS)).data;
// Contact page: a question or a sourcing request.
export const sendContactMessageAPI = async (message) => (await client.post(SITE_ENDPOINTS.CONTACT, message)).data;
