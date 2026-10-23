import client from '../../api/client';
import { API_BASE_URL } from '../../api/endPoints';

export const subscribeAPI = async (email) => (await client.post(`${API_BASE_URL}/newsletter`, { email })).data;
