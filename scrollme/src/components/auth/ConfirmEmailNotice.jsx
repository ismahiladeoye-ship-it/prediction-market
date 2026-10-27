import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';

const Notice = styled.div`
  margin: 16px 0;
  padding: 14px 16px;
  border: 1px solid #d69e2e;
  background: #fffaf0;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
  a {
    font-weight: 700;
    text-decoration: underline;
  }
`;

// Shown to a new account that has not entered the code emailed at sign-up.
const ConfirmEmailNotice = () => {
  const { isAuthenticated, emailVerified, email } = useSelector((state) => state.user);
  const location = useLocation();
  if (!isAuthenticated || emailVerified !== false) return null;
  return (
    <Notice role='status'>
      Please confirm your email address before placing an order. We sent a 6-digit code to <strong>{email}</strong>.{' '}
      <Link to='/verify-email' state={{ from: location }}>
        Enter the code
      </Link>
    </Notice>
  );
};

export default ConfirmEmailNotice;
