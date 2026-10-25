import client from '../../api/client';
import { AUTH_ENDPOINTS } from '../../api/endPoints';

// Returns the axios response so callers can read `status` (original contract).
export const UserSingOutAPI = async () => client.post(AUTH_ENDPOINTS.LOGOUT);
