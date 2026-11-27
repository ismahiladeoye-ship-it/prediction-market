import styled, { keyframes } from 'styled-components';
import brandLogos from '../../brandLogos';

const slide = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

const Wrap = styled.section`
  margin-top: 56px;
  padding: 26px 0 22px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  overflow: hidden;
`;

const Eyebrow = styled.h2`
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0 16px 20px;
`;

// Two identical halves slide left by one half, so the loop has no seam.
const Track = styled.div`
  display: flex;
  width: max-content;
  animation: ${slide} ${({ $seconds }) => $seconds}s linear infinite;
  &:hover {
    animation-play-state: paused;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    width: auto;
    flex-wrap: wrap;
    justify-content: center;
    row-gap: 20px;
    > [aria-hidden='true'],
    [data-repeat] {
      display: none;
    }
  }
`;

const Half = styled.ul`
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  @media (prefers-reduced-motion: reduce) {
    flex-wrap: wrap;
    justify-content: center;
    row-gap: 20px;
  }
`;

// Each logo gets about the same area, so wide and square logos look balanced.
// --h is the phone height in px; computers show them a quarter larger.
const Item = styled.li`
  flex: none;
  display: flex;
  align-items: center;
  height: calc(var(--h) * 1px);
  margin: 0 28px;
  color: var(--ink);
  svg,
  img {
    display: block;
    height: 100%;
    width: auto;
  }
  @media (min-width: 900px) {
    height: calc(var(--h) * 1.25px);
    margin: 0 40px;
  }
`;

const AREA = 4000;
const heightFor = (ratio = 2) => Math.round(Math.min(56, Math.sqrt(AREA / ratio)));

const Note = styled.p`
  text-align: center;
  font-size: 11px;
  color: var(--muted);
  margin: 18px 16px 0;
`;

const Logo = ({ logo }) =>
  logo.src ? (
    <img src={logo.src} alt={logo.name} width={Math.round(logo.ratio * 100)} height={100} />
  ) : (
    <svg viewBox={logo.viewBox} role='img' aria-label={logo.name} fill='currentColor'>
      <path d={logo.path} />
    </svg>
  );

// Home page: a slowly sliding row of the brands and stores we source from
// (src/brandLogos.js). Logos only; stands still for people who prefer less motion.
const BrandStrip = () => {
  if (!brandLogos.length) return null;
  // Repeat short lists so each half is wider than any screen.
  const repeats = Math.max(1, Math.ceil(10 / brandLogos.length));
  const row = Array.from({ length: repeats }, () => brandLogos).flat();
  const half = (copy) => (
    <Half aria-hidden={copy || undefined} aria-label={copy ? undefined : 'Brands and stores we source from'}>
      {row.map((logo, i) => (
        <Item
          key={`${logo.name}-${i}`}
          style={{ '--h': heightFor(logo.ratio) }}
          data-repeat={i >= brandLogos.length || undefined}
          aria-hidden={(!copy && i >= brandLogos.length) || undefined}
        >
          <Logo logo={logo} />
        </Item>
      ))}
    </Half>
  );
  return (
    <Wrap aria-labelledby='brands-heading'>
      <Eyebrow id='brands-heading'>Brands and stores we source from</Eyebrow>
      <Track $seconds={row.length * 3}>
        {half(false)}
        {half(true)}
      </Track>
      <Note>Get It Sourced is an independent reseller, not linked to these brands or stores.</Note>
    </Wrap>
  );
};

export default BrandStrip;
