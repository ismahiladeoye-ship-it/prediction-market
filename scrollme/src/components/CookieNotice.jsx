import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

// Remembers on this device that the notice was dismissed.
export const COOKIE_NOTICE_KEY = 'gis-cookie-notice';

const Card = styled.section`
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 1200;
  padding: 18px;
  border-radius: 18px;
  background: var(--paper);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.45;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  h2 {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 24px;
    line-height: 1;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    margin: 0 0 6px;
  }
  @media (min-width: 900px) {
    left: 24px;
    right: auto;
    bottom: 24px;
    width: 380px;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  button {
    height: 44px;
    padding: 0 24px;
    border: none;
    border-radius: 999px;
    background: var(--ink);
    color: var(--paper);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    cursor: pointer;
  }
  a {
    padding: 0 8px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: underline;
  }
`;

const seen = () => {
  try {
    return localStorage.getItem(COOKIE_NOTICE_KEY) === 'ok';
  } catch {
    return false;
  }
};

// First-visit notice that the shop only uses the cookies it needs (Privacy page,
// "Cookies and storage on your device"). These need no consent under UK rules,
// so it tells people rather than asking. If tracking or advertising cookies are
// ever added, this must become an Accept / Reject choice that runs before them.
const CookieNotice = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(!seen()), []);

  if (!open || pathname.startsWith('/admin')) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(COOKIE_NOTICE_KEY, 'ok');
    } catch {
      // Private browsing can block storage: hide it for this visit anyway.
    }
    setOpen(false);
  };

  return (
    <Card className='light-scope' aria-labelledby='cookie-notice-title'>
      <h2 id='cookie-notice-title'>Cookies</h2>
      <p>We only use the cookies our website needs to work, like keeping you signed in and your bag saved. No tracking or adverts.</p>
      <Actions>
        <button type='button' onClick={dismiss}>
          OK
        </button>
        <Link to='/privacy#cookies'>Cookie details</Link>
      </Actions>
    </Card>
  );
};

export default CookieNotice;
