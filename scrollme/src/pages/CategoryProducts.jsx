import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Announcement from '../components/Announcement';
import ProductGallery from '../components/ProductGallery';
import Footer from '../components/Footer';

// Same layout as /products, restricted to one category.
const CategoryProducts = () => {
  const { categorySlug } = useParams();
  return (
    <div>
      <Announcement />
      <Navbar />
      <ProductGallery category={categorySlug.toLowerCase()} />
      <Footer />
    </div>
  );
};

export default CategoryProducts;
