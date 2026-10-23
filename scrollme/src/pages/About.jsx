import styled from 'styled-components';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Announcement from '../components/Announcement';
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

// Edit this copy to tell your own story.
const About = () => (
  <div>
    <Announcement />
    <Navbar />
    <Main>
      <h1>About us</h1>
      <p>
        {storeConfig.name} finds the pieces you are looking for — clothing, footwear, accessories and fragrances — and brings them together
        in one place, so you do not have to search for them yourself.
      </p>
      <p>
        We deliver across the UK, free on every order, and you have 30 days to return anything that is not right. Every order is paid
        through a secure checkout, and you can follow it from payment to delivery in your account.
      </p>
      <p>
        Questions about an item or an order? <Link to='/contact-us'>Get in touch</Link> — we are happy to help.
      </p>
    </Main>
    <Footer />
  </div>
);

export default About;
