import styled from 'styled-components';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useToast } from '@chakra-ui/react';
import { resetPasswordAPI } from '../services/auth/authService';
import { passwordHint } from '../utils/passwordPolicy';
import { getErrorMessage } from '../api/client';
import { mobile, tablet } from '../responsive';
import Logo from '../components/Logo';

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
  border: 1px solid gray;
  border-radius: 2px;
`;

const Button = styled.button`
  width: 100%;
  border: none;
  padding: 15px 20px;
  background-color: var(--accent);
  color: white;
  cursor: pointer;
  margin-bottom: 10px;
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

const Message = styled.p`
  font-size: 12px;
  margin: 4px 0;
  color: #555;
`;

const ResetPassword = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  // The emailed link carries the token in the #fragment (never sent to the
  // server or in Referer headers); ?token= is still accepted for older links.
  const [token] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get('token') || new URLSearchParams(location.search).get('token') || ''
  );
  const [password, setPassword] = useState('');

  // Drop the token from the address bar and browser history once read.
  useEffect(() => {
    if (location.hash || location.search) navigate('/reset-password', { replace: true });
  }, [location.hash, location.search, navigate]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const confirm = e.target.confirmPassword.value;
    const hint = passwordHint(password);
    if (hint || password !== confirm) {
      toast({
        title: 'Check your password',
        description: hint || 'Passwords do not match.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await resetPasswordAPI({ token, password });
      toast({ title: 'Password updated', description: res.message, status: 'success', duration: 5000, isClosable: true });
      navigate('/login', { replace: true });
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'This reset link is invalid or has expired.'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <Wrapper>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
          <Logo />
        </div>
        <br />
        <Title>CHOOSE A NEW PASSWORD</Title>
        {!token ? (
          <>
            <Message>This reset link is incomplete. Please request a new one.</Message>
            <Link to='/forgot-password'>Request a new link</Link>
          </>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Input
              placeholder='new password'
              name='password'
              type='password'
              aria-label='New password'
              autoComplete='new-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              placeholder='confirm new password'
              name='confirmPassword'
              type='password'
              aria-label='Confirm new password'
              autoComplete='new-password'
              required
            />
            {password && passwordHint(password) && <Message>{passwordHint(password)}</Message>}
            <Button type='submit' disabled={submitting}>
              UPDATE PASSWORD
            </Button>
            <Link to='/login'>Back to Login</Link>
          </Form>
        )}
      </Wrapper>
    </Container>
  );
};

export default ResetPassword;
