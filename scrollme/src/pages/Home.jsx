import Announcement from '../components/Announcement';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import Hero from '../components/home/Hero';
import HomeCollections from '../components/home/HomeCollections';
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
        <HomeCollections />
        <FeatureSplit />
        <FAQ />
      </main>
      <BackToTopButton />
      <Footer />
    </div>
  );
};

export default Home;
