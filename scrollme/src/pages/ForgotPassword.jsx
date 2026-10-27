import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@chakra-ui/react';
import AuthCard, { Button, ErrorText, Field, Form, Hint, Intro, Status, TextButton, Title } from '../components/auth/AuthCard';
import PasswordChecklist from '../components/auth/PasswordChecklist';
import { forgotPasswordAPI, resetPasswordAPI } from '../services/auth/authService';
import { getErrorMessage } from '../api/client';
import { passwordHint } from '../utils/passwordPolicy';

const RESEND_WAIT = 60;

// /forgot-password: email a 6-digit code, then enter it with a new password.
const ForgotPassword = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async (e) => {
    e?.preventDefault();
    setError('');
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setErrors({ email: 'Enter the email address you signed up with, e.g. name@example.com.' });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await forgotPasswordAPI(address);
      setStep('code');
      setCode('');
      setStatus(`If ${address} has an account, we have sent it a 6-digit code. It works for 15 minutes.`);
      setResendIn(RESEND_WAIT);
    } catch (err) {
      setError(getErrorMessage(err, 'We could not send a code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setError('');
    const found = {};
    if (!/^\d{6}$/.test(code)) found.code = 'Enter the 6-digit code from the email.';
    const hint = passwordHint(password);
    if (hint) found.password = hint;
    else if (password !== confirm) found.confirm = 'The passwords do not match.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const res = await resetPasswordAPI({ email: email.trim(), code, password });
      toast({ title: 'Password changed', description: res.message, status: 'success', duration: 5000, isClosable: true });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'That code did not work. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'email') {
    return (
      <AuthCard>
        <Title>RESET PASSWORD</Title>
        <Intro>Enter the email address you signed up with and we will email you a 6-digit code.</Intro>
        <Form onSubmit={sendCode} noValidate>
          <Field>
            <label htmlFor='reset-email'>Email</label>
            <input
              id='reset-email'
              name='email'
              type='email'
              autoComplete='email'
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby='reset-email-hint'
              autoFocus
            />
            {errors.email && (
              <Hint id='reset-email-hint' $error>
                {errors.email}
              </Hint>
            )}
          </Field>
          {error && <ErrorText role='alert'>{error}</ErrorText>}
          <Button type='submit' disabled={busy}>
            {busy ? 'SENDING…' : 'SEND CODE'}
          </Button>
          <Hint style={{ marginTop: 16 }}>
            Remembered it? <Link to='/login'>Back to sign in</Link>
          </Hint>
        </Form>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <Title>RESET PASSWORD</Title>
      {status && <Status role='status'>{status}</Status>}
      <Form onSubmit={changePassword} noValidate>
        <Field>
          <label htmlFor='reset-code'>6-digit code</label>
          <input
            id='reset-code'
            className='code'
            name='code'
            inputMode='numeric'
            autoComplete='one-time-code'
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-invalid={Boolean(errors.code)}
            aria-describedby='reset-code-hint'
            autoFocus
          />
          <Hint id='reset-code-hint' $error={Boolean(errors.code)}>
            {errors.code || "Can't find it? Check your spam or junk folder."}
          </Hint>
        </Field>
        <Field>
          <label htmlFor='reset-password'>New password</label>
          <input
            id='reset-password'
            name='password'
            type={showPassword ? 'text' : 'password'}
            autoComplete='new-password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby='reset-password-rules reset-password-hint'
          />
          <PasswordChecklist id='reset-password-rules' password={password} />
          {errors.password && (
            <Hint id='reset-password-hint' $error>
              {errors.password}
            </Hint>
          )}
        </Field>
        <Field>
          <label htmlFor='reset-confirm'>Confirm new password</label>
          <input
            id='reset-confirm'
            name='confirm'
            type={showPassword ? 'text' : 'password'}
            autoComplete='new-password'
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={Boolean(errors.confirm)}
            aria-describedby='reset-confirm-hint'
          />
          <Hint id='reset-confirm-hint' $error={Boolean(errors.confirm)} $ok={Boolean(confirm) && confirm === password}>
            {errors.confirm ||
              (confirm ? (confirm === password ? 'Passwords match.' : 'Not matching yet.') : 'Type the same password again.')}
          </Hint>
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14 }}>
          <input type='checkbox' checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
          Show password
        </label>
        {error && <ErrorText role='alert'>{error}</ErrorText>}
        <Button type='submit' disabled={busy}>
          {busy ? 'SAVING…' : 'CHANGE PASSWORD'}
        </Button>
        <TextButton type='button' onClick={() => sendCode()} disabled={resendIn > 0 || busy}>
          {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
        </TextButton>
        <TextButton
          type='button'
          onClick={() => {
            setStep('email');
            setStatus('');
            setError('');
          }}
        >
          Use a different email address
        </TextButton>
      </Form>
    </AuthCard>
  );
};

export default ForgotPassword;
