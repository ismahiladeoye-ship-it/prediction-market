import styled from 'styled-components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Alert, AlertIcon, Box, Spinner, useToast } from '@chakra-ui/react';
import Navbar from '../components/Navbar';
import Announcement from '../components/Announcement';
import Footer from '../components/Footer';
import OrderSummary from '../components/OrderSummary';
import OrderItems from '../components/OrderItems';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { cancelOrderAPI, getOrderAPI, resumePaymentAPI } from '../services/orders/orderService';
import { viewCart } from '../store/slices/cartSlice';
import { getErrorMessage } from '../api/client';
import { formatDate, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../utils/format';
import { COUNTRIES } from '../utils/countries';
import PaymentMethodSheet from '../components/payment/PaymentMethodSheet';
import { getPaymentMethodsAPI } from '../services/payments/paymentService';

const OrderDetail = () => {
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const checkout = params.get('checkout');
  const dispatch = useDispatch();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const polls = useRef(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payment, setPayment] = useState({ methods: ['card'], testMode: false });
  const [method, setMethod] = useState('card');

  useEffect(() => {
    getPaymentMethodsAPI()
      .then(setPayment)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (order?.payment?.method) setMethod(order.payment.method);
  }, [order?.payment?.method]);

  const load = useCallback(async () => {
    try {
      const data = await getOrderAPI(orderId);
      setOrder(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.response?.status === 404 || err.response?.status === 400 ? 'not_found' : getErrorMessage(err));
      return null;
    }
  }, [orderId]);

  // After returning from the payment page the confirmation webhook can lag a
  // few seconds behind, so poll briefly until the order shows as paid.
  useEffect(() => {
    let timer;
    const run = async () => {
      const data = await load();
      if (data?.payment?.status === 'paid') dispatch(viewCart());
      if (checkout === 'success' && data?.status === 'pending_payment' && polls.current < 10) {
        polls.current += 1;
        timer = setTimeout(run, 2000);
      }
    };
    run();
    return () => clearTimeout(timer);
  }, [load, checkout, dispatch]);

  const handlePay = async () => {
    setBusy(true);
    try {
      const { checkoutUrl, order: updated } = await resumePaymentAPI(orderId, method);
      if (checkoutUrl) window.location.assign(checkoutUrl);
      else setOrder(updated);
    } catch (err) {
      setSheetOpen(false);
      toast({ title: 'Payment could not be started', description: getErrorMessage(err), status: 'error', duration: 5000, isClosable: true });
      load();
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setBusy(true);
    try {
      setOrder(await cancelOrderAPI(orderId));
      toast({ title: 'Order cancelled', status: 'success', duration: 4000, isClosable: true });
    } catch (err) {
      toast({ title: 'Could not cancel', description: getErrorMessage(err), status: 'error', duration: 5000, isClosable: true });
    } finally {
      setBusy(false);
    }
  };

  const countryName = (code) => COUNTRIES.find((c) => c.code === code)?.name || code;

  return (
    <div>
      <Navbar />
      <Announcement />
      <Wrapper>
        {!order && !error && (
          <Box textAlign='center' py={20}>
            <Spinner size='xl' color='teal' />
          </Box>
        )}
        {error && (
          <Box textAlign='center' py={20}>
            <Title>{error === 'not_found' ? 'Order not found' : 'Something went wrong'}</Title>
            {error !== 'not_found' && <p>{error}</p>}
            <p>
              <Link to='/account' style={{ color: 'teal', textDecoration: 'underline' }}>
                View your orders
              </Link>
            </p>
          </Box>
        )}
        {order && (
          <>
            <Title>ORDER {order.orderNumber}</Title>
            <Meta>
              Placed {formatDate(order.createdAt)} · <OrderStatusBadge status={order.status} />
            </Meta>

            {checkout === 'success' && order.payment.status === 'paid' && (
              <Alert status='success' mb={6} borderRadius='md'>
                <AlertIcon />
                Thank you! Your payment was received and your order is confirmed.
              </Alert>
            )}
            {checkout === 'success' && order.status === 'pending_payment' && (
              <Alert status='info' mb={6} borderRadius='md'>
                <AlertIcon />
                We are confirming your payment. This page will update automatically.
              </Alert>
            )}
            {checkout === 'cancelled' && order.status === 'pending_payment' && (
              <Alert status='warning' mb={6} borderRadius='md'>
                <AlertIcon />
                Payment was not completed. Your items are reserved until {new Date(order.reservationExpiresAt).toLocaleTimeString()}.
              </Alert>
            )}
            {order.attention && (
              <Alert status='warning' mb={6} borderRadius='md'>
                <AlertIcon />
                There is a problem with this order. Our team has been notified and will contact you.
              </Alert>
            )}

            <Bottom>
              <Info>
                <SectionTitle>Items</SectionTitle>
                <OrderItems items={order.items} />

                <Columns>
                  <div>
                    <SectionTitle>Delivery address</SectionTitle>
                    <Address>
                      {order.shippingAddress.fullName}
                      <br />
                      {order.shippingAddress.line1}
                      {order.shippingAddress.line2 && (
                        <>
                          <br />
                          {order.shippingAddress.line2}
                        </>
                      )}
                      <br />
                      {order.shippingAddress.city}
                      {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ''} {order.shippingAddress.postalCode}
                      <br />
                      {countryName(order.shippingAddress.country)}
                      <br />
                      {order.shippingAddress.phone}
                    </Address>
                    <p>
                      Delivery: <strong>{order.deliveryMethod === 'express' ? 'Express' : 'Standard'}</strong>
                    </p>
                    {order.payment.method && (
                      <p>
                        Payment: <strong>{PAYMENT_METHOD_LABELS[order.payment.method]}</strong>
                      </p>
                    )}
                    {order.trackingNumber && (
                      <p>
                        Tracking number: <strong>{order.trackingNumber}</strong>
                      </p>
                    )}
                  </div>
                  <div>
                    <SectionTitle>Order tracking</SectionTitle>
                    <Timeline>
                      {order.statusHistory.map((h, i) => (
                        <li key={`${h.status}-${i}`}>
                          <strong>{ORDER_STATUS_LABELS[h.status] || h.status}</strong>
                          <span>{new Date(h.at).toLocaleString()}</span>
                        </li>
                      ))}
                    </Timeline>
                  </div>
                </Columns>
              </Info>
              <Side>
                <OrderSummary summary={order.summary} compact>
                  {order.status === 'pending_payment' && (
                    <>
                      <Button type='button' onClick={() => setSheetOpen(true)} disabled={busy}>
                        COMPLETE PAYMENT
                      </Button>
                      <SecondaryButton type='button' onClick={handleCancel} disabled={busy}>
                        CANCEL ORDER
                      </SecondaryButton>
                    </>
                  )}
                </OrderSummary>
              </Side>
            </Bottom>
          </>
        )}
      </Wrapper>
      <Footer />
      {order && (
        <PaymentMethodSheet
          isOpen={sheetOpen}
          methods={payment.methods}
          selected={method}
          onSelect={setMethod}
          onClose={() => !busy && setSheetOpen(false)}
          onConfirm={handlePay}
          total={order.summary.total}
          busy={busy}
          testMode={payment.testMode}
        />
      )}
    </div>
  );
};

export default OrderDetail;

const Wrapper = styled.div`
  padding: 20px;
  margin: 40px auto 0;
  width: 100%;
  @media (min-width: 1024px) {
    width: 80%;
  }
`;

const Title = styled.h1`
  font-weight: 300;
  font-size: 2em;
  text-align: center;
  word-break: break-word;
`;

const Meta = styled.div`
  text-align: center;
  color: #555;
  margin: 8px 0 24px;
`;

const Bottom = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const Info = styled.div`
  flex: 3;
  min-width: 0;
`;

const Side = styled.div`
  flex: 2;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin: 20px 0 10px;
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Address = styled.p`
  line-height: 1.6;
  margin-bottom: 8px;
`;

const Timeline = styled.ol`
  border-left: 2px solid teal;
  padding-left: 14px;
  li {
    margin-bottom: 10px;
    display: flex;
    flex-direction: column;
  }
  span {
    font-size: 12px;
    color: #777;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 10px;
  background-color: black;
  color: white;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
  }
`;

const SecondaryButton = styled(Button)`
  margin-top: 10px;
  background-color: white;
  color: black;
  border: 1px solid black;
`;
