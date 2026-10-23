import styled, { keyframes } from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import { FaCheck, FaChevronDown, FaLock } from 'react-icons/fa';
import { MethodLogo, CardBrands } from './PaymentLogos';
import { formatPrice } from '../../utils/format';

// Copy for each method. Wallets are only offered where the device supports them.
const METHOD_INFO = {
  apple_pay: { label: 'Apple Pay', caption: 'Pay with Face ID or Touch ID' },
  card: { label: 'Add a new card', caption: null, brands: true },
  paypal: { label: 'PayPal', caption: 'Pay with your PayPal account' },
  klarna: { label: 'Klarna', caption: 'Pay in 3 interest-free instalments' },
  google_pay: { label: 'Google Pay', caption: 'Pay with a card saved to Google' },
};

const VISIBLE_BEFORE_MORE = 4;

export const isMethodSupported = (method) => {
  if (method === 'apple_pay') {
    try {
      return Boolean(window.ApplePaySession && window.ApplePaySession.canMakePayments());
    } catch {
      return false;
    }
  }
  return true;
};

// Bottom sheet on phones, centred dialog on larger screens.
const PaymentMethodSheet = ({ isOpen, methods, selected, onSelect, onClose, onConfirm, total, busy = false, confirmLabel = 'Confirm', testMode = false }) => {
  const [showAll, setShowAll] = useState(false);
  const firstInput = useRef(null);
  const ordered = methods.filter((m) => METHOD_INFO[m]);
  const visible = showAll ? ordered : ordered.slice(0, VISIBLE_BEFORE_MORE);
  // Keep the chosen method visible even if it sits under "View more".
  if (!visible.includes(selected) && ordered.includes(selected)) visible.push(selected);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    firstInput.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  return (
    <Overlay onClick={() => !busy && onClose()}>
      <Sheet role='dialog' aria-modal='true' aria-labelledby='secure-payment-title' onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title id='secure-payment-title'>Secure Payment</Title>
          <Secure>
            <FaLock size={13} /> Your payment is 100% secure
          </Secure>
          <Close type='button' aria-label='Close' onClick={onClose} disabled={busy}>
            ✕
          </Close>
        </Header>
        {testMode && <TestBadge>Test mode — no real money is taken</TestBadge>}

        <Methods as='fieldset' disabled={busy}>
          <legend className='sr-only'>Payment method</legend>
          {visible.map((method, index) => {
            const info = METHOD_INFO[method];
            const supported = isMethodSupported(method);
            return (
              <Row key={method} disabled={!supported} data-testid={`pay-option-${method}`}>
                <input
                  ref={index === 0 ? firstInput : undefined}
                  type='radio'
                  name='payment-method'
                  value={method}
                  checked={selected === method}
                  disabled={!supported}
                  onChange={() => onSelect(method)}
                />
                <Radio checked={selected === method} aria-hidden='true'>
                  {selected === method && <FaCheck size={13} />}
                </Radio>
                <Body>
                  <Line>
                    <MethodLogo method={method} />
                    <Label>{info.label}</Label>
                  </Line>
                  {info.brands && <CardBrands />}
                  {(info.caption || !supported) && <Caption>{supported ? info.caption : 'Not available on this device'}</Caption>}
                </Body>
              </Row>
            );
          })}
        </Methods>

        {!showAll && ordered.length > VISIBLE_BEFORE_MORE && (
          <More type='button' onClick={() => setShowAll(true)}>
            View more <FaChevronDown size={12} />
          </More>
        )}

        <Footer>
          {total !== undefined && (
            <Total>
              Total <strong>{formatPrice(total)}</strong>
            </Total>
          )}
          <ConfirmButton type='button' onClick={onConfirm} disabled={busy || !selected || !isMethodSupported(selected)}>
            {busy ? 'Please wait…' : confirmLabel}
          </ConfirmButton>
        </Footer>
      </Sheet>
    </Overlay>
  );
};

export default PaymentMethodSheet;

const fade = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const slideUp = keyframes`from { transform: translateY(100%); } to { transform: translateY(0); }`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1400;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: ${fade} 0.2s ease;
  @media (min-width: 768px) {
    align-items: center;
  }
`;

const Sheet = styled.div`
  width: 100%;
  max-height: 92vh;
  overflow-y: auto;
  background: white;
  border-radius: 24px 24px 0 0;
  padding: 24px 20px calc(20px + env(safe-area-inset-bottom));
  animation: ${slideUp} 0.25s ease;
  @media (min-width: 768px) {
    max-width: 520px;
    border-radius: 16px;
    animation: none;
  }
`;

const Header = styled.div`
  position: relative;
  text-align: center;
  padding: 0 40px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
`;

const Secure = styled.p`
  margin-top: 4px;
  color: #1a7f37;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const Close = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  width: 40px;
  height: 40px;
  font-size: 22px;
  background: none;
  border: none;
  cursor: pointer;
  color: #333;
`;

const TestBadge = styled.p`
  margin: 12px auto 0;
  width: fit-content;
  background: #fff3cd;
  color: #7a5b00;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
`;

const Methods = styled.div`
  border: none;
  margin: 16px 0 0;
  padding: 0;
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
`;

const Row = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 4px;
  border-bottom: 1px solid #eee;
  cursor: ${(p) => (p.disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.disabled ? 0.5 : 1)};
  input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
  input:focus-visible + span {
    outline: 2px solid teal;
    outline-offset: 2px;
  }
`;

const Radio = styled.span`
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: ${(p) => (p.checked ? 'none' : '2px solid #bbb')};
  background: ${(p) => (p.checked ? 'teal' : 'white')};
`;

const Body = styled.span`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;

const Line = styled.span`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const Label = styled.span`
  font-size: 18px;
`;

const Caption = styled.span`
  font-size: 13px;
  color: #666;
`;

const More = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 14px auto 0;
  background: none;
  border: none;
  color: #1a73e8;
  font-size: 16px;
  cursor: pointer;
`;

const Footer = styled.div`
  margin-top: 24px;
`;

const Total = styled.p`
  display: flex;
  justify-content: space-between;
  font-size: 16px;
  margin-bottom: 12px;
  strong {
    font-size: 20px;
  }
`;

const ConfirmButton = styled.button`
  width: 100%;
  height: 56px;
  border: none;
  border-radius: 999px;
  background: teal;
  color: white;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
