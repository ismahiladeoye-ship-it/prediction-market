import styled from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useToast } from '@chakra-ui/react';
import {
  HiChevronDown,
  HiChevronLeft,
  HiChevronRight,
  HiOutlineBars3,
  HiOutlineHeart,
  HiOutlineMagnifyingGlass,
  HiOutlineShoppingBag,
  HiOutlineUser,
  HiXMark,
} from 'react-icons/hi2';
import Logo from './Logo';
import { selectIsAdmin } from '../store/slices/userSlice';
import { signOut } from '../store/session';
import { categoryLink, departmentLink, departments, findCategory, findDepartment, subcategoryLink } from '../utils/taxonomy';

const DESKTOP = '@media (min-width: 900px)';

const Header = styled.header`
  position: relative;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
  z-index: 50;
`;

// Phone: menu + search | logo | cart. Desktop: logo, nav beside it, icons on the right.
const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  grid-template-areas: 'left logo right';
  align-items: center;
  padding: 14px 16px;
  ${DESKTOP} {
    grid-template-columns: auto 1fr auto;
    grid-template-areas: 'logo nav right';
    gap: 44px;
    padding: 18px 32px;
  }
`;

// The menu drawer keeps the phone layout at every width.
const DrawerRow = styled(Row)`
  ${DESKTOP} {
    grid-template-columns: 1fr auto 1fr;
    grid-template-areas: 'left logo right';
    padding: 14px 16px;
  }
`;

const Side = styled.div`
  grid-area: ${({ $end }) => ($end ? 'right' : 'left')};
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: ${({ $end }) => ($end ? 'flex-end' : 'flex-start')};
`;

const PhoneSide = styled(Side)`
  ${DESKTOP} {
    display: none;
  }
`;

const LogoSlot = styled.div`
  grid-area: logo;
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

const Nav = styled.nav`
  grid-area: nav;
  display: none;
  ${DESKTOP} {
    display: flex;
    align-items: center;
    gap: 30px;
  }
  > a {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding-bottom: 3px;
    border-bottom: 2px solid transparent;
  }
  > a.active,
  > a:hover {
    border-bottom-color: var(--ink);
  }
`;

// Desktop: Men / Women open a panel with every category and its subcategories.
const MegaPanel = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding: 24px 32px 32px;
  background: var(--paper);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.1);
  z-index: 60;
`;

const MegaAll = styled(Link)`
  display: inline-block;
  margin-bottom: 18px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-bottom: 2px solid var(--ink);
`;

const MegaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 26px 24px;
  h3 a {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  ul {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
  }
  li a {
    display: block;
    padding: 4px 0;
    font-size: 14px;
    color: var(--muted, #555);
  }
  a:hover {
    color: var(--ink);
    text-decoration: underline;
  }
`;

const NavButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: inherit;
  font-size: 13px;
  line-height: inherit;
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

// Phone menu: Men / Women switch, then categories that open their subcategories.
const DeptTabs = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  margin: 16px 24px 0;
  border-bottom: 1px solid var(--line);
  button {
    padding: 14px 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: var(--ink);
    cursor: pointer;
  }
  button[aria-pressed='true'] {
    border-bottom-color: var(--ink);
  }
