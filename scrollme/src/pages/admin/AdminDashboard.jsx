import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Heading, ListItem, SimpleGrid, Spinner, Stat, StatLabel, StatNumber, Text, UnorderedList } from '@chakra-ui/react';
import { getStatsAPI } from '../../services/admin/adminService';
import { getErrorMessage } from '../../api/client';
import { formatPrice, ORDER_STATUS_LABELS } from '../../utils/format';

const Card = ({ label, value, to }) => (
  <Box
    as={to ? Link : 'div'}
    to={to}
    p={5}
    bg='white'
    borderRadius='lg'
    boxShadow='0 2px 10px rgba(0,0,0,0.08)'
    _hover={to ? { boxShadow: '0 2px 14px rgba(0,0,0,0.18)' } : undefined}
  >
    <Stat>
      <StatLabel color='gray.600'>{label}</StatLabel>
      <StatNumber color='gray.900'>{value}</StatNumber>
    </Stat>
  </Box>
);

// What still needs doing before taking real orders.
const SetupChecklist = ({ setup }) => {
  const items = [
    !setup.shopAddress && { text: 'Add your business address', to: '/admin/shop' },
    !setup.shopEmail && { text: 'Add your contact email (new orders and messages are sent there)', to: '/admin/shop' },
    !setup.emailSending && { text: 'Set up email sending (SMTP_URL) so customers get order emails — see the deployment guide' },
    setup.photoStorage === false && {
      text: 'Set up photo storage (a Vercel Blob store, or Cloudflare R2) so uploads persist — see the deploy guides',
    },
    setup.payments === 'mock' && { text: 'Connect Stripe: payments are in local test mode' },
    setup.payments === 'test' && { text: 'Stripe is in test mode: switch to live keys when you are ready to take real payments' },
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <Box bg='orange.50' border='1px solid' borderColor='orange.200' borderRadius='lg' p={5} mb={8}>
      <Heading as='h2' size='sm' mb={3}>
        Before you take real orders
      </Heading>
      <UnorderedList spacing={1}>
        {items.map((item) => (
          <ListItem key={item.text}>
            {item.to ? (
              <Link to={item.to} style={{ textDecoration: 'underline' }}>
                {item.text}
              </Link>
            ) : (
              item.text
            )}
          </ListItem>
        ))}
      </UnorderedList>
    </Box>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getStatsAPI()
      .then(setStats)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  if (error) return <Text color='red.500'>{error}</Text>;
  if (!stats) return <Spinner color='gray.900' />;

  return (
    <>
      {stats.setup && <SetupChecklist setup={stats.setup} />}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4} mb={8}>
        <Card label='Revenue (paid orders)' value={formatPrice(stats.revenue)} />
        <Card
          label='Orders to fulfil'
          value={(stats.ordersByStatus.paid || 0) + (stats.ordersByStatus.processing || 0)}
          to='/admin/orders?status=paid'
        />
        <Card label='Low-stock products (≤ 5)' value={stats.lowStockProducts} to='/admin/products?lowStock=true' />
        <Card label='Orders needing attention' value={stats.ordersNeedingAttention} to='/admin/orders' />
        <Card label='New messages' value={stats.newMessages ?? 0} to='/admin/messages' />
      </SimpleGrid>
      <SimpleGrid columns={{ base: 2, md: 4, lg: 7 }} spacing={3}>
        {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
          <Card key={status} label={label} value={stats.ordersByStatus[status] || 0} to={`/admin/orders?status=${status}`} />
        ))}
      </SimpleGrid>
      <Text mt={6} color='gray.600' fontSize='sm'>
        {stats.activeProducts.toLocaleString()} active products · {stats.customers.toLocaleString()} registered accounts
      </Text>
    </>
  );
};

export default AdminDashboard;
