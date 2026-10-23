import styled from 'styled-components';
import { formatPrice } from '../utils/format';

// Same look as the original cart "ORDER SUMMARY" box.
const Summary = styled.div`
  border: 0.5px solid lightgray;
  border-radius: 10px;
  padding: 20px;
  height: fit-content;
`;

const SummaryTitle = styled.h2`
  font-family: var(--font-display);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  line-height: 1;
  font-size: 36px;
`;

const SummaryItem = styled.div`
  margin: ${(props) => (props.compact ? '14px 0' : '30px 0')};
  display: flex;
  justify-content: space-between;
  font-weight: ${(props) => props.type === 'total' && '500'};
  font-size: ${(props) => props.type === 'total' && '24px'};
`;

const OrderSummary = ({ summary, title = 'ORDER SUMMARY', compact = false, children }) => (
  <Summary>
    <SummaryTitle>{title}</SummaryTitle>
    <SummaryItem compact={compact}>
      <span>Subtotal</span>
      <span>{formatPrice(summary?.subtotal)}</span>
    </SummaryItem>
    <SummaryItem compact={compact}>
      <span>Tax</span>
      <span>{formatPrice(summary?.tax)}</span>
    </SummaryItem>
    <SummaryItem compact={compact}>
      <span>Delivery Charges</span>
      <span>{formatPrice(summary?.shipping)}</span>
    </SummaryItem>
    <SummaryItem compact={compact} type='total'>
      <span>Total</span>
      <span data-testid='order-total'>{formatPrice(summary?.total)}</span>
    </SummaryItem>
    {children}
  </Summary>
);

export default OrderSummary;
