import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Spinner } from '@chakra-ui/react';
import { selectIsAdmin } from '../store/slices/userSlice';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, authChecked } = useSelector((state) => state.user);
  const isAdmin = useSelector(selectIsAdmin);
  const location = useLocation();

  if (isAuthenticated && !authChecked) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' height='60vh'>
        <Spinner size='xl' color='teal' />
      </Box>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to='/login' state={{ from: location }} replace />;
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to='/' replace />;
  }
  return children;
};

export default ProtectedRoute;
