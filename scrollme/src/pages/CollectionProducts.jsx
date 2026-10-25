import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Announcement from '../components/Announcement';
import ProductGallery from '../components/ProductGallery';
import Footer from '../components/Footer';
import { collections } from '../data';

// /collections/:slug — products from one collection (e.g. Footwear).
const CollectionProducts = () => {
  const { slug } = useParams();
  const collection = collections.find((c) => c.slug === slug);
  return (
    <div>
      <Announcement />
      <Navbar />
      <main>
        <ProductGallery
          collection={collection ? slug : undefined}
          title={collection ? collection.title : 'Collection not found'}
          notFound={!collection}
        />
      </main>
      <Footer />
    </div>
  );
};

export default CollectionProducts;
