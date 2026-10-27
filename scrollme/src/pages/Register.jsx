import styled from 'styled-components';
import { UserRegistrationAPI } from '../services/userAPI/registerationAPI';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Triangle } from 'react-loader-spinner';
import { useToast } from '@chakra-ui/react';
import { HiCheckCircle, HiOutlineCheckCircle } from 'react-icons/hi2';
import Logo from '../components/Logo';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { startSession } from '../store/session';
import { getErrorMessage } from '../api/client';
import { PASSWORD_RULES, passwordHint } from '../utils/passwordPolicy';

const LoaderOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

const Container = styled.div`
  width: 100vw;
  min-height: 100vh;
  padding: 24px 16px;
  box-sizing: border-box;
  background:
    linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5)),
    url('https://images.pexels.com/photos/6984661/pexels-photo-6984661.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940') center;
  background-size: cover;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// One narrow (portrait) column at every screen size.
const Wrapper = styled.div`
  width: 100%;
  max-width: 440px;
  padding: 28px 24px;
  box-sizing: border-box;
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

const Intro = styled.p`
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.5;
  color: #444;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

// A label above the box and the guidance (or the problem) under it.
const Field = styled.div`
  margin-top: 18px;
  label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 600;
  }
  input {
    width: 100%;
    padding: 12px;
    /* 16px stops iPhones zooming in when the box is tapped. */
    font-size: 16px;
    border: 1px solid #bbb;
    border-radius: 4px;
    box-sizing: border-box;
  }
  input[aria-invalid='true'] {
    border: 2px solid #c53030;
  }
`;

const Hint = styled.p`
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.45;
  color: ${({ $error, $ok }) => ($error ? '#c53030' : $ok ? '#276749' : '#555')};
  font-weight: ${({ $error }) => ($error ? 600 : 400)};
`;

const Rules = styled.ul`
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  font-size: 13px;
  li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    color: #666;
  }
  li[data-met='true'] {
    color: #276749;
  }
`;

// Read out by screen readers only.
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

const ShowPassword = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 14px;
  cursor: pointer;
`;

const Agreement = styled.p`
  font-size: 12px;
  line-height: 1.5;
  margin: 20px 0 8px;
  a {
    text-decoration: underline;
  }
`;

const Text = styled.p`
  font-size: 13px;
  margin-bottom: 14px;
  a {
    text-decoration: underline;
    font-weight: 600;
  }
`;

const Button = styled.button`
  width: 100%;
  border: none;
  padding: 15px 20px;
  background-color: var(--accent);
  color: white;
  font-size: 15px;
  letter-spacing: 0.06em;
  cursor: pointer;
`;

const ErrorText = styled.p`
  color: #c53030;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
`;

