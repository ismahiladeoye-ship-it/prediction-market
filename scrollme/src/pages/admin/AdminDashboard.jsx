import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, SimpleGrid, Spinner, Stat, StatLabel, StatNumber, Text } from '@chakra-ui/react';
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
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4} mb={8}>
        <Card label='Revenue (paid orders)' value={formatPrice(stats.revenue)} />
        <Card
          label='Orders to fulfil'
          value={(stats.ordersByStatus.paid || 0) + (stats.ordersByStatus.processing || 0)}
          to='/admin/orders?status=paid'
        />
        <Card label='Low-stock products (≤ 5)' value={stats.lowStockProducts} to='/admin/products?lowStock=true' />
        <Card label='Orders needing attention' value={stats.ordersNeedingAttention} to='/admin/orders' />
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
