import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Alert, AlertIcon, Box, Button, Heading, HStack, Spinner, Text } from '@chakra-ui/react';
import Navbar from '../../components/Navbar';
import Announcement from '../../components/Announcement';
import TwoFactorSetup from './TwoFactorSetup';
import { getMfaStatusAPI } from '../../services/auth/authService';
import { signOut } from '../../store/session';

const tabStyle = ({ isActive }) => ({
  padding: '8px 14px',
  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
  color: isActive ? 'var(--accent)' : 'inherit',
  fontWeight: 600,
  whiteSpace: 'nowrap',
});

// Admin pages need two-factor sign-in: set up on the account and passed in
// this session (the API enforces the same rule on every admin request).
const AdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mfa, setMfa] = useState(null);

  const loadStatus = useCallback(() => {
    getMfaStatusAPI()
      .then(setMfa)
      .catch(() => setMfa({ error: true }));
  }, []);
  useEffect(loadStatus, [loadStatus]);

  const signInAgain = async () => {
    await dispatch(signOut());
    navigate('/login', { state: { from: { pathname: '/admin' } } });
  };

  let content;
  if (!mfa) content = <Spinner />;
  else if (mfa.error) {
    content = (
      <Alert status='error' borderRadius='md'>
        <AlertIcon />
        Could not check your sign-in. Reload the page to try again.
      </Alert>
    );
  } else if (!mfa.enabled) content = <TwoFactorSetup onDone={loadStatus} />;
  else if (!mfa.verified) {
    content = (
      <Box maxW='560px'>
        <Text mb={4}>This session was opened without your two-factor code. Sign in again with your code to use admin features.</Text>
        <Button colorScheme='brand' onClick={signInAgain}>
          Sign in again
        </Button>
      </Box>
    );
  } else {
    content = (
      <>
        <HStack as='nav' aria-label='Admin sections' spacing={2} borderBottom='1px solid #eee' mb={6} overflowX='auto'>
          <NavLink to='/admin' end style={tabStyle}>
            Dashboard
          </NavLink>
          <NavLink to='/admin/products' style={tabStyle}>
            Products
          </NavLink>
          <NavLink to='/admin/import' style={tabStyle}>
            Bulk upload
          </NavLink>
          <NavLink to='/admin/orders' style={tabStyle}>
            Orders
          </NavLink>
          <NavLink to='/admin/order-book' style={tabStyle}>
            Order book
          </NavLink>
          <NavLink to='/admin/messages' style={tabStyle}>
            Messages
          </NavLink>
          <NavLink to='/admin/home' style={tabStyle}>
            Home page
          </NavLink>
          <NavLink to='/admin/shop' style={tabStyle}>
            Shop details
          </NavLink>
          <NavLink to='/admin/security' style={tabStyle}>
            Security
          </NavLink>
        </HStack>
        <Outlet context={{ mfa, reloadMfa: loadStatus }} />
      </>
    );
  }

  return (
    <div>
      <Announcement />
      <Navbar />
      <Box px={{ base: 4, md: 8 }} py={6} maxW='1400px' mx='auto'>
        <Heading as='h1' size='lg' fontWeight={300} mb={4}>
          Store administration
        </Heading>
        {content}
      </Box>
    </div>
  );
};

export default AdminLayout;
