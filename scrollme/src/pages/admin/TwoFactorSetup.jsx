import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Code,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Image,
  Input,
  ListItem,
  OrderedList,
  SimpleGrid,
  Spinner,
  Text,
  useToast,
} from '@chakra-ui/react';
import { enableMfaAPI, startMfaSetupAPI } from '../../services/auth/authService';
import { getErrorMessage } from '../../api/client';

// Turns on two-factor sign-in: scan a QR code, confirm one code, then save
// the one-time recovery codes. Also used to move to a new phone.
const TwoFactorSetup = ({ onDone, replacing = false }) => {
  const toast = useToast();
  const [details, setDetails] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [saved, setSaved] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // Once only: a second request would replace the key behind the QR code.
    if (started.current) return;
    started.current = true;
    startMfaSetupAPI()
      .then(setDetails)
      .catch((err) => setError(getErrorMessage(err, 'Could not start the setup. Reload the page to try again.')));
  }, []);

  const enable = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await enableMfaAPI(code);
      setRecoveryCodes(res.recoveryCodes);
    } catch (err) {
      setError(getErrorMessage(err, 'That code is not right. Try the latest code from the app.'));
    } finally {
      setBusy(false);
    }
  };

  const codesText = () =>
    `Get It Sourced admin recovery codes\nEach code can be used once if you cannot use your authenticator app.\n\n${recoveryCodes.join('\n')}\n`;

  const download = () => {
    const url = URL.createObjectURL(new Blob([codesText()], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'get-it-sourced-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codesText());
      toast({ title: 'Recovery codes copied', status: 'success', duration: 3000 });
    } catch {
      toast({ title: 'Could not copy; use Download instead', status: 'warning', duration: 4000 });
    }
  };

  if (recoveryCodes) {
    return (
      <Box maxW='640px'>
        <Heading as='h2' size='md' mb={2}>
          Save your recovery codes
        </Heading>
        <Text mb={4}>
          If you lose your phone, each of these codes lets you sign in once. Keep them somewhere safe and private, such as a password
          manager. They will not be shown again.
        </Text>
        <SimpleGrid columns={2} spacing={2} mb={4} p={4} border='1px solid #eee' borderRadius='md' aria-label='Recovery codes'>
          {recoveryCodes.map((c) => (
            <Code key={c} fontSize='md' bg='transparent'>
              {c}
            </Code>
          ))}
        </SimpleGrid>
        <HStack spacing={3} mb={4}>
          <Button onClick={download} variant='outline' colorScheme='brand'>
            Download codes
          </Button>
          <Button onClick={copy} variant='outline'>
            Copy
          </Button>
        </HStack>
        <Checkbox colorScheme='brand' isChecked={saved} onChange={(e) => setSaved(e.target.checked)} mb={4}>
          I have saved my recovery codes
        </Checkbox>
        <Box>
          <Button colorScheme='brand' isDisabled={!saved} onClick={onDone}>
            Continue
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box maxW='640px'>
      <Heading as='h2' size='md' mb={2}>
        {replacing ? 'Set up a new authenticator' : 'Turn on two-factor sign-in'}
      </Heading>
      <Text mb={4}>
        {replacing
          ? 'Your current authenticator and recovery codes keep working until you confirm a code from the new one.'
          : 'Admin accounts need a code from your phone as well as your password, so a stolen password alone cannot open the shop’s admin.'}
      </Text>
      {!details && !error && <Spinner />}
      {details && (
        <OrderedList spacing={4} mb={4}>
          <ListItem>
            Install an authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator or 1Password.
          </ListItem>
          <ListItem>
            In the app, add an account and scan this QR code:
            <Image
              src={details.qr}
              alt='QR code for your authenticator app'
              boxSize='200px'
              my={3}
              border='1px solid #eee'
              borderRadius='md'
            />
            <Text fontSize='sm'>
              Can’t scan it? Enter this key instead: <Code fontSize='sm'>{details.secret}</Code>
            </Text>
          </ListItem>
          <ListItem>
            <form onSubmit={enable}>
              <FormControl>
                <FormLabel>Enter the 6-digit code the app shows</FormLabel>
                <HStack maxW='360px'>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode='numeric'
                    autoComplete='one-time-code'
                    maxLength={7}
                    placeholder='123456'
                    aria-label='Code from your authenticator app'
                  />
                  <Button type='submit' colorScheme='brand' isLoading={busy} isDisabled={code.replace(/\s/g, '').length < 6}>
                    Turn on
                  </Button>
                </HStack>
              </FormControl>
            </form>
          </ListItem>
        </OrderedList>
      )}
      {error && (
        <Alert status='error' borderRadius='md'>
          <AlertIcon />
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default TwoFactorSetup;
