import styled from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useToast } from '@chakra-ui/react';
import { HiOutlineBars3, HiOutlineHeart, HiOutlineMagnifyingGlass, HiOutlineShoppingBag, HiOutlineUser, HiXMark } from 'react-icons/hi2';
import Logo from './Logo';
import { selectIsAdmin } from '../store/slices/userSlice';
import { signOut } from '../store/session';
import { collections } from '../data';

const DESKTOP = '@media (min-width: 900px)';

const Header = styled.header`
  position: relative;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
  z-index: 50;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 14px 16px;
  ${DESKTOP} {
    padding: 18px 32px 10px;
  }
`;

const Side = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: ${({ $end }) => ($end ? 'flex-end' : 'flex-start')};
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 40px;
  height: 40px;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink);
  font-size: 16px;
`;

const IconLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 40px;
  height: 40px;
  justify-content: center;
  color: var(--ink);
  font-size: 16px;
`;

const DesktopOnly = styled.span`
  display: none;
  ${DESKTOP} {
    display: inline-flex;
  }
`;

const MobileOnly = styled.span`
  display: inline-flex;
  ${DESKTOP} {
    display: none;
  }
`;

const Nav = styled.nav`
  display: none;
  ${DESKTOP} {
    display: flex;
    justify-content: center;
    gap: 28px;
    padding: 6px 32px 14px;
  }
  a {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding-bottom: 3px;
    border-bottom: 2px solid transparent;
  }
  a.active,
  a:hover {
    border-bottom-color: var(--ink);
  }
`;

const NavButton = styled.button`
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 0 3px;
  border-bottom: 2px solid transparent;
  &:hover {
    border-bottom-color: var(--ink);
  }
`;

const SearchPanel = styled.form`
  display: flex;
  gap: 8px;
  padding: 0 16px 14px;
  ${DESKTOP} {
    padding: 0 32px 16px;
    max-width: 720px;
    margin: 0 auto;
  }
  input {
    flex: 1;
    min-width: 0;
    height: 46px;
    padding: 0 16px;
    border: 1px solid var(--ink);
    border-radius: 999px;
    font-size: 16px;
  }
  button {
    height: 46px;
    padding: 0 22px;
    border-radius: 999px;
    background: var(--ink);
    color: white;
    font-weight: 600;
    border: none;
    cursor: pointer;
  }
`;

const Drawer = styled.div`
  position: fixed;
  inset: 0;
  background: var(--paper);
  z-index: 1300;
  overflow-y: auto;
  padding-bottom: 40px;
`;

const DrawerList = styled.ul`
  list-style: none;
  margin: 24px 0 0;
  padding: 0 24px;
  li {
    border-bottom: 1px solid var(--line);
  }
  li:last-child {
    border-bottom: none;
  }
  a,
  button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 18px 0;
    font-size: 22px;
    background: none;
    border: none;
    color: var(--ink);
    cursor: pointer;
  }
`;

const CartCount = styled.span`
  font-size: 15px;
`;

const Navbar = () => {
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  const isAdmin = useSelector(selectIsAdmin);
  const totalQuantity = useSelector((state) => state.cart.totalQuantity);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchInput = useRef(null);

  // Close the menu on navigation and keep the search box in sync with the URL.
  useEffect(() => {
    setMenuOpen(false);
    const q = location.pathname === '/products' ? new URLSearchParams(location.search).get('q') || '' : '';
    setSearch(q);
    if (!q) setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = 'auto';
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    setMenuOpen(false);
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await dispatch(signOut());
      toast({ title: 'Logged out', description: 'You have successfully logged out!', status: 'success', duration: 4000, isClosable: true });
    } catch {
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

  const cartLink = (
    <IconLink to='/cart' aria-label={`Cart, ${totalQuantity || 0} items`}>
      <HiOutlineShoppingBag size={24} aria-hidden='true' />
      <CartCount aria-hidden='true'>({totalQuantity || 0})</CartCount>
    </IconLink>
  );

  const searchForm = (
    <SearchPanel role='search' onSubmit={handleSearch}>
      <input
        ref={searchInput}
        placeholder='Search products'
        aria-label='Search products'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        maxLength={100}
      />
      <button type='submit'>Search</button>
    </SearchPanel>
  );

  return (
    <Header>
      <Row>
        <Side>
          <MobileOnly>
            <IconButton type='button' aria-label='Open menu' aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <HiOutlineBars3 size={28} />
            </IconButton>
          </MobileOnly>
          <IconButton type='button' aria-label='Search' aria-expanded={searchOpen} onClick={() => setSearchOpen((o) => !o)}>
            <HiOutlineMagnifyingGlass size={24} />
          </IconButton>
        </Side>
        <Logo stacked size='1.9rem' />
        <Side $end>
          <DesktopOnly>
            {isAuthenticated ? (
              <IconLink to='/account' aria-label='Account'>
                <HiOutlineUser size={24} />
              </IconLink>
            ) : (
              <IconLink to='/login' aria-label='Log in'>
                <HiOutlineUser size={24} />
              </IconLink>
            )}
            <IconLink to='/wishlist' aria-label='Wishlist'>
              <HiOutlineHeart size={24} />
            </IconLink>
          </DesktopOnly>
          {cartLink}
        </Side>
      </Row>

      <Nav aria-label='Main'>
        <NavLink to='/' end>
          Home
        </NavLink>
        {collections.map((c) => (
          <NavLink key={c.slug} to={`/collections/${c.slug}`}>
            {c.title}
          </NavLink>
        ))}
        <NavLink to='/products' end>
          All products
        </NavLink>
        <NavLink to='/contact-us'>Contact</NavLink>
        {isAdmin && <NavLink to='/admin'>Admin</NavLink>}
        {isAuthenticated && (
          <NavButton type='button' onClick={handleLogout}>
            Log out
          </NavButton>
        )}
      </Nav>

      {searchOpen && searchForm}

      {menuOpen && (
        <Drawer role='dialog' aria-modal='true' aria-label='Menu'>
          <Row>
            <Side>
              <IconButton type='button' aria-label='Close menu' onClick={() => setMenuOpen(false)}>
                <HiXMark size={30} />
              </IconButton>
            </Side>
            <Logo stacked size='1.9rem' />
            <Side $end>{cartLink}</Side>
          </Row>
          <DrawerList>
            <li>
              <Link to='/'>Home</Link>
            </li>
            <li>
              <Link to='/contact-us'>Contact</Link>
            </li>
            <li>
              <Link to='/about'>About us</Link>
            </li>
            {collections.map((c) => (
              <li key={c.slug}>
                <Link to={`/collections/${c.slug}`}>{c.title}</Link>
              </li>
            ))}
            <li>
              <Link to='/products'>All products</Link>
            </li>
            <li>
              <Link to='/wishlist'>Wishlist</Link>
            </li>
            <li>
              <button
                type='button'
                onClick={() => {
                  setMenuOpen(false);
                  setSearchOpen(true);
                }}
              >
                Search
              </button>
            </li>
            {isAuthenticated ? (
              <>
                <li>
                  <Link to='/account'>Account</Link>
                </li>
                {isAdmin && (
                  <li>
                    <Link to='/admin'>Admin</Link>
                  </li>
                )}
                <li>
                  <button type='button' onClick={handleLogout}>
                    Log out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to='/login'>Login</Link>
                </li>
                <li>
                  <Link to='/register'>Create account</Link>
                </li>
              </>
            )}
          </DrawerList>
        </Drawer>
      )}
    </Header>
  );
};

export default Navbar;
