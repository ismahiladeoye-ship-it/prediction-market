import { useEffect, useState } from 'react';
import Coverflow from './Coverflow';
import ProductRow from './ProductRow';
import SectionHeading from './SectionHeading';
import { listCategoriesAPI, listCollectionsAPI } from '../../services/products/productService';
import { collections, storeConfig } from '../../data';

const shortcutLink = (collection, { category, search }) =>
  `/collections/${collection}?${search ? `q=${encodeURIComponent(search)}` : `category=${encodeURIComponent(category)}`}`;

// Home page by collection (storeConfig.homeCollections): "Shop by collection"
// with one card per collection, then a separate product row for each one with
// shortcuts to its categories. Empty collections and categories are hidden
// once the live counts arrive.
const HomeCollections = () => {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    Promise.all([listCollectionsAPI(), listCategoriesAPI()])
      .then(([cols, cats]) =>
        setCounts({
          collections: Object.fromEntries(cols.map((c) => [c.slug, c.count])),
          categories: Object.fromEntries(cats.map((c) => [c.slug, c.count])),
        })
      )
      .catch(() => {});
  }, []);

  const items = storeConfig.homeCollections
    .map((entry) => ({
      ...entry,
      id: entry.collection,
      title: collections.find((c) => c.slug === entry.collection)?.title || entry.collection,
      link: `/collections/${entry.collection}`,
      count: counts ? counts.collections[entry.collection] || 0 : undefined,
      shortcuts: entry.shortcuts
        .filter((s) => s.search || !counts || counts.categories[s.category] > 0)
        .map((s) => ({ label: s.label, to: shortcutLink(entry.collection, s) })),
    }))
    .filter((item) => item.count !== 0);

  return (
    <>
      <section aria-labelledby='shop-by-collection'>
        <SectionHeading id='shop-by-collection'>Shop by collection</SectionHeading>
        <Coverflow label='Collections' items={items} />
      </section>
      {items.map((item) => (
        <ProductRow
          key={item.id}
          id={`row-${item.id}`}
          title={item.title}
          params={{ collection: item.collection, sort: 'rating', inStock: 'true' }}
          viewAllTo={item.link}
          shortcuts={item.shortcuts}
        />
      ))}
    </>
  );
};

export default HomeCollections;
