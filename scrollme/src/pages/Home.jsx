import Announcement from '../components/Announcement';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import Products from '../components/Products';
import Hero from '../components/home/Hero';
import CollectionCarousels from '../components/home/CollectionCarousels';
import FeatureSplit from '../components/home/FeatureSplit';
import FAQ from '../components/FAQ';
import BackToTopButton from '../components/BackToTopButton';

const Home = () => {
  return (
    <div>
      <Announcement />
      <Navbar />
      <main>
        <Hero />
        <CollectionCarousels />
        <Products />
        <FeatureSplit />
        <FAQ />
      </main>
      <BackToTopButton />
      <Footer />
    </div>
  );
};

export default Home;
