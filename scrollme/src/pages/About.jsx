import styled from 'styled-components';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { storeConfig } from '../data';

const Main = styled.main`
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 20px 0;
  h1 {
    font-family: var(--font-display);
    font-weight: 400;
    font-size: clamp(48px, 12vw, 88px);
    line-height: 1;
    text-transform: uppercase;
    margin-bottom: 24px;
  }
  p {
    font-size: 17px;
    line-height: 1.7;
    margin-bottom: 18px;
  }
  a {
    text-decoration: underline;
  }
`;

// The shop's motto, set large at the end of the page.
const Motto = styled.figure`
  margin: 40px 0 0;
  padding: 28px 0 0;
  border-top: 1px solid var(--line);
  blockquote {
    font-family: var(--font-display);
    font-size: clamp(40px, 10vw, 68px);
    line-height: 1;
    text-transform: uppercase;
  }
  figcaption {
    margin-top: 12px;
    font-size: 14px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
`;

// The shop's story, in the owner's words (Nov 2026).
const About = () => (
  <div>
    <Navbar />
    <Main>
      <h1>About us</h1>
      <p>
        We are a group of resellers based in Manchester, working together as one brand. Buying as a team means we can get the brands you
        want for less than the big high-street stores charge, and pass the savings straight on to you.
      </p>
      <p>
        Clothing, trainers, tech and fragrance: if there is something you are after, <Link to='/contact-us'>tell us</Link> and we will track
        it down. We deliver across the UK, free on orders over £100, and you have 30 days to return anything that is not right.
      </p>
      <p>
        Questions about an item or an order? <Link to='/contact-us'>Get in touch</Link>. We are happy to help.
      </p>
      <Motto>
        <blockquote>“You say it, we source it.”</blockquote>
        <figcaption>{storeConfig.name}</figcaption>
      </Motto>
    </Main>
    <Footer />
  </div>
);

export default About;
