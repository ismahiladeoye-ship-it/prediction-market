import styled from 'styled-components';
import SearchIcon from '@mui/icons-material/Search';
import { ShoppingCartOutlined, FavoriteBorderOutlined } from '@mui/icons-material';
import { mobile } from '../responsive';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, useToast } from '@chakra-ui/react';
import { selectIsAdmin } from '../store/slices/userSlice';
import { Badge } from '@chakra-ui/react';
import Logo from '../components/Logo';
import { signOut } from '../store/session';
import { useEffect, useState } from 'react';

const Container = styled.div`
  height: 60px;
  width: 100%;
  background-color: white;
  ${mobile({ height: '120px;' })}
`;

const Wrapper = styled.div`
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  ${mobile({
    height: '90px',
    padding: '10px 10px',
    flexDirection: 'column',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  })}
`;

const Left = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
`;

const Language = styled.span`
  font-size: 14px;
  cursor: pointer;
  ${mobile({ display: 'none;' })}
`;

const SearchContainer = styled.form`
  border: 1px solid lightgray;
  display: flex;
  align-items: center;
  margin-inline-start: 25px;
  padding: 5px;
`;

const Input = styled.input`
  border: none;
  outline: none;
  min-width: 0;
  ${mobile({ width: '200px', margin: '0 auto' })}
`;

const SearchButton = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
`;
const Center = styled.div`
  flex: 1;
  text-align: center;
`;

const Right = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  ${mobile({ flex: 2, justifyContent: 'center', flexWrap: 'wrap' })}
`;

const MenuItem = styled.div`
  font-size: 14px;
  cursor: pointer;
  margin-inline-start: 25px;
  ${mobile({ fontSize: '12px', marginInlineStart: '10px' })}
`;

const Navbar = () => {
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  const isAdmin = useSelector(selectIsAdmin);
  const totalQuantity = useSelector((state) => state.cart.totalQuantity);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const toast = useToast();
  const [search, setSearch] = useState('');

  // Keep the box in sync with the current search (e.g. after Back).
  useEffect(() => {
    setSearch(location.pathname === '/products' ? new URLSearchParams(location.search).get('q') || '' : '');
  }, [location.pathname, location.search]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  const handleLogout = async () => {
    try {
      await dispatch(signOut());
      toast({
        title: 'Logout Successfully!',
        description: 'You have successfully logged out!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch {
      // Local session data is cleared even if the server could not be reached.
      toast({
        title: 'Logged out on this device',
        description: 'We could not reach the server; your session will expire on its own.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }
    navigate('/');
  };

  return (
    <Container>
      <Wrapper>
        <Left>
          <Language>EN</Language>
          <SearchContainer role='search' onSubmit={handleSearch}>
            <Input
              placeholder='Search'
              aria-label='Search products'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
            />
            <SearchButton type='submit' aria-label='Search'>
              <SearchIcon style={{ color: 'gray', fontSize: 16 }} />
            </SearchButton>
          </SearchContainer>
        </Left>
        <Center>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
            {' '}
            <Logo />{' '}
          </div>
        </Center>
        <Right>
          <MenuItem>
            <Link to='/contact-us'>CONTACT US</Link>
          </MenuItem>
          {!isAuthenticated && (
            <MenuItem>
              <Link to='/register'>REGISTER</Link>
            </MenuItem>
          )}
          {!isAuthenticated && (
            <MenuItem>
              <Link to='/login'>SIGN IN</Link>
            </MenuItem>
          )}
          {isAuthenticated && isAdmin && (
            <MenuItem>
              <Link to='/admin'>ADMIN</Link>
            </MenuItem>
          )}
          {isAuthenticated && (
            <MenuItem>
              <Link to='/account'>ACCOUNT</Link>
            </MenuItem>
          )}
          {isAuthenticated && (
            <MenuItem as='button' type='button' onClick={handleLogout}>
              LOG OUT
            </MenuItem>
          )}
          <MenuItem>
            <Link to='/cart' aria-label='Cart'>
              <Box position='relative'>
                <ShoppingCartOutlined />
                {totalQuantity > 0 && (
                  <Badge colorScheme='teal' borderRadius='full' position='absolute' top='-5px' right='-10px' fontSize='0.8em'>
                    {totalQuantity}
                  </Badge>
                )}
              </Box>
            </Link>
          </MenuItem>
          <MenuItem>
            <Link to='/wishlist' aria-label='Wishlist'>
              <FavoriteBorderOutlined />
            </Link>
          </MenuItem>
        </Right>
      </Wrapper>
    </Container>
  );
};

export default Navbar;
