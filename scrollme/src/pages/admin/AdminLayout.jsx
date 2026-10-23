import { NavLink, Outlet } from 'react-router-dom';
import { Box, Heading, HStack } from '@chakra-ui/react';
import Navbar from '../../components/Navbar';
import Announcement from '../../components/Announcement';

const tabStyle = ({ isActive }) => ({
  padding: '8px 14px',
  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
  color: isActive ? 'var(--accent)' : 'inherit',
  fontWeight: 600,
  whiteSpace: 'nowrap',
});

const AdminLayout = () => (
  <div>
    <Announcement />
    <Navbar />
    <Box px={{ base: 4, md: 8 }} py={6} maxW='1400px' mx='auto'>
      <Heading as='h1' size='lg' fontWeight={300} mb={4}>
        Store administration
      </Heading>
      <HStack as='nav' aria-label='Admin sections' spacing={2} borderBottom='1px solid #eee' mb={6} overflowX='auto'>
        <NavLink to='/admin' end style={tabStyle}>
          Dashboard
        </NavLink>
        <NavLink to='/admin/products' style={tabStyle}>
          Products
        </NavLink>
        <NavLink to='/admin/orders' style={tabStyle}>
          Orders
        </NavLink>
      </HStack>
      <Outlet />
    </Box>
  </div>
);

export default AdminLayout;
