import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Announcement from '../components/Announcement';
import ProductGallery from '../components/ProductGallery';
import Footer from '../components/Footer';
import {
  categoryLink,
  departmentCategoryTitle,
  departmentLink,
  findCategory,
  findDepartment,
  findSubcategory,
  subcategoryLink,
} from '../utils/taxonomy';

// /men, /men/:category and /men/:category/:subcategory (and the same for women).
const DepartmentProducts = ({ department }) => {
  const { category, subcategory } = useParams();
  const dept = findDepartment(department);
  const cat = category ? findCategory(department, category) : null;
  const sub = subcategory ? findSubcategory(department, category, subcategory) : null;
  const notFound = Boolean((category && !cat) || (subcategory && !sub));

  const title = notFound ? 'Page not found' : sub ? sub.title : cat ? departmentCategoryTitle(department, cat.slug) : dept.title;
  const breadcrumbs = notFound
    ? []
    : [
        { label: 'Home', to: '/' },
        { label: dept.title, to: departmentLink(department) },
        ...(cat ? [{ label: cat.title, to: categoryLink(department, cat.slug) }] : []),
        ...(sub ? [{ label: sub.title, to: subcategoryLink(department, cat.slug, sub.slug) }] : []),
      ];
  // A department page links to its categories; a category page to its subcategories.
  const links = notFound
    ? []
    : cat
      ? cat.subcategories.map((s) => ({ label: s.title, to: subcategoryLink(department, cat.slug, s.slug) }))
      : dept.categories.map((c) => ({ label: c.title, to: categoryLink(department, c.slug) }));

  return (
    <div>
      <Announcement />
      <Navbar />
      <main>
        <ProductGallery
          key={`${department}/${category || ''}/${subcategory || ''}`}
          department={department}
          category={cat?.slug}
          subcategory={sub?.slug}
          title={title}
          breadcrumbs={breadcrumbs}
          links={links}
          notFound={notFound}
          notFoundText='This category does not exist'
        />
      </main>
      <Footer />
    </div>
  );
};

export default DepartmentProducts;
