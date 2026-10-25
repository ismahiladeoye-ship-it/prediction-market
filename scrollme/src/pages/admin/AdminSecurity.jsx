import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Alert, AlertIcon, Box, Button, Heading, Text } from '@chakra-ui/react';
import TwoFactorSetup from './TwoFactorSetup';

// Two-factor status, and moving to a new phone.
const AdminSecurity = () => {
  const { mfa, reloadMfa } = useOutletContext();
  const [replacing, setReplacing] = useState(false);

  if (replacing) {
    return (
      <TwoFactorSetup
        replacing
        onDone={() => {
          setReplacing(false);
          reloadMfa();
        }}
      />
    );
  }

  return (
    <Box maxW='640px'>
      <Heading as='h2' size='md' mb={2}>
        Two-factor sign-in
      </Heading>
      <Alert status='success' borderRadius='md' mb={4}>
        <AlertIcon />
        On. Signing in to this account needs your password and a code from your authenticator app.
      </Alert>
      <Text mb={2}>
        Recovery codes left: <b>{mfa.recoveryCodesLeft}</b>
      </Text>
      {mfa.recoveryCodesLeft <= 3 && (
        <Text mb={2} color='orange.600'>
          You are running low on recovery codes. Setting up your authenticator again gives you a fresh set.
        </Text>
      )}
      <Text mb={4} color='gray.600' fontSize='sm'>
        New phone, or lost codes? Set up a new authenticator below. If you can no longer sign in at all, the server administrator can run{' '}
        <code>npm run reset-mfa -- --email=you@example.com</code>.
      </Text>
      <Button variant='outline' colorScheme='brand' onClick={() => setReplacing(true)}>
        Set up a new authenticator
      </Button>
    </Box>
  );
};

export default AdminSecurity;
