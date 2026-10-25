import styled from 'styled-components';
import {
  FaApple,
  FaCcAmex,
  FaCcDinersClub,
  FaCcDiscover,
  FaCcJcb,
  FaCcMastercard,
  FaCcVisa,
  FaGoogle,
  FaPaypal,
  FaPlus,
} from 'react-icons/fa';
import { SiKlarna } from 'react-icons/si';

const Box = styled.span`
  width: 56px;
  height: 36px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 15px;
  border: 1px solid ${(p) => p.border || '#ddd'};
  background: ${(p) => p.bg || 'white'};
  color: ${(p) => p.fg || 'black'};
`;

// Logo tile shown next to each payment method.
export const MethodLogo = ({ method }) => {
  switch (method) {
    case 'apple_pay':
      return (
        <Box border='black' aria-hidden='true'>
          <FaApple size={16} />
          Pay
        </Box>
      );
    case 'google_pay':
      return (
        <Box aria-hidden='true'>
          <FaGoogle size={14} color='#4285F4' />
          Pay
        </Box>
      );
    case 'paypal':
      return (
        <Box bg='#ffc439' border='#ffc439' fg='#003087' aria-hidden='true'>
          <FaPaypal size={18} />
        </Box>
      );
    case 'klarna':
      return (
        <Box bg='#ffb3c7' border='#ffb3c7' aria-hidden='true'>
          <SiKlarna size={34} />
        </Box>
      );
    case 'card':
    default:
      return (
        <Box aria-hidden='true'>
          <FaPlus size={16} color='#555' />
        </Box>
      );
  }
};

const Brands = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  svg {
    display: block;
  }
`;

const UnionPay = styled.span`
  font-size: 9px;
  font-weight: 800;
  line-height: 1;
  padding: 5px 4px;
  border-radius: 3px;
  color: white;
  background: linear-gradient(90deg, #d7282f 33%, #0b4c8c 33% 66%, #0a8a7e 66%);
`;

// Card networks accepted through Stripe.
export const CardBrands = () => (
  <Brands aria-label='Visa, Mastercard, American Express, Diners Club, Discover, UnionPay and JCB accepted'>
    <FaCcVisa size={34} color='#1a1f71' />
    <FaCcMastercard size={34} color='#eb001b' />
    <FaCcAmex size={34} color='#2e77bc' />
    <FaCcDinersClub size={34} color='#0079be' />
    <FaCcDiscover size={34} color='#e55c20' />
    <UnionPay>UnionPay</UnionPay>
    <FaCcJcb size={34} color='#0e4c96' />
  </Brands>
);
