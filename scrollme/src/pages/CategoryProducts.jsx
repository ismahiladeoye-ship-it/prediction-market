import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProductGallery from '../components/ProductGallery';
import Footer from '../components/Footer';

// Same layout as /products, restricted to one category.
const CategoryProducts = () => {
  const { categorySlug } = useParams();
  return (
    <div>
      <Navbar />
      <ProductGallery category={categorySlug.toLowerCase()} />
      <Footer />
    </div>
  );
};

export default CategoryProducts;
