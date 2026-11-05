import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Announcement from '../components/Announcement';
import ProductGallery from '../components/ProductGallery';
import Footer from '../components/Footer';
import { departmentLink, findDepartment } from '../utils/taxonomy';
import { findSection, sectionLink } from '../brandSections';

// A brand section such as /women/activewear-brands: every product from its
// brands, with a link per brand (?brand=...).
const BrandSection = ({ department, slug }) => {
  const [searchParams] = useSearchParams();
  const section = findSection(department, slug);
  const dept = findDepartment(department);
  const brand = section?.brands.find((b) => b === searchParams.get('brand')) || '';
  const link = section ? sectionLink(section) : '/';

  return (
    <div>
      <Announcement />
      <Navbar />
      <main>
        <ProductGallery
          key={link}
          department={department}
          brands={section?.brands}
          title={brand || section?.title}
          intro={brand ? '' : section?.intro}
          breadcrumbs={[
            { label: 'Home', to: '/' },
            { label: dept.title, to: departmentLink(department) },
            { label: section?.title || 'Page not found', to: link },
            ...(brand ? [{ label: brand, to: `${link}?brand=${encodeURIComponent(brand)}` }] : []),
          ]}
          links={(section?.brands || []).map((b) => ({ label: b, to: `${link}?brand=${encodeURIComponent(b)}` }))}
          notFound={!section}
          notFoundText='This page does not exist'
        />
      </main>
      <Footer />
    </div>
  );
};

export default BrandSection;
