import './styles/global.css';
import Home from './pages/Home';
import Product from './pages/Product';
import Register from './pages/Register';
import Login from './pages/Login';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import { Routes, Route, Link } from 'react-router-dom';
import ProtectedRoute from './utils/ProtectedRoute';
import { lazy, Suspense } from 'react';
import ContactUsPage from './pages/ContactUsPage';
import ComingSoon from './pages/ComingSoon';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import useAuthCheck from './hooks/useAuthCheck';
const LazyAllProducts = lazy(() => import('./pages/AllProducts'));
const LazyCategoryProducts = lazy(() => import('./pages/CategoryProducts'));
const LazyCollectionProducts = lazy(() => import('./pages/CollectionProducts'));
const LazyAbout = lazy(() => import('./pages/About'));
const LazyCheckout = lazy(() => import('./pages/Checkout'));
const LazyMockPayment = lazy(() => import('./pages/MockPayment'));
const LazyOrderDetail = lazy(() => import('./pages/OrderDetail'));
const LazyAccount = lazy(() => import('./pages/Account'));
const LazyAdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const LazyAdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const LazyAdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const LazyAdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const LazyAdminImport = lazy(() => import('./pages/admin/AdminImport'));
const LazyAdminSecurity = lazy(() => import('./pages/admin/AdminSecurity'));
const LazyAdminOrderBook = lazy(() => import('./pages/admin/AdminOrderBook'));
const LazyAdminHome = lazy(() => import('./pages/admin/AdminHome'));
const LazyAdminShopDetails = lazy(() => import('./pages/admin/AdminShopDetails'));
const LazyAdminMessages = lazy(() => import('./pages/admin/AdminMessages'));
const LazyTerms = lazy(() => import('./pages/legal/Terms'));
const LazyPrivacy = lazy(() => import('./pages/legal/Privacy'));
const LazyReturns = lazy(() => import('./pages/legal/Returns'));
const LazyDelivery = lazy(() => import('./pages/legal/Delivery'));

const protect = (element, adminOnly = false) => <ProtectedRoute adminOnly={adminOnly}>{element}</ProtectedRoute>;

const NotFound = () => (
  <div style={{ padding: '60px 20px', textAlign: 'center' }}>
    <h1>404 Not Found</h1>
    <p style={{ marginTop: 12 }}>
      <Link to='/' style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
        Back to the store
      </Link>
    </p>
  </div>
);

function App() {
  useAuthCheck();
  return (
    <div className='App'>
      <Suspense fallback='Loading...'>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/cart' element={protect(<Cart />)} />
          <Route path='/wishlist' element={protect(<Wishlist />)} />
          <Route path='/checkout' element={protect(<LazyCheckout />)} />
          <Route path='/checkout/mock' element={protect(<LazyMockPayment />)} />
          <Route path='/account' element={protect(<LazyAccount />)} />
          <Route path='/orders/:orderId' element={protect(<LazyOrderDetail />)} />
          <Route path='/admin' element={protect(<LazyAdminLayout />, true)}>
            <Route index element={<LazyAdminDashboard />} />
            <Route path='products' element={<LazyAdminProducts />} />
            <Route path='orders' element={<LazyAdminOrders />} />
            <Route path='order-book' element={<LazyAdminOrderBook />} />
            <Route path='home' element={<LazyAdminHome />} />
            <Route path='shop' element={<LazyAdminShopDetails />} />
            <Route path='messages' element={<LazyAdminMessages />} />
            <Route path='import' element={<LazyAdminImport />} />
            <Route path='security' element={<LazyAdminSecurity />} />
          </Route>
          <Route path='/products' element={<LazyAllProducts />} />
          <Route path='/collections/:slug' element={<LazyCollectionProducts />} />
          <Route path='/about' element={<LazyAbout />} />
          <Route path='/terms' element={<LazyTerms />} />
          <Route path='/privacy' element={<LazyPrivacy />} />
          <Route path='/returns' element={<LazyReturns />} />
          <Route path='/delivery' element={<LazyDelivery />} />
          <Route path='/login' element={<Login />} />
          <Route path='/forgot-password' element={<ForgotPassword />} />
          <Route path='/reset-password' element={<ResetPassword />} />
          <Route path='/register' element={<Register />} />
          <Route path='/contact-us' element={<ContactUsPage />} />
          <Route path='/comingsoon' element={<ComingSoon />} />
          <Route path='/:categorySlug' element={<LazyCategoryProducts />} />
          <Route path='/:categorySlug/:productId' element={<Product />} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
