import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { PiShoppingBagOpenFill } from 'react-icons/pi';

const LogoLink = styled(Link)`
  display: inline-flex;
  flex-direction: ${({ $stacked }) => ($stacked ? 'column' : 'row')};
  align-items: center;
  gap: ${({ $stacked }) => ($stacked ? '2px' : '8px')};
  color: var(--ink);
  text-decoration: none;
`;

// The wordmark stays on one line and shrinks to fit narrow phones.
const Wordmark = styled.span`
  font-family: var(--font-display);
  font-size: ${({ $size }) => `min(${$size}, 8.5vw)`};
  letter-spacing: 0.08em;
  line-height: 1;
  white-space: nowrap;
`;

// Bag mark above (stacked, header) or beside the wordmark.
const Logo = ({ size = '2rem', stacked = false, iconSize }) => (
  <LogoLink to='/' $stacked={stacked} aria-label='Get It Sourced — home'>
    <PiShoppingBagOpenFill aria-hidden='true' size={iconSize || (stacked ? 34 : 26)} />
    <Wordmark $size={size}>Get It Sourced</Wordmark>
  </LogoLink>
);

export default Logo;
