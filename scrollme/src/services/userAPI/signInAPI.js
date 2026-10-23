import client from '../../api/client';
import { AUTH_ENDPOINTS } from '../../api/endPoints';

export const UserSignInAPI = async (loginData) => (await client.post(AUTH_ENDPOINTS.SIGN_IN, loginData)).data;
