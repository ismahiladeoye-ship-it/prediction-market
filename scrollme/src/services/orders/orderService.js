import client from '../../api/client';
import { ORDER_ENDPOINTS } from '../../api/endPoints';

export const placeOrderAPI = async ({ shippingAddress, deliveryMethod, paymentMethod }) =>
  (await client.post(ORDER_ENDPOINTS.ORDERS, { shippingAddress, deliveryMethod, paymentMethod })).data;
export const listOrdersAPI = async (page = 1) => (await client.get(ORDER_ENDPOINTS.ORDERS, { params: { page, limit: 10 } })).data;
export const getOrderAPI = async (orderId) => (await client.get(ORDER_ENDPOINTS.ORDER(orderId))).data.order;
export const cancelOrderAPI = async (orderId) => (await client.post(ORDER_ENDPOINTS.CANCEL(orderId))).data.order;
export const resumePaymentAPI = async (orderId, paymentMethod) =>
  (await client.post(ORDER_ENDPOINTS.PAY(orderId), paymentMethod ? { paymentMethod } : {})).data;
export const completeMockPaymentAPI = async (orderId) => (await client.post(ORDER_ENDPOINTS.MOCK_COMPLETE(orderId))).data.order;
