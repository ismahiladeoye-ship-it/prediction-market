import client from '../../api/client';
import { AUTH_ENDPOINTS, AUTH_STATUS } from '../../api/endPoints';

export const checkAuthStatusAPI = async () => (await client.get(AUTH_STATUS.AUTH_STATUS)).data;
export const getMeAPI = async () => (await client.get(AUTH_ENDPOINTS.ME)).data.user;
export const forgotPasswordAPI = async (email) => (await client.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email })).data;
export const resetPasswordAPI = async ({ token, password }) => (await client.post(AUTH_ENDPOINTS.RESET_PASSWORD, { token, password })).data;
export const googleSignInAPI = async (idToken) => (await client.post(AUTH_ENDPOINTS.GOOGLE, { idToken })).data;
