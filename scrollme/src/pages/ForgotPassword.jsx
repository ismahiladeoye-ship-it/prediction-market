import styled from 'styled-components';
import { Link as RouterLink } from 'react-router-dom';
import { useState } from 'react';
import { useToast } from '@chakra-ui/react';
import { forgotPasswordAPI } from '../services/auth/authService';
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
  font-size: 14px;
  margin: 10px 0;
`;

const ForgotPassword = () => {
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    setSubmitting(true);
    try {
      await forgotPasswordAPI(email);
      setSent(true);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your email for further instructions.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to send password reset email. Please try again.'),
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
        <Title>RESET PASSWORD</Title>
        {sent ? (
          <>
            <Message role='status'>
              If an account exists for that email address, we have sent a link to reset the password. The link is valid for 30 minutes.
            </Message>
            <Link to='/login'>Back to Login</Link>
          </>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Input placeholder='email' name='email' type='email' aria-label='Email' autoComplete='email' required />
            <Button type='submit' disabled={submitting}>
              SEND RESET LINK
            </Button>
            <Link to='/login'>Back to Login</Link>
          </Form>
        )}
      </Wrapper>
    </Container>
  );
};

export default ForgotPassword;
