import client from '../../api/client';
import { AUTH_ENDPOINTS } from '../../api/endPoints';

export const UserRegistrationAPI = async (userData) => (await client.post(AUTH_ENDPOINTS.SIGN_UP, userData)).data;
