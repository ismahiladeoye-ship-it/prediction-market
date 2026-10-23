import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Spinner, useToast } from '@chakra-ui/react';
import Navbar from '../components/Navbar';
import Announcement from '../components/Announcement';
import Footer from '../components/Footer';
import OrderSummary from '../components/OrderSummary';
import { viewCart } from '../store/slices/cartSlice';
import { placeOrderAPI } from '../services/orders/orderService';
import { getErrorMessage } from '../api/client';
import { formatPrice } from '../utils/format';
import { imageSrc, onImageError } from '../utils/imageFallback';
import { COUNTRIES } from '../utils/countries';
import PaymentMethodSheet, { isMethodSupported } from '../components/payment/PaymentMethodSheet';
import { MethodLogo } from '../components/payment/PaymentLogos';
import { getPaymentMethodsAPI } from '../services/payments/paymentService';
import { FaChevronRight, FaLock } from 'react-icons/fa';
import { PAYMENT_METHOD_LABELS } from '../utils/format';

const EMPTY_ADDRESS = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'US' };

// Mirrors the API's checks so mistakes are shown before submitting.
const validate = (a) => {
  const errors = {};
  if (a.fullName.trim().length < 2) errors.fullName = 'Full name is required';
  if (!/^\+?[0-9 ()-]{7,20}$/.test(a.phone.trim())) errors.phone = 'Enter a valid phone number';
  if (a.line1.trim().length < 3) errors.line1 = 'Address line 1 is required';
  if (a.city.trim().length < 2) errors.city = 'City is required';
  if (!/^[A-Za-z0-9 -]{3,12}$/.test(a.postalCode.trim())) errors.postalCode = 'Enter a valid postal code';
  if (!/^[A-Z]{2}$/.test(a.country)) errors.country = 'Choose a country';
  return errors;
};

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const user = useSelector((state) => state.user);
  const cart = useSelector((state) => state.cart);
  const [address, setAddress] = useState({ ...EMPTY_ADDRESS, fullName: user.name || '' });
  const [deliveryMethod, setDeliveryMethod] = useState('standard');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [payment, setPayment] = useState({ methods: ['card'], testMode: false });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [sheet, setSheet] = useState(null); // null | 'choose' | 'pay'

  useEffect(() => {
    getPaymentMethodsAPI()
      .then((data) => {
        setPayment(data);
        // Preselect the first method this device supports (Apple Pay on Apple devices, otherwise card).
        setPaymentMethod(data.methods.find(isMethodSupported) || 'card');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    dispatch(viewCart(deliveryMethod)).finally(() => setLoaded(true));
  }, [dispatch, deliveryMethod]);

  const setField = (field) => (e) => {
    setAddress((a) => ({ ...a, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  // Step 1: check the address, then ask how the shopper wants to pay.
  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate(address);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`checkout-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setSheet('pay');
  };

  // Step 2: create the order and go to the payment page for the chosen method.
  const placeOrder = async () => {
    setSubmitting(true);
    try {
      const { checkoutUrl, order } = await placeOrderAPI({ shippingAddress: address, deliveryMethod, paymentMethod });
      if (checkoutUrl) {
        // Hosted payment page (Stripe Checkout in test mode, or the local mock).
        window.location.assign(checkoutUrl);
      } else {
        navigate(`/orders/${order.id}`);
      }
    } catch (error) {
      const details = error.response?.data?.details;
      if (Array.isArray(details)) {
        const fieldErrors = {};
        details.forEach((d) => {
          const key = d.field?.replace('shippingAddress.', '');
          if (key) fieldErrors[key] = d.message;
        });
        setErrors(fieldErrors);
      }
      setSheet(null);
      toast({
        title: 'Could not place your order',
        description: getErrorMessage(error),
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
      dispatch(viewCart(deliveryMethod));
      setSubmitting(false);
    }
  };

  if (loaded && cart.items.length === 0) {
    return (
      <Container>
        <Navbar />
        <Announcement />
        <Wrapper>
          <Title>CHECKOUT</Title>
          <EmptyState>
            Your bag is empty. <Link to='/products'>Continue shopping</Link>
          </EmptyState>
        </Wrapper>
        <Footer />
      </Container>
    );
  }

  const field = (name, label, { wide, ...props } = {}) => (
    <Field wide={wide}>
      <Label htmlFor={`checkout-${name}`}>{label}</Label>
      <Input
        id={`checkout-${name}`}
        name={name}
        value={address[name]}
        onChange={setField(name)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `checkout-${name}-error` : undefined}
        {...props}
      />
      {errors[name] && <FieldError id={`checkout-${name}-error`}>{errors[name]}</FieldError>}
    </Field>
  );

  return (
    <Container>
      <Navbar />
      <Announcement />
      <Wrapper>
        <Title>CHECKOUT</Title>
        <Bottom as='form' onSubmit={handleSubmit} noValidate>
          <Info>
            <SectionTitle>Delivery address</SectionTitle>
            <Grid>
              {field('fullName', 'Full name', { autoComplete: 'name', maxLength: 100 })}
              {field('phone', 'Phone', { autoComplete: 'tel', type: 'tel', maxLength: 20 })}
              {field('line1', 'Address line 1', { autoComplete: 'address-line1', maxLength: 200, wide: true })}
              {field('line2', 'Address line 2 (optional)', { autoComplete: 'address-line2', maxLength: 200, wide: true })}
              {field('city', 'City', { autoComplete: 'address-level2', maxLength: 100 })}
              {field('state', 'State / Region (optional)', { autoComplete: 'address-level1', maxLength: 100 })}
              {field('postalCode', 'Postal code', { autoComplete: 'postal-code', maxLength: 12 })}
              <Field>
                <Label htmlFor='checkout-country'>Country</Label>
                <Select id='checkout-country' value={address.country} onChange={setField('country')} autoComplete='country'>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                {errors.country && <FieldError>{errors.country}</FieldError>}
              </Field>
            </Grid>

            <SectionTitle>Delivery method</SectionTitle>
            <Options role='radiogroup' aria-label='Delivery method'>
              {(cart.deliveryOptions.length ? cart.deliveryOptions : [{ method: 'standard', label: 'Standard', price: 0 }]).map((opt) => (
                <Option key={opt.method} selected={deliveryMethod === opt.method}>
                  <input
                    type='radio'
                    name='deliveryMethod'
                    value={opt.method}
                    checked={deliveryMethod === opt.method}
                    onChange={() => setDeliveryMethod(opt.method)}
                  />
                  <span>{opt.label}</span>
                  <strong>{opt.price === 0 ? 'Free' : formatPrice(opt.price)}</strong>
                </Option>
              ))}
            </Options>

            <SectionTitle>Payment method</SectionTitle>
            <PaymentCard type='button' onClick={() => setSheet('choose')} aria-label='Change payment method'>
              <MethodLogo method={paymentMethod} />
              <span>{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
              <ViewAll>
                Change <FaChevronRight size={12} />
              </ViewAll>
            </PaymentCard>
            <SecureNote>
              <FaLock size={11} /> Card details are entered on our payment provider&apos;s secure page and never stored by Get It Sourced.
            </SecureNote>

            <SectionTitle>Items ({cart.totalQuantity})</SectionTitle>
            {cart.issues.map((issue) => (
              <IssueBox key={`${issue.productId}-${issue.size}`} role='alert'>
                {issue.message} — <Link to='/cart'>update your bag</Link>
              </IssueBox>
            ))}
            {cart.items.map((item) => (
              <Item key={`${item.productId}-${item.size}`}>
                <img src={imageSrc(item.image)} alt={item.name} onError={onImageError} />
                <div>
                  <ItemBrand>{item.brand}</ItemBrand>
                  <p>{item.name}</p>
                  <ItemMeta>
                    {item.size ? `Size ${item.size} · ` : ''}Qty {item.quantity}
                  </ItemMeta>
                </div>
                <ItemPrice>{formatPrice(item.lineTotal)}</ItemPrice>
              </Item>
            ))}
          </Info>
          <Side>
            {!loaded ? (
              <Spinner color='teal' />
            ) : (
              <OrderSummary summary={cart.summary} compact>
                <Button type='submit' disabled={submitting || cart.issues.length > 0 || cart.items.length === 0}>
                  {submitting ? 'PLACING ORDER…' : 'PLACE ORDER'}
                </Button>
                <Note>You will choose how to pay next. Stock is held for 30 minutes while you pay.</Note>
              </OrderSummary>
            )}
          </Side>
        </Bottom>
      </Wrapper>
      <Footer />
      <PaymentMethodSheet
        isOpen={Boolean(sheet)}
        methods={payment.methods}
        selected={paymentMethod}
        onSelect={setPaymentMethod}
        onClose={() => !submitting && setSheet(null)}
        onConfirm={sheet === 'pay' ? placeOrder : () => setSheet(null)}
        total={sheet === 'pay' ? cart.summary.total : undefined}
        busy={submitting}
        confirmLabel={sheet === 'pay' ? 'Confirm' : 'Use this method'}
        testMode={payment.testMode}
      />
    </Container>
  );
};

export default Checkout;

const Container = styled.div``;

const Wrapper = styled.div`
  padding: 20px;
  margin-top: 40px;
`;

const Title = styled.h1`
  font-weight: 300;
  text-align: center;
  font-size: 2em;
  margin-bottom: 20px;
`;

const Bottom = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin-inline: auto;

  @media (min-width: 768px) {
    flex-direction: row;
    width: 90%;
  }
  @media (min-width: 1024px) {
    width: 74%;
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
  margin: 20px 0 12px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px 16px;
  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  grid-column: ${(props) => (props.wide ? '1 / -1' : 'auto')};
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid ${(props) => (props['aria-invalid'] ? '#c53030' : '#ccc')};
  border-radius: 4px;
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
`;

const FieldError = styled.span`
  color: #c53030;
  font-size: 12px;
`;

const Options = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Option = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid ${(props) => (props.selected ? 'teal' : '#ddd')};
  border-radius: 6px;
  cursor: pointer;
  span {
    flex: 1;
  }
  input {
    accent-color: teal;
  }
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  img {
    width: 64px;
    height: 80px;
    object-fit: cover;
  }
  div {
    flex: 1;
    min-width: 0;
    font-size: 14px;
  }
`;

const ItemBrand = styled.p`
  font-weight: 600;
`;

const ItemMeta = styled.p`
  color: #777;
  font-size: 13px;
`;

const ItemPrice = styled.span`
  font-size: 18px;
  font-weight: 300;
  white-space: nowrap;
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
    cursor: not-allowed;
  }
`;

const PaymentCard = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  text-align: left;
  cursor: pointer;
  font-size: 16px;
  span:nth-child(2) {
    flex: 1;
  }
  &:hover {
    border-color: teal;
  }
`;

const ViewAll = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #1a73e8;
  font-size: 14px;
`;

const SecureNote = styled.p`
  margin-top: 8px;
  font-size: 12px;
  color: #1a7f37;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Note = styled.p`
  margin-top: 10px;
  font-size: 12px;
  color: #777;
`;

const IssueBox = styled.div`
  padding: 10px 14px;
  border-left: 3px solid red;
  background-color: #fff5f5;
  font-size: 14px;
  margin-bottom: 8px;
  a {
    text-decoration: underline;
  }
`;

const EmptyState = styled.p`
  padding: 60px 0;
  text-align: center;
  font-size: 18px;
  font-weight: 300;
  a {
    color: teal;
    text-decoration: underline;
  }
`;
