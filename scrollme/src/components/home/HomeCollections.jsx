import { useEffect, useState } from 'react';
import Coverflow from './Coverflow';
import ProductRow from './ProductRow';
import SectionHeading from './SectionHeading';
import { listCategoriesAPI } from '../../services/products/productService';
import { storeConfig } from '../../data';
import { categoryLink, countIn, departmentCategoryTitle, subcategoryLink } from '../../utils/taxonomy';

const shortcutLink = (department, category, { subcategory, search }) =>
  search ? `${categoryLink(department, category)}?q=${encodeURIComponent(search)}` : subcategoryLink(department, category, subcategory);

// Home page sections (storeConfig.homeSections), e.g. Men's Clothing: "Shop by
// category" with one card per section, then a product row for each one with
// shortcut buttons. Empty sections and subcategories are hidden once the live
// counts arrive.
const HomeCollections = () => {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    listCategoriesAPI()
      .then(setCounts)
      .catch(() => {});
  }, []);

  const items = storeConfig.homeSections
    .map(({ department, category, img, shortcuts }) => ({
      id: `${department}-${category}`,
      department,
      category,
      img,
      title: departmentCategoryTitle(department, category),
      link: categoryLink(department, category),
      count: counts ? countIn(counts, { department, category }) : undefined,
      shortcuts: shortcuts
        .filter((s) => s.search || !counts || countIn(counts, { department, category, subcategory: s.subcategory }) > 0)
        .map((s) => ({ label: s.label, to: shortcutLink(department, category, s) })),
    }))
    .filter((item) => item.count !== 0);

  return (
    <>
      <section aria-labelledby='shop-by-category'>
        <SectionHeading id='shop-by-category'>Shop by category</SectionHeading>
        <Coverflow label='Categories' items={items} />
      </section>
      {items.map((item) => (
        <ProductRow
          key={item.id}
          id={`row-${item.id}`}
          title={item.title}
          params={{ department: item.department, category: item.category, sort: 'rating', inStock: 'true' }}
          viewAllTo={item.link}
          shortcuts={item.shortcuts}
        />
      ))}
    </>
  );
};

export default HomeCollections;