const NAME_PATTERN = /^[\p{L}][\p{L}' -]*$/u;

// Same rules as the API, checked here so each box can say what is wrong.
const validate = ({ firstName, lastName, username, email, password, confirmPassword }) => {
  const errors = {};
  if (firstName.length < 2 || !NAME_PATTERN.test(firstName)) errors.firstName = 'Enter your first name (at least 2 letters).';
  if (lastName.length < 2 || !NAME_PATTERN.test(lastName)) errors.lastName = 'Enter your last name (at least 2 letters).';
  if (username.includes('@')) errors.username = 'Use a username here, not your email address, e.g. jay_23.';
  else if (username.length < 3) errors.username = 'Use at least 3 characters.';
  else if (!/^[a-zA-Z0-9._-]+$/.test(username)) errors.username = 'Use only letters, numbers, dots, underscores or hyphens (no spaces).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter your email address, e.g. name@example.com.';
  const hint = passwordHint(password);
  if (hint) errors.password = hint;
  else if (password !== confirmPassword) errors.confirmPassword = 'The passwords do not match.';
  return errors;
};

const FIELD_ORDER = ['firstName', 'lastName', 'username', 'email', 'password', 'confirmPassword'];

const Register = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Problems are shown under each box (and summed up above the button) rather
  // than in a toast, which closes after a few seconds and covers the button on a phone.
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const dispatch = useDispatch();
  const from = location.state?.from;
  const redirectTo = from ? `${from.pathname}${from.search || ''}` : '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const form = e.target;
    // Phones type curly apostrophes (O’Neil); the API accepts the straight one.
    const name = (value) => value.trim().replace(/[‘’]/g, "'");
    const formData = {
      firstName: name(form.firstName.value),
      lastName: name(form.lastName.value),
      username: form.username.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value,
      confirmPassword: form.confirmPassword.value,
    };

    const found = validate(formData);
    setErrors(found);
    const first = FIELD_ORDER.find((f) => found[f]);
    if (first) {
      form.elements[first].focus();
      return;
    }

    setIsLoading(true);
    try {
      const res = await UserRegistrationAPI(formData);
      await dispatch(startSession(res.user));
      toast({
        title: 'Registration Successful!',
        description: res.message || 'You have successfully registered. Welcome!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, 'An error occurred during registration.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Typing in a box clears the problem shown under it.
  const clearError = (e) => {
    const key = e.target.name;
    if (!errors[key]) return;
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const errorCount = Object.keys(errors).length;

  const field = (key, label, hint, props) => (
    <Field>
      <label htmlFor={`register-${key}`}>{label}</label>
      <input
        id={`register-${key}`}
        name={key}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={`register-${key}-hint`}
        required
        {...props}
      />
      <Hint id={`register-${key}-hint`} $error={Boolean(errors[key])}>
        {errors[key] || hint}
      </Hint>
    </Field>
  );

  return (
    <>
      {isLoading && (
        <LoaderOverlay>
          <Triangle color='#111111' height={80} width={80} ariaLabel='triangle-loading' />
        </LoaderOverlay>
      )}
      <Container>
        <Wrapper>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
            <Logo />
          </div>
          <br />
          <Title>CREATE AN ACCOUNT</Title>
          <Intro>Fill in every box. You can sign in later with your username or your email address.</Intro>
          <Form onSubmit={handleSubmit} onInput={clearError} noValidate>
            {field('firstName', 'First name', 'At least 2 letters.', { type: 'text', autoComplete: 'given-name', maxLength: 50 })}
            {field('lastName', 'Last name', 'At least 2 letters.', { type: 'text', autoComplete: 'family-name', maxLength: 50 })}
            {field(
              'username',
              'Username',
              '3 to 30 characters: letters, numbers, dots, underscores or hyphens. No spaces or @. For example: jay_23',
              { type: 'text', autoComplete: 'username', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false, maxLength: 30 }
            )}
            {field('email', 'Email', 'For your order confirmations and password resets.', {
              type: 'email',
              autoComplete: 'email',
              autoCapitalize: 'none',
              autoCorrect: 'off',
              spellCheck: false,
            })}

            <Field>
              <label htmlFor='register-password'>Password</label>
              <input
                id='register-password'
                name='password'
                type={showPassword ? 'text' : 'password'}
                autoComplete='new-password'
                aria-invalid={Boolean(errors.password)}
                aria-describedby='register-password-rules register-password-hint'
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Rules id='register-password-rules' aria-label='Your password needs'>
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(password);
                  return (
                    <li key={rule.label} data-met={met}>
                      {met ? <HiCheckCircle size={16} aria-hidden='true' /> : <HiOutlineCheckCircle size={16} aria-hidden='true' />}
                      {rule.label}
                      {met && <VisuallyHidden> (done)</VisuallyHidden>}
                    </li>
                  );
                })}
              </Rules>
              {errors.password && (
                <Hint id='register-password-hint' $error>
                  {errors.password}
                </Hint>
              )}
            </Field>

            <Field>
              <label htmlFor='register-confirmPassword'>Confirm password</label>
              <input
                id='register-confirmPassword'
                name='confirmPassword'
                type={showPassword ? 'text' : 'password'}
                autoComplete='new-password'
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby='register-confirmPassword-hint'
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <Hint
                id='register-confirmPassword-hint'
                $error={Boolean(errors.confirmPassword)}
                $ok={Boolean(confirm) && confirm === password}
              >
                {errors.confirmPassword ||
                  (confirm ? (confirm === password ? 'Passwords match.' : 'Not matching yet.') : 'Type the same password again.')}
              </Hint>
            </Field>
            <ShowPassword>
              <input type='checkbox' checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
              Show password
            </ShowPassword>

            <Agreement>
              By creating an account you agree to our <RouterLink to='/terms'>Terms &amp; conditions</RouterLink>. Our{' '}
              <RouterLink to='/privacy'>Privacy policy</RouterLink> explains how we use your information.
            </Agreement>
            {(errorCount > 0 || formError) && (
              <ErrorText role='alert'>
                {errorCount > 0 ? `Please fix the ${errorCount === 1 ? 'box' : `${errorCount} boxes`} marked in red above.` : formError}
              </ErrorText>
            )}
            <Button type='submit' disabled={isLoading}>
              CREATE ACCOUNT
            </Button>
            <Text style={{ marginTop: 14 }}>
              Already have an account?{' '}
              <RouterLink to='/login' state={location.state}>
                Sign in
              </RouterLink>
            </Text>
          </Form>
          <GoogleSignInButton
            onSuccess={() => navigate(redirectTo, { replace: true })}
            onMfaRequired={() => navigate('/login', { state: { ...location.state, mfaPending: true } })}
          />
        </Wrapper>
      </Container>
    </>
  );
};

export default Register;