`;

const CategoryList = styled(DrawerList)`
  margin-top: 8px;
  a,
  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 19px;
    padding: 16px 0;
  }
  .back {
    justify-content: flex-start;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .all {
    font-weight: 600;
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
  // Desktop panel ('men' / 'women' / null) and the phone menu's department and open category.
  const [megaOpen, setMegaOpen] = useState(null);
  const megaButtons = useRef(null);
  const megaPanel = useRef(null);
  const [drawerDept, setDrawerDept] = useState(departments[0].slug);
  const [drawerCategory, setDrawerCategory] = useState(null);
  const [search, setSearch] = useState('');
  const searchInput = useRef(null);

  // Close the menu on navigation and keep the search box in sync with the URL.
  useEffect(() => {
    setMenuOpen(false);
    setMegaOpen(null);
    setDrawerCategory(null);
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

  // Close the Men / Women panel on a click elsewhere or Escape.
  useEffect(() => {
    if (!megaOpen) return undefined;
    const onDown = (e) => !megaButtons.current?.contains(e.target) && !megaPanel.current?.contains(e.target) && setMegaOpen(null);
    const onKey = (e) => e.key === 'Escape' && setMegaOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [megaOpen]);

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
    <IconLink to='/cart' aria-label={`Cart, ${totalQuantity || 0} ${totalQuantity === 1 ? 'item' : 'items'}`}>
      <HiOutlineShoppingBag size={24} aria-hidden='true' />
      <CartCount aria-hidden='true'>({totalQuantity || 0})</CartCount>
    </IconLink>
  );

  const searchButton = (
    <IconButton type='button' aria-label='Search' aria-expanded={searchOpen} onClick={() => setSearchOpen((o) => !o)}>
      <HiOutlineMagnifyingGlass size={24} />
    </IconButton>
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
        <PhoneSide>
          <IconButton type='button' aria-label='Open menu' aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <HiOutlineBars3 size={28} />
          </IconButton>
          {searchButton}
        </PhoneSide>
        <LogoSlot>
          <Logo stacked size='1.9rem' />
        </LogoSlot>
        <Nav aria-label='Main'>
          <span ref={megaButtons} style={{ display: 'contents' }}>
            {departments.map((d) => (
              <NavButton
                key={d.slug}
                type='button'
                aria-expanded={megaOpen === d.slug}
                aria-controls={`menu-${d.slug}`}
                onClick={() => setMegaOpen((o) => (o === d.slug ? null : d.slug))}
              >
                {d.title} <HiChevronDown size={14} aria-hidden='true' />
              </NavButton>
            ))}
          </span>
          <NavLink to='/about'>About</NavLink>
          <NavLink to='/contact-us'>Contact</NavLink>
          {isAdmin && <NavLink to='/admin'>Admin</NavLink>}
          {isAuthenticated && (
            <NavButton type='button' onClick={handleLogout}>
              Log out
            </NavButton>
          )}
        </Nav>
        <Side $end>
          <DesktopOnly>
            {searchButton}
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

      {megaOpen && (
        <MegaPanel id={`menu-${megaOpen}`} ref={megaPanel} role='region' aria-label={`${findDepartment(megaOpen).title} categories`}>
          <MegaAll to={departmentLink(megaOpen)}>Shop all {findDepartment(megaOpen).title}</MegaAll>
          <MegaGrid>
            {findDepartment(megaOpen).categories.map((c) => (
              <div key={c.slug}>
                <h3>
                  <Link to={categoryLink(megaOpen, c.slug)}>{c.title}</Link>
                </h3>
                <ul>
                  {c.subcategories.map((sc) => (
                    <li key={sc.slug}>
                      <Link to={subcategoryLink(megaOpen, c.slug, sc.slug)}>{sc.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </MegaGrid>
        </MegaPanel>
      )}

      {searchOpen && searchForm}

      {menuOpen && (
        <Drawer role='dialog' aria-modal='true' aria-label='Menu'>
          <DrawerRow>
            <Side>
              <IconButton type='button' aria-label='Close menu' onClick={() => setMenuOpen(false)}>
                <HiXMark size={30} />
              </IconButton>
            </Side>
            <LogoSlot>
              <Logo stacked size='1.9rem' />
            </LogoSlot>
            <Side $end>{cartLink}</Side>
          </DrawerRow>
          <DeptTabs aria-label='Department'>
            {departments.map((d) => (
              <button
                key={d.slug}
                type='button'
                aria-pressed={drawerDept === d.slug}
                onClick={() => {
                  setDrawerDept(d.slug);
                  setDrawerCategory(null);
                }}
              >
                {d.title}
              </button>
            ))}
          </DeptTabs>
          {drawerCategory ? (
            <CategoryList aria-label={`${findCategory(drawerDept, drawerCategory).title} subcategories`}>
              <li>
                <button type='button' className='back' onClick={() => setDrawerCategory(null)}>
                  <HiChevronLeft size={18} aria-hidden='true' /> {findDepartment(drawerDept).title}
                </button>
              </li>
              <li>
                <Link className='all' to={categoryLink(drawerDept, drawerCategory)}>
                  Shop all {findCategory(drawerDept, drawerCategory).title}
                </Link>
              </li>
              {findCategory(drawerDept, drawerCategory).subcategories.map((sc) => (
                <li key={sc.slug}>
                  <Link to={subcategoryLink(drawerDept, drawerCategory, sc.slug)}>{sc.title}</Link>
                </li>
              ))}
            </CategoryList>
          ) : (
            <CategoryList aria-label={`${findDepartment(drawerDept).title} categories`}>
              <li>
                <Link className='all' to={departmentLink(drawerDept)}>
                  Shop all {findDepartment(drawerDept).title}
                </Link>
              </li>
              {findDepartment(drawerDept).categories.map((c) => (
                <li key={c.slug}>
                  <button type='button' onClick={() => setDrawerCategory(c.slug)}>
                    {c.title} <HiChevronRight size={20} aria-hidden='true' />
                  </button>
                </li>
              ))}
            </CategoryList>
          )}
          {!drawerCategory && (
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
          )}
        </Drawer>
      )}
    </Header>
  );
};

export default Navbar;
