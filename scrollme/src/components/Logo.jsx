import { useId } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

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

// The "sourced tag": a swing tag with a tick, meaning "we found it for you".
// The hole and the tick are cut out (a mask), so it works on any background.
export const TagMark = ({ size = 32, title }) => {
  const id = `gis-tag-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox='0 0 64 64' role={title ? 'img' : undefined} aria-hidden={title ? undefined : 'true'}>
      {title && <title>{title}</title>}
      <defs>
        <mask id={id}>
          <rect width='64' height='64' fill='#fff' />
          <g transform='rotate(-28 34 32)'>
            <circle cx='17.5' cy='32' r='3.4' fill='#000' />
            <path d='M29 33 l7 7 l13 -15' fill='none' stroke='#000' strokeWidth='5.5' strokeLinecap='round' strokeLinejoin='round' />
          </g>
        </mask>
      </defs>
      <g mask={`url(#${id})`}>
        <path transform='rotate(-28 34 32)' d='M10 22 L21 11 H55 a5 5 0 0 1 5 5 V48 a5 5 0 0 1 -5 5 H21 L10 42 Z' fill='currentColor' />
      </g>
    </svg>
  );
};

// Tag mark above (stacked, header) or beside the wordmark.
const Logo = ({ size = '2rem', stacked = false, iconSize }) => (
  <LogoLink to='/' $stacked={stacked} aria-label='Get It Sourced — home'>
    <TagMark size={iconSize || (stacked ? 38 : 30)} />
    <Wordmark $size={size}>Get It Sourced</Wordmark>
  </LogoLink>
);

export default Logo;
