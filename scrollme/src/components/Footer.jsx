import styled, { keyframes } from 'styled-components';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaApplePay, FaCcAmex, FaCcMastercard, FaCcPaypal, FaCcVisa, FaGooglePay, FaInstagram, FaTiktok, FaWhatsapp } from 'react-icons/fa';
import { collections, storeConfig } from '../data';
import { subscribeAPI } from '../services/newsletter/newsletterService';
import { getErrorMessage } from '../api/client';
import { useShopDetails } from '../context/ShopDetails';

const scroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

const DESKTOP = '@media (min-width: 900px)';

const FooterEl = styled.footer`
  margin-top: 72px;
  background: var(--paper);
  border-top: 1px solid var(--line);
  text-align: center;
`;

const Top = styled.div`
  ${DESKTOP} {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 48px;
    padding: 40px 32px 0;
  }
`;

const BrandBlock = styled.div`
  min-width: 0;
`;

const Marquee = styled.div`
  overflow: hidden;
  padding: 36px 0 10px;
  -webkit-mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
  mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
  ${DESKTOP} {
    padding-top: 0;
  }
`;

const Track = styled.div`
  display: flex;
  width: max-content;
  animation: ${scroll} 28s linear infinite;
  span {
    display: inline-flex;
    align-items: center;
    gap: 36px;
    padding-right: 36px;
    font-family: var(--font-display);
    font-size: clamp(64px, 16vw, 140px);
    line-height: 1;
    white-space: nowrap;
    ${DESKTOP} {
      font-size: 96px;
    }
  }
  i {
    display: inline-block;
    width: 0.3em;
    height: 0.3em;
    background: var(--ink);
    transform: rotate(45deg);
    border-radius: 3px;
  }
`;

const Location = styled.p`
  margin: 18px 0 40px;
  font-size: 17px;
  letter-spacing: 0.04em;
  ${DESKTOP} {
    margin-bottom: 0;
    font-size: 15px;
  }
`;

const Signup = styled.form`
  max-width: 560px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  h2 {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: clamp(24px, 6vw, 32px);
    line-height: 1.15;
    letter-spacing: 0.02em;
    margin-bottom: 14px;
  }
  input {
    min-width: 0;
    height: 56px;
    padding: 0 20px;
    border-radius: 10px;
    border: 1px solid var(--ink);
    background: var(--ink);
    color: white;
    font-size: 17px;
  }
  input::placeholder {
    color: #d6d6d6;
  }
  button {
    height: 56px;
    padding: 0 22px;
    border-radius: 10px;
    border: 1.5px solid var(--ink);
    background: white;
    color: var(--ink);
    font-size: 17px;
    font-weight: 500;
    cursor: pointer;
  }
  button:hover {
    background: var(--soft);
  }
  ${DESKTOP} {
    padding: 0;
    h2 {
      font-size: 20px;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
  }
`;

const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  ${DESKTOP} {
    flex-direction: row;
    gap: 10px;
    input {
      flex: 1;
      height: 48px;
      font-size: 15px;
    }
    button {
      height: 48px;
      font-size: 15px;
    }
  }
`;

const Notice = styled.p`
  font-size: 14px;
  color: ${({ $error }) => ($error ? 'var(--sale)' : 'var(--ink)')};
`;

const Socials = styled.div`
  display: flex;
  justify-content: center;
  gap: 34px;
  margin: 40px 0 8px;
  a {
    color: var(--ink);
  }
  ${DESKTOP} {
    margin-top: 24px;
  }
`;

const Bottom = styled.div`
  margin-top: 48px;
  padding: 22px 24px 28px;
  border-top: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--muted);
  ${DESKTOP} {
    flex-direction: row;
    justify-content: space-between;
    padding: 22px 32px 28px;
  }
`;

const Links = styled.nav`
  ul {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px 20px;
    list-style: none;
  }
  a {
    color: var(--ink);
  }
  a:hover {
    text-decoration: underline;
  }
