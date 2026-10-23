import styled, { keyframes } from 'styled-components';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaApplePay, FaCcAmex, FaCcMastercard, FaCcPaypal, FaCcVisa, FaGooglePay, FaInstagram, FaTiktok, FaWhatsapp } from 'react-icons/fa';
import { collections, storeConfig } from '../data';
import { subscribeAPI } from '../services/newsletter/newsletterService';
import { getErrorMessage } from '../api/client';

const scroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

const FooterEl = styled.footer`
  margin-top: 72px;
  background: var(--paper);
  border-top: 1px solid var(--line);
  text-align: center;
`;

const Marquee = styled.div`
  overflow: hidden;
  padding: 36px 0 10px;
  -webkit-mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
  mask-image: linear-gradient(90deg, transparent, black 12%, black 88%, transparent);
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
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
  max-width: 900px;
  margin: 48px auto 0;
  padding: 0 24px;
  text-align: left;
  @media (min-width: 700px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  h3 {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 22px;
    letter-spacing: 0.06em;
    margin-bottom: 10px;
  }
  li {
    list-style: none;
    margin-bottom: 8px;
    font-size: 15px;
  }
  a:hover {
    text-decoration: underline;
  }
`;

const Bottom = styled.div`
  margin-top: 40px;
  padding: 22px 24px 28px;
  border-top: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--muted);
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
  const brand = storeConfig.name.toUpperCase();
  const socials = SOCIAL_ICONS.filter(([key]) => storeConfig.socials[key]);

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

      <Signup onSubmit={subscribe} aria-labelledby='newsletter-title'>
        <h2 id='newsletter-title'>Sign up for new drops, restocks and exclusive deals</h2>
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
        {status && (
          <Notice role='status' $error={!status.ok}>
            {status.message}
          </Notice>
        )}
      </Signup>

      {socials.length > 0 && (
        <Socials>
          {socials.map(([key, label, Icon]) => (
            <a key={key} href={storeConfig.socials[key]} target='_blank' rel='noopener noreferrer' aria-label={label}>
              <Icon size={36} />
            </a>
          ))}
        </Socials>
      )}

      <Columns>
        <nav aria-label='Shop'>
          <h3>Shop</h3>
          <ul>
            {collections.map((c) => (
              <li key={c.slug}>
                <Link to={`/collections/${c.slug}`}>{c.title}</Link>
              </li>
            ))}
            <li>
              <Link to='/products'>All products</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label='Help'>
          <h3>Help</h3>
          <ul>
            <li>
              <Link to='/contact-us'>Contact</Link>
            </li>
            <li>
              <Link to='/about'>About us</Link>
            </li>
            <li>
              <Link to='/account'>Order tracking</Link>
            </li>
            <li>
              <a href='/#faq'>FAQ</a>
            </li>
            {storeConfig.contactEmail && (
              <li>
                <a href={`mailto:${storeConfig.contactEmail}`}>{storeConfig.contactEmail}</a>
              </li>
            )}
          </ul>
        </nav>
        <nav aria-label='Your account'>
          <h3>Account</h3>
          <ul>
            <li>
              <Link to='/account'>My account</Link>
            </li>
            <li>
              <Link to='/wishlist'>Wishlist</Link>
            </li>
            <li>
              <Link to='/cart'>Bag</Link>
            </li>
          </ul>
        </nav>
      </Columns>

      <Bottom>
        <Payments aria-label='Accepted payment methods: Visa, Mastercard, American Express, PayPal, Apple Pay, Google Pay'>
          <FaCcVisa size={30} />
          <FaCcMastercard size={30} />
          <FaCcAmex size={30} />
          <FaCcPaypal size={30} />
          <FaApplePay size={34} />
          <FaGooglePay size={34} />
        </Payments>
        <p>
          © {new Date().getFullYear()} {storeConfig.name}
        </p>
      </Bottom>
    </FooterEl>
  );
};

export default Footer;
