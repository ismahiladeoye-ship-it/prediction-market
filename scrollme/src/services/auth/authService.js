import client from '../../api/client';
import { AUTH_ENDPOINTS, AUTH_STATUS } from '../../api/endPoints';

export const checkAuthStatusAPI = async () => (await client.get(AUTH_STATUS.AUTH_STATUS)).data;
export const getMeAPI = async () => (await client.get(AUTH_ENDPOINTS.ME)).data.user;
export const forgotPasswordAPI = async (email) => (await client.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email })).data;
export const resetPasswordAPI = async ({ email, code, password }) =>
  (await client.post(AUTH_ENDPOINTS.RESET_PASSWORD, { email, code, password })).data;
// Confirming a new account's email address with the emailed 6-digit code.
export const verifyEmailAPI = async (code) => (await client.post(AUTH_ENDPOINTS.VERIFY_EMAIL, { code })).data;
export const resendVerificationAPI = async () => (await client.post(AUTH_ENDPOINTS.RESEND_VERIFICATION)).data;
export const googleSignInAPI = async (idToken) => (await client.post(AUTH_ENDPOINTS.GOOGLE, { idToken })).data;

// Two-factor sign-in (admins).
export const getMfaStatusAPI = async () => (await client.get(AUTH_ENDPOINTS.MFA)).data;
export const startMfaSetupAPI = async () => (await client.post(AUTH_ENDPOINTS.MFA_SETUP)).data;
export const enableMfaAPI = async (code) => (await client.post(AUTH_ENDPOINTS.MFA_ENABLE, { code })).data;
export const verifyMfaAPI = async (code) => (await client.post(AUTH_ENDPOINTS.MFA_VERIFY, { code })).data;
