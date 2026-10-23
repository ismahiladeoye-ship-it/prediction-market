import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner, useToast } from '@chakra-ui/react';
import { FaApple, FaGoogle, FaLock, FaPaypal } from 'react-icons/fa';
import { SiKlarna } from 'react-icons/si';
import Logo from '../components/Logo';
import { CardBrands } from '../components/payment/PaymentLogos';
import { completeMockPaymentAPI, getOrderAPI } from '../services/orders/orderService';
import { getErrorMessage } from '../api/client';
import { formatPrice, PAYMENT_METHOD_LABELS } from '../utils/format';
import { DECLINE_TEST_CARD, digitsOnly, formatCardNumber, formatExpiry, validateCard, cardBrand } from '../utils/cardValidation';

// Local stand-in for the hosted payment page, used only when the API runs with
// PAYMENT_PROVIDER=mock (development and automated tests). No money moves and
// nothing typed here is sent to the server — only "this order was paid".

const CardForm = ({ total, onPay, busy }) => {
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [errors, setErrors] = useState({});
  const brand = cardBrand(card.number);

  const set = (key, format) => (e) => {
    setCard((c) => ({ ...c, [key]: format ? format(e.target.value) : e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const found = validateCard(card);
    setErrors(found);
    if (Object.keys(found).length) return;
    if (digitsOnly(card.number) === DECLINE_TEST_CARD) {
      setErrors({ number: 'Your card was declined. Try another card.' });
      return;
    }
    onPay();
  };

  return (
    <Form onSubmit={submit} noValidate>
      <CardBrands />
      <Field>
        <label htmlFor='card-number'>Card number</label>
        <input
          id='card-number'
          inputMode='numeric'
          autoComplete='cc-number'
          placeholder='1234 1234 1234 1234'
          value={card.number}
          onChange={set('number', formatCardNumber)}
          aria-invalid={Boolean(errors.number)}
        />
        {errors.number && <Err role='alert'>{errors.number}</Err>}
      </Field>
      <Two>
        <Field>
          <label htmlFor='card-expiry'>Expiry</label>
          <input
            id='card-expiry'
            inputMode='numeric'
            autoComplete='cc-exp'
            placeholder='MM/YY'
            value={card.expiry}
            onChange={set('expiry', formatExpiry)}
            aria-invalid={Boolean(errors.expiry)}
          />
          {errors.expiry && <Err>{errors.expiry}</Err>}
        </Field>
        <Field>
          <label htmlFor='card-cvc'>Security code</label>
          <input
            id='card-cvc'
            inputMode='numeric'
            autoComplete='cc-csc'
            placeholder={brand === 'amex' ? '4 digits' : 'CVC'}
            value={card.cvc}
            onChange={set('cvc', (v) => digitsOnly(v).slice(0, 4))}
            aria-invalid={Boolean(errors.cvc)}
          />
          {errors.cvc && <Err>{errors.cvc}</Err>}
        </Field>
      </Two>
      <Field>
        <label htmlFor='card-name'>Name on card</label>
        <input id='card-name' autoComplete='cc-name' value={card.name} onChange={set('name')} aria-invalid={Boolean(errors.name)} />
        {errors.name && <Err>{errors.name}</Err>}
      </Field>
      <PayButton type='submit' disabled={busy}>
        <FaLock size={14} /> {busy ? 'Processing…' : `Pay ${formatPrice(total)}`}
      </PayButton>
      <Hint>Test cards: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined. Any future date and any CVC.</Hint>
    </Form>
  );
};

const WalletPanel = ({ method, total, onPay, busy }) => {
  const styles = {
    apple_pay: { bg: 'black', fg: 'white', icon: <FaApple size={20} />, text: 'Pay', note: 'Double-click to pay with Face ID (simulated)' },
    google_pay: { bg: 'black', fg: 'white', icon: <FaGoogle size={18} />, text: 'Pay', note: 'Choose a card saved to your Google account (simulated)' },
    paypal: { bg: '#ffc439', fg: '#003087', icon: <FaPaypal size={18} />, text: 'Pay Now', note: 'You are signed in to PayPal as a test buyer (simulated)' },
    klarna: { bg: '#ffb3c7', fg: 'black', icon: <SiKlarna size={46} />, text: '', note: null },
  }[method];

  return (
    <>
      {method === 'klarna' && (
        <Schedule>
          <p>Pay in 3 interest-free instalments</p>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <span>{i === 0 ? 'Today' : `In ${i * 30} days`}</span>
              <strong>{formatPrice(Math.round((total * 100) / 3 + (i === 0 ? (total * 100) % 3 : 0)) / 100)}</strong>
            </div>
          ))}
        </Schedule>
      )}
      {styles.note && <Hint>{styles.note}</Hint>}
      <WalletButton type='button' bg={styles.bg} fg={styles.fg} onClick={onPay} disabled={busy} aria-label={`Pay with ${PAYMENT_METHOD_LABELS[method]}`}>
        {busy ? (
          'Processing…'
        ) : (
          <>
            {styles.icon} {styles.text || 'Confirm purchase'}
          </>
        )}
      </WalletButton>
    </>
  );
};

