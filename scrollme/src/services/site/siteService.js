import client from '../../api/client';
import { SITE_ENDPOINTS } from '../../api/endPoints';

// { heroSlides, heroMono }; heroSlides is null until an admin saves some.
export const getHomeContentAPI = async () => (await client.get(SITE_ENDPOINTS.HOME)).data;
