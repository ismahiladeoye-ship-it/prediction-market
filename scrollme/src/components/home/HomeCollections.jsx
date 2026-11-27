import { useEffect, useState } from 'react';
import Coverflow from './Coverflow';
import SectionHeading from './SectionHeading';
import { listCategoriesAPI } from '../../services/products/productService';
import { storeConfig } from '../../data';
import { categoryLink, countIn, departmentCategoryTitle } from '../../utils/taxonomy';

// Home page "Shop by category": one card per storeConfig.homeSections entry,
// e.g. Men's Clothing. Empty sections are hidden once the live counts arrive.
// Shoppers never see the counts themselves.
const HomeCollections = () => {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    listCategoriesAPI()
      .then(setCounts)
      .catch(() => {});
  }, []);

  const items = storeConfig.homeSections
    .map(({ department, category, img }) => ({
      id: `${department}-${category}`,
      department,
      category,
      img,
      title: departmentCategoryTitle(department, category),
      link: categoryLink(department, category),
      count: counts ? countIn(counts, { department, category }) : undefined,
    }))
    .filter((item) => item.count !== 0);

  return (
    <section aria-labelledby='shop-by-category'>
      <SectionHeading id='shop-by-category'>Shop by category</SectionHeading>
      <Coverflow label='Categories' items={items} />
    </section>
  );
};

export default HomeCollections;
