import { useEffect, useState } from 'react';
import ProductRow from './ProductRow';
import { getHighlightsAPI } from '../../services/products/productService';

// "Hot & trending" (most bought lately, then the newest arrivals) and
// "Specials" (biggest savings), 7 items each, on coloured bands near the top
// of the home page. Hidden if there is nothing to show or the request fails.
const HomeHighlights = () => {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let live = true;
    getHighlightsAPI()
      .then((data) => live && setRows(data))
      .catch(() => live && setRows({ trending: [], specials: [] }));
    return () => {
      live = false;
    };
  }, []);

  if (!rows) return null;
  return (
    <>
      {rows.trending?.length > 0 && (
        <ProductRow
          id='row-trending'
          title='Hot & trending'
          subtitle='What everyone is buying right now'
          items={rows.trending}
          viewAllTo='/products'
          banner
        />
      )}
      {rows.specials?.length > 0 && (
        <ProductRow id='row-specials' title='Specials' subtitle='Our biggest savings on the retail price' items={rows.specials} banner />
      )}
    </>
  );
};

export default HomeHighlights;
