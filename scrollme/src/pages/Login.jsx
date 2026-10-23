import styled from 'styled-components';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import { userSignIn } from '../store/slices/userSlice';
import { startSession } from '../store/session';
import { mobile, tablet } from '../responsive';
import { useToast } from '@chakra-ui/react';
import Logo from '../components/Logo';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { verifyMfaAPI } from '../services/auth/authService';
import { getErrorMessage } from '../api/client';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  background:
    linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5)),
    url('https://images.pexels.com/photos/6984650/pexels-photo-6984650.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940') center;
  background-size: cover;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Wrapper = styled.div`
  width: 25%;
  ${mobile({ width: '84%;' })}
  ${tablet({ width: '84%;' })}
    padding: 20px;
  background-color: white;
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  line-height: 1;
  font-size: 40px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const Input = styled.input`
  flex: 1;
  min-width: 40%;
  margin: 10px 0;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
`;

const Button = styled.button`
  width: 100%;
  border: none;
  padding: 15px 20px;
  background-color: var(--accent);
  color: white;
  cursor: pointer;
  margin-bottom: 10px;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
  &:disabled {
    opacity: 0.7;
    cursor: wait;
    transform: none;
  }
`;

const Link = styled(RouterLink)`
  margin: 5px 0px;
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
  &:hover {
    color: blue;
  }
`;

const Hint = styled.p`
  font-size: 14px;
  margin: 12px 0 4px;
  line-height: 1.5;
`;

const TextButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  margin: 5px 0;
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
  color: inherit;
`;

const ErrorText = styled.p`
  color: #c53030;
  font-size: 14px;
  margin-bottom: 10px;
`;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const toast = useToast();
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // 'password', then 'code' for accounts with two-factor sign-in.
  const [step, setStep] = useState(location.state?.mfaPending ? 'code' : 'password');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  // Return to the page that required sign-in.
  const from = location.state?.from;
  const redirectTo = from ? `${from.pathname}${from.search || ''}` : '/';

  if (isAuthenticated && !submitting) return <Navigate to={redirectTo} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const loginData = {
      username: e.target.username.value.trim(),
      password: e.target.password.value,
    };
    try {
      const response = await dispatch(userSignIn(loginData)).unwrap();
      if (response.mfaRequired) {
        setStep('code');
        return;
      }
      await dispatch(startSession(response.user));
      toast({
        title: 'Login Successful',
        description: response?.message || 'You have successfully logged in. Welcome back!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      navigate(redirectTo, { replace: true });
    } catch (message) {
      setError(typeof message === 'string' ? message : 'Invalid credentials, please try again.');
      toast({
        title: 'Login Failed!',
        description: typeof message === 'string' ? message : 'Invalid credentials, please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCode = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await verifyMfaAPI(e.target.code.value);
      await dispatch(startSession(response.user));
      if (response.recoveryCodesLeft !== undefined) {
        toast({
          title: `Recovery code used (${response.recoveryCodesLeft} left)`,
          description: 'If you have lost your phone, set up a new authenticator in Admin → Security.',
          status: 'warning',
          duration: 10000,
          isClosable: true,
        });
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = getErrorMessage(err, 'That code is not right. Try again.');
      setError(message);
      // The password step has to be repeated once the 5-minute window has passed.
      if (/timed out/i.test(message)) setStep('password');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'code') {
    return (
      <Container>
        <Wrapper>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
            <Logo />
          </div>
          <br />
          <Title>TWO-STEP VERIFICATION</Title>
          <Form onSubmit={handleCode}>
            <Hint>
              {useRecoveryCode
                ? 'Enter one of the recovery codes you saved when you set up two-factor sign-in. Each code works once.'
                : 'Enter the 6-digit code from your authenticator app.'}
            </Hint>
            <Input
              key={useRecoveryCode ? 'recovery' : 'app'}
              name='code'
              placeholder={useRecoveryCode ? 'XXXXX-XXXXX' : '123456'}
              aria-label={useRecoveryCode ? 'Recovery code' : 'Authentication code'}
              inputMode={useRecoveryCode ? 'text' : 'numeric'}
              autoComplete='one-time-code'
              maxLength={useRecoveryCode ? 20 : 7}
              autoFocus
              required
            />
            {error && <ErrorText role='alert'>{error}</ErrorText>}
            <Button type='submit' disabled={submitting}>
              {submitting ? 'CHECKING…' : 'VERIFY'}
            </Button>
            <TextButton
              type='button'
              onClick={() => {
                setUseRecoveryCode((r) => !r);
                setError('');
              }}
            >
              {useRecoveryCode ? 'Use my authenticator app instead' : 'Use a recovery code instead'}
            </TextButton>
            <TextButton
              type='button'
              onClick={() => {
                setStep('password');
                setError('');
              }}
            >
              Back to sign in
            </TextButton>
          </Form>
        </Wrapper>
      </Container>
    );
  }

  return (
    <Container>
      <Wrapper>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
          <Logo />
        </div>
        <br />
        <Title>SIGN IN</Title>
        <Form onSubmit={(e) => handleSubmit(e)}>
          <Input
            placeholder='username or email'
            name='username'
            type='text'
            autoComplete='username'
            aria-label='Username or email'
            required
          />
          <Input placeholder='password' name='password' type='password' autoComplete='current-password' aria-label='Password' required />
          {error && <ErrorText role='alert'>{error}</ErrorText>}
          <Button type='submit' disabled={submitting}>
            {submitting ? 'SIGNING IN…' : 'LOGIN'}
          </Button>
          <Link to='/forgot-password'>DO NOT YOU REMEMBER THE PASSWORD?</Link>
          <Link to='/register' state={location.state}>
            CREATE A NEW ACCOUNT
          </Link>
        </Form>
        <GoogleSignInButton onSuccess={() => navigate(redirectTo, { replace: true })} onMfaRequired={() => setStep('code')} />
      </Wrapper>
    </Container>
  );
};

export default Login;
