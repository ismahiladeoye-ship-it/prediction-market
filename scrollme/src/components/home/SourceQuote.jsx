import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { storeConfig } from '../../data';

const Figure = styled.figure`
  margin: 0;
  padding: 64px 22px 68px;
  text-align: center;
  blockquote {
    margin: 0 auto;
    max-width: 1000px;
    font-family: var(--font-display);
    font-size: clamp(52px, 13vw, 96px);
    line-height: 0.95;
    text-transform: uppercase;
  }
  figcaption {
    margin-top: 16px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  a {
    display: inline-block;
    margin-top: 24px;
    font-size: 15px;
    font-weight: 600;
    border-bottom: 1px solid currentColor;
    padding-bottom: 2px;
  }
`;

// Home page: the shop's motto, with a link to the sourcing request form.
const SourceQuote = () => (
  <section aria-label='Our promise'>
    <Figure>
      <blockquote>“You say it, we source it.”</blockquote>
      <figcaption>{storeConfig.name}</figcaption>
      <Link to='/contact-us?type=sourcing'>Tell us what you're after →</Link>
    </Figure>
  </section>
);

export default SourceQuote;