`;

const Payments = styled.div`
  display: flex;
  gap: 10px;
  color: var(--ink);
`;

const SOCIAL_ICONS = [
  ['instagram', 'Instagram', FaInstagram],
  ['whatsapp', 'WhatsApp', FaWhatsapp],
  ['tiktok', 'TikTok', FaTiktok],
];

const Footer = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // { ok, message }
  const [busy, setBusy] = useState(false);
  const shop = useShopDetails();
  const brand = shop.name.toUpperCase();
  const socials = SOCIAL_ICONS.filter(([key]) => shop.socials[key]);

  const subscribe = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await subscribeAPI(email.trim());
      setStatus({ ok: true, message: res.message });
      setEmail('');
    } catch (err) {
      setStatus({ ok: false, message: getErrorMessage(err, 'Please enter a valid email address.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FooterEl>
      <Top>
        <BrandBlock>
          <Marquee aria-hidden='true'>
            <Track>
              {[0, 1].map((half) => (
                <span key={half}>
                  {[0, 1, 2].map((n) => (
                    <span key={n}>
                      {brand} <i />
                    </span>
                  ))}
                </span>
              ))}
            </Track>
          </Marquee>
          {storeConfig.location && <Location>{storeConfig.location}</Location>}
        </BrandBlock>

        <div>
          <Signup onSubmit={subscribe} aria-labelledby='newsletter-title'>
            <h2 id='newsletter-title'>Sign up for new drops and restocks</h2>
            <Fields>
              <input
                type='email'
                placeholder='Email'
                aria-label='Email'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete='email'
              />
              <button type='submit' disabled={busy}>
                {busy ? 'Subscribing…' : 'Subscribe'}
              </button>
            </Fields>
            {status && (
              <Notice role='status' $error={!status.ok}>
                {status.message}
              </Notice>
            )}
          </Signup>

          {socials.length > 0 && (
            <Socials>
              {socials.map(([key, label, Icon]) => (
                <a key={key} href={shop.socials[key]} target='_blank' rel='noopener noreferrer' aria-label={label}>
                  <Icon size={30} />
                </a>
              ))}
            </Socials>
          )}
        </div>
      </Top>

      <Bottom>
        <p>
          © {new Date().getFullYear()} {shop.legalName || shop.name}
        </p>
        <Links aria-label='Footer'>
          <ul>
            <li>
              <Link to='/products'>Shop all</Link>
            </li>
            {collections.map((c) => (
              <li key={c.slug}>
                <Link to={`/collections/${c.slug}`}>{c.title}</Link>
              </li>
            ))}
            <li>
              <Link to='/about'>About us</Link>
            </li>
            <li>
              <Link to='/contact-us'>Contact</Link>
            </li>
            <li>
              <Link to='/account'>Orders</Link>
            </li>
            <li>
              <Link to='/wishlist'>Wishlist</Link>
            </li>
            <li>
              <a href='/#faq'>FAQ</a>
            </li>
            <li>
              <Link to='/delivery'>Delivery</Link>
            </li>
            <li>
              <Link to='/returns'>Returns</Link>
            </li>
            <li>
              <Link to='/terms'>Terms</Link>
            </li>
            <li>
              <Link to='/privacy'>Privacy</Link>
            </li>
            {shop.email && (
              <li>
                <a href={`mailto:${shop.email}`}>{shop.email}</a>
              </li>
            )}
          </ul>
        </Links>
        <Payments aria-label='Accepted payment methods: Visa, Mastercard, American Express, PayPal, Apple Pay, Google Pay'>
          <FaCcVisa size={28} />
          <FaCcMastercard size={28} />
          <FaCcAmex size={28} />
          <FaCcPaypal size={28} />
          <FaApplePay size={32} />
          <FaGooglePay size={32} />
        </Payments>
      </Bottom>
    </FooterEl>
  );
};

export default Footer;
