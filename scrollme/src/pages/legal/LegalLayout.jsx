import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../../components/Navbar';
import Announcement from '../../components/Announcement';
import Footer from '../../components/Footer';
import { useShopDetails } from '../../context/ShopDetails';
import { selectIsAdmin } from '../../store/slices/userSlice';

// Change when the wording of the legal pages changes.
export const LAST_UPDATED = '25 October 2026';

const Main = styled.main`
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 20px 24px;
  h1 {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: clamp(44px, 11vw, 80px);
    line-height: 1;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  h2 {
    font-size: 20px;
    font-weight: 700;
    margin: 32px 0 10px;
  }
  p,
  li {
    font-size: 16px;
    line-height: 1.7;
  }
  p {
    margin-bottom: 14px;
  }
  ul,
  ol {
    padding-left: 22px;
    margin-bottom: 14px;
  }
  li {
    margin-bottom: 6px;
  }
  a {
    text-decoration: underline;
  }
`;

const Updated = styled.p`
  color: #666;
  font-size: 14px !important;
  margin-bottom: 28px !important;
`;

const Notice = styled.div`
  border: 1px solid #e0b100;
  background: #fff8db;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 24px;
  font-size: 15px;
`;

export const Box = styled.div`
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 16px 18px;
  margin: 12px 0 18px;
  background: #fafafa;
  p:last-child {
    margin-bottom: 0;
  }
`;

// The shop's address as lines.
export const addressLines = (address) =>
  String(address || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

// Name, address and how to reach us: required on UK shop websites.
export const BusinessIdentity = () => {
  const shop = useShopDetails();
  const lines = addressLines(shop.address);
  return (
    <Box>
      <p>
        <strong>{shop.name}</strong>
        {shop.legalName && shop.legalName !== shop.name && <> is a trading name of {shop.legalName}</>}
        {lines.length > 0 && (
          <>
            <br />
            {lines.map((l) => (
              <span key={l}>
                {l}
                <br />
              </span>
            ))}
          </>
        )}
      </p>
      <p>
        {shop.email ? (
          <>
            Email: <a href={`mailto:${shop.email}`}>{shop.email}</a>
            <br />
          </>
        ) : null}
        {shop.phone && (
          <>
            Phone: {shop.phone}
            <br />
          </>
        )}
        Contact form: <Link to='/contact-us'>Contact us</Link>
        {shop.companyNumber && (
          <>
            <br />
            Company number {shop.companyNumber}
          </>
        )}
        {shop.vatNumber && (
          <>
            <br />
            VAT number {shop.vatNumber}
          </>
        )}
      </p>
    </Box>
  );
};

// How to get in touch, for use inside sentences.
export const ContactUsLink = ({ children = 'contact us' }) => <Link to='/contact-us'>{children}</Link>;

const LegalPage = ({ title, children }) => {
  const shop = useShopDetails();
  const isAdmin = useSelector(selectIsAdmin);
  const missing = [!shop.address && 'business address', !shop.email && 'contact email'].filter(Boolean);
  return (
    <div>
      <Announcement />
      <Navbar />
      <Main>
        <h1>{title}</h1>
        <Updated>Last updated {LAST_UPDATED}</Updated>
        {isAdmin && shop.loaded && missing.length > 0 && (
          <Notice role='note'>
            Only admins see this: add your {missing.join(' and ')} in <Link to='/admin/shop'>Admin → Shop details</Link>. UK law requires
            them on this page.
          </Notice>
        )}
        {children}
      </Main>
      <Footer />
    </div>
  );
};

export default LegalPage;
