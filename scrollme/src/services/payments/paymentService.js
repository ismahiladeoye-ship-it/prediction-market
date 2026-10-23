import client from '../../api/client';
import { API_BASE_URL } from '../../api/endPoints';

// { provider, testMode, methods: ['apple_pay', 'card', ...] }
export const getPaymentMethodsAPI = async () => (await client.get(`${API_BASE_URL}/payments/methods`)).data;
