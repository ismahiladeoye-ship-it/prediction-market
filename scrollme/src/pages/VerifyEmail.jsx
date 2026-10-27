import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@chakra-ui/react';
import AuthCard, { Button, ErrorText, Field, Form, Hint, Intro, Status, TextButton, Title } from '../components/auth/AuthCard';
import { resendVerificationAPI, verifyEmailAPI } from '../services/auth/authService';
import { setUser } from '../store/slices/userSlice';
import { getErrorMessage } from '../api/client';

const RESEND_WAIT = 60;

// /verify-email: a new account enters the 6-digit code emailed at sign-up.
const VerifyEmail = () => {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const from = location.state?.from;
  const redirectTo = from?.pathname && from.pathname !== '/verify-email' ? `${from.pathname}${from.search || ''}` : '/';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  // The sign-up email has only just been sent, so a new one is offered after a minute.
  const [resendIn, setResendIn] = useState(RESEND_WAIT);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (user.emailVerified !== false) navigate(redirectTo, { replace: true });
  }, [user.emailVerified, navigate, redirectTo]);

  const submit = async (e) => {
    e.preventDefault();
    setStatus('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await verifyEmailAPI(code);
      dispatch(setUser(res.user));
      toast({ title: 'Email confirmed', description: 'Thanks, you are all set.', status: 'success', duration: 4000, isClosable: true });
    } catch (err) {
      setError(getErrorMessage(err, 'That code did not work. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      const res = await resendVerificationAPI();
      setStatus(res.message);
      setCode('');
      setResendIn(RESEND_WAIT);
    } catch (err) {
      setError(getErrorMessage(err, 'We could not send a new code. Please try again later.'));
    }
  };

  return (
    <AuthCard>
      <Title>CONFIRM YOUR EMAIL</Title>
      <Intro>
        We have sent a 6-digit code to <strong>{user.email}</strong>. Enter it below to confirm your email address. The code works for 15
        minutes.
      </Intro>
      <Form onSubmit={submit} noValidate>
        <Field>
          <label htmlFor='verify-code'>6-digit code</label>
          <input
            id='verify-code'
            className='code'
            name='code'
            inputMode='numeric'
            autoComplete='one-time-code'
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-invalid={Boolean(error)}
            aria-describedby='verify-code-hint'
            autoFocus
          />
          <Hint id='verify-code-hint'>Can&apos;t find it? Check your spam or junk folder.</Hint>
        </Field>
        {error && <ErrorText role='alert'>{error}</ErrorText>}
        {status && <Status role='status'>{status}</Status>}
        <Button type='submit' disabled={busy}>
          {busy ? 'CHECKING…' : 'CONFIRM EMAIL'}
        </Button>
        <TextButton type='button' onClick={resend} disabled={resendIn > 0}>
          {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
        </TextButton>
        <Hint style={{ marginTop: 18 }}>
          You can keep browsing and confirm later: <Link to={redirectTo}>skip for now</Link>. You will need to confirm before placing an
          order.
        </Hint>
      </Form>
    </AuthCard>
  );
};

export default VerifyEmail;
