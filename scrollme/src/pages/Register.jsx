import styled from 'styled-components';
import { UserRegistrationAPI } from '../services/userAPI/registerationAPI';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Triangle } from 'react-loader-spinner';
import { mobile, tablet } from '../responsive';
import PasswordStrengthBar from 'react-password-strength-bar';
import { useToast } from '@chakra-ui/react';
import Logo from '../components/Logo';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { startSession } from '../store/session';
import { getErrorMessage } from '../api/client';
import { passwordHint } from '../utils/passwordPolicy';

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
  height: 100vh;
  background:
    linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5)),
    url('https://images.pexels.com/photos/6984661/pexels-photo-6984661.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940') center;
  background-size: cover;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Box = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 6px;
`;

const Wrapper = styled.div`
  width: 40%;
  ${mobile({ width: '84%;' })}
  ${tablet({ width: '84%;' })}
    ${mobile({ maxWidth: '760px' })}
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
  flex-wrap: wrap;
`;

const Input = styled.input`
  flex: 1;
  min-width: 40%;
  margin: 20px 10px 0px 0px;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
`;

const Agreement = styled.span`
  font-size: 12px;
  margin: 20px 0px;
  a {
    text-decoration: underline;
  }
`;

const Text = styled.p`
  font-size: 12px;
`;

const Link = styled(RouterLink)`
  font-size: 12px;
  margin: 5px 0px;
  text-decoration: underline;
  cursor: pointer;
  &:hover {
    color: blue;
  }
`;

const Button = styled.button`
  width: 100%;
  border: none;
  padding: 15px 20px;
  background-color: var(--accent);
  color: white;
  cursor: pointer;
  transition: transform 0.3s ease;
  &:hover {
    transform: scale(1.05);
  }
`;

const PasswordBox = styled.div`
  width: 100%;
  padding: 2px 4px;
  height: fit-content;
`;
const Register = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const dispatch = useDispatch();
  const from = location.state?.from;
  const redirectTo = from ? `${from.pathname}${from.search || ''}` : '/';

  const warn = (title, description) => toast({ title, description, status: 'warning', duration: 5000, isClosable: true });

  // Same rules as the API, checked here for quicker feedback.
  const validateForm = (formData) => {
    const { firstName, lastName, username, password } = formData;
    const namePattern = /^[\p{L}][\p{L}' -]*$/u;
    if (firstName.length < 2 || !namePattern.test(firstName)) {
      warn('Invalid First Name', 'First name must be at least 2 characters long and contain only letters.');
      return false;
    }
    if (lastName.length < 2 || !namePattern.test(lastName)) {
      warn('Invalid Last Name', 'Last name must be at least 2 characters long and contain only letters.');
      return false;
    }
    if (username.length < 3 || !/^[a-zA-Z0-9._-]+$/.test(username)) {
      warn('Invalid Username', 'Username must be at least 3 characters and use only letters, numbers, dots, underscores or hyphens.');
      return false;
    }
    const hint = passwordHint(password);
    if (hint) {
      warn('Invalid Password', hint);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = {
      firstName: e.target.firstName.value.trim(),
      lastName: e.target.lastName.value.trim(),
      username: e.target.username.value.trim(),
      email: e.target.email.value.trim(),
      password: e.target.password.value,
      confirmPassword: e.target.confirmPassword.value,
    };

    if (formData.password !== formData.confirmPassword) {
      warn('Password Mismatch!', 'Passwords do not match, change the password!.');
      return;
    }
    if (!validateForm(formData)) return;

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
      toast({
        title: 'Registration Failed!',
        description: getErrorMessage(error, 'An error occurred during registration.'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePassword = (e) => {
    setPassword(e.target.value);
  };

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
            {' '}
            <Logo />{' '}
          </div>
          <br />
          <Title>CREATE AN ACCOUNT</Title>
          <Form onSubmit={(e) => handleSubmit(e)}>
            <Input
              type='text'
              name='firstName'
              placeholder='first name'
              aria-label='First name'
              autoComplete='given-name'
              maxLength={50}
              required
            />
            <Input
              type='text'
              name='lastName'
              placeholder='last name'
              aria-label='Last name'
              autoComplete='family-name'
              maxLength={50}
              required
            />
            <Input
              type='text'
              name='username'
              placeholder='username'
              aria-label='Username'
              autoComplete='username'
              maxLength={30}
              required
            />
            <Input type='email' name='email' placeholder='email' aria-label='Email' autoComplete='email' required />
            <Input
              type='password'
              name='password'
              placeholder='password'
              aria-label='Password'
              autoComplete='new-password'
              required
              onChange={(e) => handlePassword(e)}
            />
            <Input
              type='password'
              name='confirmPassword'
              placeholder='confirm password'
              aria-label='Confirm password'
              autoComplete='new-password'
              required
            />
            <PasswordBox>
              <PasswordStrengthBar password={password} />
              {password && passwordHint(password) && <Text>{passwordHint(password)}</Text>}
            </PasswordBox>
            <Box>
              <Agreement>
                By creating an account you agree to our <RouterLink to='/terms'>Terms &amp; conditions</RouterLink>. Our{' '}
                <RouterLink to='/privacy'>Privacy policy</RouterLink> explains how we use your information.
              </Agreement>
              <Text>
                Already have an account?{' '}
                <Link to='/login' state={location.state}>
                  LOGIN
                </Link>
              </Text>
            </Box>
            <Button type='submit' disabled={isLoading}>
              CREATE
            </Button>
          </Form>
          <br></br>
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
