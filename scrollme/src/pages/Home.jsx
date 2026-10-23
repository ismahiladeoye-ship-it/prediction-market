import Announcement from '../components/Announcement';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import Products from '../components/Products';
import Hero from '../components/home/Hero';
import CollectionGrid from '../components/home/CollectionGrid';
import FAQ from '../components/FAQ';
import BackToTopButton from '../components/BackToTopButton';

const Home = () => {
  return (
    <div>
      <Announcement />
      <Navbar />
      <main>
        <Hero />
        <CollectionGrid />
        <Products />
        <FAQ />
      </main>
      <BackToTopButton />
      <Footer />
    </div>
  );
};

export default Home;
