import styled from 'styled-components';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useToast } from '@chakra-ui/react';
import { FaGoogle } from 'react-icons/fa';
import { getGoogleIdToken, isGoogleSignInEnabled } from '../context/Firebase';
import { googleSignInAPI } from '../services/auth/authService';
import { startSession } from '../store/session';
import { getErrorMessage } from '../api/client';

const GoogleButton = styled.button`
  width: 100%;
  border: none;
  background-color: #4285f4; /* Google blue color */
  color: white;
  cursor: pointer;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

// Renders nothing when Google sign-in is not configured.
// onMfaRequired: the account has two-factor, so the code step comes next.
const GoogleSignInButton = ({ onSuccess, onMfaRequired }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!isGoogleSignInEnabled) return null;

  const handleClick = async () => {
    setBusy(true);
    try {
      const idToken = await getGoogleIdToken();
      const { user, mfaRequired } = await googleSignInAPI(idToken);
      if (mfaRequired) {
        onMfaRequired?.();
        return;
      }
      await dispatch(startSession(user));
      toast({
        title: 'Google Login Successful',
        description: `Welcome ${user.firstName}!`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Google Login Failed!',
        description: getErrorMessage(error, 'Please try again later.'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <GoogleButton type='button' onClick={handleClick} disabled={busy}>
      <FaGoogle style={{ marginRight: '8px' }} /> Sign in with Google
    </GoogleButton>
  );
};

export default GoogleSignInButton;
