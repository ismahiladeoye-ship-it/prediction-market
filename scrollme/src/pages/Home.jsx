import Announcement from '../components/Announcement';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import Hero from '../components/home/Hero';
import HomeHighlights from '../components/home/HomeHighlights';
import HomeCollections from '../components/home/HomeCollections';
import BrandStrip from '../components/home/BrandStrip';
import SourceQuote from '../components/home/SourceQuote';
import FAQ from '../components/FAQ';
import BackToTopButton from '../components/BackToTopButton';

const Home = () => {
  return (
    <div>
      <Navbar />
      <main>
        <Hero />
        <HomeHighlights />
        {/* Delivery and returns banner, below Specials (was above the logo). */}
        <Announcement />
        <HomeCollections />
        <BrandStrip />
        <SourceQuote />
        <FAQ />
      </main>
      <BackToTopButton />
      <Footer />
    </div>
  );
};

export default Home;
