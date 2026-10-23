import styled from 'styled-components';
import { useEffect, useState } from 'react';
import Coverflow from './Coverflow';
import SectionHeading from './SectionHeading';
import { listCategoriesAPI, listCollectionsAPI } from '../../services/products/productService';
import { storeConfig } from '../../data';

const Rows = styled.div`
  display: grid;
  gap: 20px;
  @media (min-width: 900px) {
    gap: 36px;
  }
`;

const linkFor = ({ collection, category }) =>
  category ? `/collections/${collection}?category=${encodeURIComponent(category)}` : `/collections/${collection}`;

// "Shop by collection": a coverflow carousel per row in storeConfig.collectionRows,
// with live item counts. Cards whose collection/category is empty are hidden.
const CollectionCarousels = () => {
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

  const rows = storeConfig.collectionRows
    .map((row) => ({
      ...row,
      items: row.items
        .map((item) => ({
          ...item,
          link: linkFor(item),
          count: counts ? (item.category ? counts.categories[item.category] : counts.collections[item.collection]) || 0 : undefined,
        }))
        .filter((item) => item.count !== 0),
    }))
    .filter((row) => row.items.length);

  return (
    <section aria-labelledby='shop-by-collection'>
      <SectionHeading id='shop-by-collection'>Shop by collection</SectionHeading>
      <Rows>
        {rows.map((row) => (
          <Coverflow key={row.label} label={row.label} items={row.items} />
        ))}
      </Rows>
    </section>
  );
};

export default CollectionCarousels;