const MockPayment = () => {
  const [params] = useSearchParams();
  const orderId = params.get('order');
  const navigate = useNavigate();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError('Missing order');
      return;
    }
    getOrderAPI(orderId)
      .then(setOrder)
      .catch((err) => setError(getErrorMessage(err)));
  }, [orderId]);

  const pay = async () => {
    setPaying(true);
    try {
      await completeMockPaymentAPI(orderId);
      navigate(`/orders/${orderId}?checkout=success`, { replace: true });
    } catch (err) {
      toast({ title: 'Payment failed', description: getErrorMessage(err), status: 'error', duration: 5000, isClosable: true });
      setPaying(false);
    }
  };

  const method = order?.payment?.method || 'card';

  return (
    <Container>
      <Card>
        <Logo />
        <Badge>TEST MODE — no real payment is taken</Badge>
        {error && <p role='alert'>{error}</p>}
        {!order && !error && <Spinner color='teal' />}
        {order && (
          <>
            <Summary>
              <span>Order {order.orderNumber}</span>
              <Amount>{formatPrice(order.summary.total)}</Amount>
              <span>{PAYMENT_METHOD_LABELS[method]}</span>
            </Summary>
            {order.status !== 'pending_payment' ? (
              <p>
                This order is not awaiting payment. <Link to={`/orders/${order.id}`}>View order</Link>
              </p>
            ) : (
              <>
                {method === 'card' ? (
                  <CardForm total={order.summary.total} onPay={pay} busy={paying} />
                ) : (
                  <WalletPanel method={method} total={order.summary.total} onPay={pay} busy={paying} />
                )}
                <Link to={`/orders/${order.id}?checkout=cancelled`}>Cancel and return to the store</Link>
              </>
            )}
          </>
        )}
      </Card>
    </Container>
  );
};

export default MockPayment;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5fafd;
  padding: 16px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 440px;
  background: white;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  > a {
    font-size: 13px;
    text-decoration: underline;
  }
`;

const Badge = styled.span`
  background: #fff3cd;
  color: #7a5b00;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
`;

const Summary = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #555;
  font-size: 14px;
`;

const Amount = styled.span`
  font-size: 40px;
  font-weight: 200;
  color: black;
`;

const Form = styled.form`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  label {
    font-size: 13px;
    font-weight: 600;
  }
  input {
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 16px;
    width: 100%;
  }
  input[aria-invalid='true'] {
    border-color: #c53030;
  }
`;

const Two = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const Err = styled.span`
  color: #c53030;
  font-size: 12px;
`;

const PayButton = styled.button`
  height: 52px;
  border: none;
  border-radius: 999px;
  background: teal;
  color: white;
  font-weight: 700;
  font-size: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  &:disabled {
    opacity: 0.7;
  }
`;

const WalletButton = styled.button`
  width: 100%;
  height: 52px;
  border: none;
  border-radius: 999px;
  background: ${(p) => p.bg};
  color: ${(p) => p.fg};
  font-weight: 700;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  &:disabled {
    opacity: 0.7;
  }
`;

const Hint = styled.p`
  font-size: 12px;
  color: #777;
`;

const Schedule = styled.div`
  width: 100%;
  text-align: left;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px 14px;
  p {
    font-weight: 600;
    margin-bottom: 6px;
  }
  div {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    padding: 4px 0;
  }
`;
