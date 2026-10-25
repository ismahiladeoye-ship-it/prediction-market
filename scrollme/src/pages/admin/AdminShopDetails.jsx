import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  Link,
  Radio,
  RadioGroup,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { saveShopDetailsAPI } from '../../services/admin/adminService';
import { getErrorMessage } from '../../api/client';
import { useShopDetails } from '../../context/ShopDetails';

const FIELDS = ['name', 'legalName', 'address', 'email', 'phone', 'companyNumber', 'vatNumber', 'deliveryEstimate', 'returnPostage'];

const fromShop = (shop) => ({
  ...Object.fromEntries(FIELDS.map((f) => [f, shop[f] || ''])),
  returnPostage: shop.returnPostage || 'customer',
  socials: { instagram: '', tiktok: '', whatsapp: '', ...shop.socials },
});

const Section = ({ title, children, description }) => (
  <Box bg='white' borderRadius='lg' boxShadow='0 2px 10px rgba(0,0,0,0.08)' p={5} mb={4}>
    <Heading as='h3' size='sm' mb={description ? 1 : 4}>
      {title}
    </Heading>
    {description && (
      <Text fontSize='sm' color='gray.600' mb={4}>
        {description}
      </Text>
    )}
    {children}
  </Box>
);

// Admin → Shop details: who runs the shop. Used in the footer, the legal pages
// (Terms, Privacy, Returns, Delivery), the contact page and emails.
const AdminShopDetails = () => {
  const toast = useToast();
  const shop = useShopDetails();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!shop.loaded) return <Spinner color='gray.900' />;
  const values = form || fromShop(shop);
  const set = (field) => (e) => setForm({ ...values, [field]: e.target.value });
  const setSocial = (field) => (e) => setForm({ ...values, socials: { ...values.socials, [field]: e.target.value.trim() } });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveShopDetailsAPI(values);
      await shop.reload();
      setForm(null);
      toast({ title: 'Shop details saved', status: 'success', duration: 4000 });
    } catch (err) {
      toast({ title: 'Could not save', description: getErrorMessage(err), status: 'error', duration: 8000, isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box as='form' onSubmit={save} maxW='860px'>
      <Heading as='h2' size='md' mb={2}>
        Shop details
      </Heading>
      <Text color='gray.600' mb={4}>
        Shown in the footer, on the{' '}
        <Link as={RouterLink} to='/terms' textDecoration='underline'>
          Terms
        </Link>
        ,{' '}
        <Link as={RouterLink} to='/privacy' textDecoration='underline'>
          Privacy
        </Link>
        ,{' '}
        <Link as={RouterLink} to='/returns' textDecoration='underline'>
          Returns
        </Link>{' '}
        and{' '}
        <Link as={RouterLink} to='/delivery' textDecoration='underline'>
          Delivery
        </Link>{' '}
        pages, and in order emails.
      </Text>
      {(!shop.address || !shop.email) && (
        <Alert status='warning' borderRadius='md' mb={4}>
          <AlertIcon />
          UK law requires online shops to show a business address and email address. Add them before you start taking orders.
        </Alert>
      )}

      <Section title='Business'>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl isRequired>
            <FormLabel>Shop name</FormLabel>
            <Input value={values.name} onChange={set('name')} maxLength={80} />
          </FormControl>
          <FormControl>
            <FormLabel>Legal name</FormLabel>
            <Input
              value={values.legalName}
              onChange={set('legalName')}
              maxLength={150}
              placeholder='e.g. Get It Sourced Ltd, or your own name'
            />
            <FormHelperText>Your company name, or your own name if you are a sole trader.</FormHelperText>
          </FormControl>
          <FormControl gridColumn={{ md: 'span 2' }}>
            <FormLabel>Business address</FormLabel>
            <Textarea value={values.address} onChange={set('address')} maxLength={300} rows={4} placeholder={'Street\nTown\nPostcode'} />
            <FormHelperText>A real postal address customers can write to (not a PO box). One line per row.</FormHelperText>
          </FormControl>
          <FormControl>
            <FormLabel>Contact email</FormLabel>
            <Input type='email' value={values.email} onChange={set('email')} maxLength={254} />
            <FormHelperText>Shown to customers. New orders and messages are sent here too.</FormHelperText>
          </FormControl>
          <FormControl>
            <FormLabel>Phone</FormLabel>
            <Input type='tel' value={values.phone} onChange={set('phone')} maxLength={30} />
            <FormHelperText>Optional.</FormHelperText>
          </FormControl>
          <FormControl>
            <FormLabel>Company number</FormLabel>
            <Input value={values.companyNumber} onChange={set('companyNumber')} maxLength={12} />
            <FormHelperText>If you are a registered company.</FormHelperText>
          </FormControl>
          <FormControl>
            <FormLabel>VAT number</FormLabel>
            <Input value={values.vatNumber} onChange={set('vatNumber')} maxLength={16} />
            <FormHelperText>If you are VAT registered.</FormHelperText>
          </FormControl>
        </SimpleGrid>
      </Section>

      <Section title='Delivery and returns'>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl isRequired>
            <FormLabel>How long standard delivery takes</FormLabel>
            <Input value={values.deliveryEstimate} onChange={set('deliveryEstimate')} maxLength={60} placeholder='3–5 working days' />
          </FormControl>
          <FormControl as='fieldset'>
            <FormLabel as='legend'>Return postage</FormLabel>
            <RadioGroup value={values.returnPostage} onChange={(v) => setForm({ ...values, returnPostage: v })}>
              <Stack>
                <Radio value='customer'>Customer pays (unless faulty or wrong item)</Radio>
                <Radio value='free'>Free returns</Radio>
              </Stack>
            </RadioGroup>
          </FormControl>
        </SimpleGrid>
        <Text fontSize='sm' color='gray.600' mt={3}>
          Delivery prices and the free-delivery threshold are set on the server (see the deployment guide).
        </Text>
      </Section>

      <Section title='Social media' description='Full links to your profiles. Icons appear in the footer for the ones you fill in.'>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <FormControl>
            <FormLabel>Instagram</FormLabel>
            <Input value={values.socials.instagram} onChange={setSocial('instagram')} placeholder='https://www.instagram.com/…' />
          </FormControl>
          <FormControl>
            <FormLabel>TikTok</FormLabel>
            <Input value={values.socials.tiktok} onChange={setSocial('tiktok')} placeholder='https://www.tiktok.com/@…' />
          </FormControl>
          <FormControl>
            <FormLabel>WhatsApp</FormLabel>
            <Input value={values.socials.whatsapp} onChange={setSocial('whatsapp')} placeholder='https://wa.me/447…' />
          </FormControl>
        </SimpleGrid>
      </Section>

      <Flex gap={3} align='center' wrap='wrap'>
        <Button type='submit' colorScheme='brand' isLoading={saving}>
          Save shop details
        </Button>
        {form && (
          <Button variant='ghost' onClick={() => setForm(null)} isDisabled={saving}>
            Undo changes
          </Button>
        )}
      </Flex>
    </Box>
  );
};

export default AdminShopDetails;
