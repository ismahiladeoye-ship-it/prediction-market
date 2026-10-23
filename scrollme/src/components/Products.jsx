import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Spinner, Text } from '@chakra-ui/react';
import ProductTile from './ProductTile';
import SectionHeading from './home/SectionHeading';
import { listProductsAPI } from '../services/products/productService';
import { getErrorMessage } from '../api/client';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 12px;
  padding: 0 16px;
  @media (min-width: 900px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 32px 20px;
    padding: 0 32px;
  }
`;

const ViewAll = styled(Link)`
  display: block;
  width: fit-content;
  margin: 32px auto 0;
  padding: 16px 34px;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 14px;
  &:hover {
    background: var(--ink);
    color: white;
  }
`;

// "Trending now": best-rated products.
const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPopularProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listProductsAPI({ page: 1, limit: 8, sort: 'rating', inStock: 'true' });
      setProducts(response?.products || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopularProducts();
  }, []);

  return (
    <section aria-labelledby='trending-now'>
      <SectionHeading id='trending-now'>Trending now</SectionHeading>
      {loading && (
        <Box textAlign='center' py={10}>
          <Spinner size='xl' color='gray.900' />
        </Box>
      )}
      {error && (
        <Box textAlign='center' py={6}>
          <Text color='red.500'>Error fetching products: {getErrorMessage(error)}</Text>
          <Button mt={3} size='sm' onClick={fetchPopularProducts}>
            Try again
          </Button>
        </Box>
      )}
      {!loading && !error && (
        <>
          <Grid>
            {products.map((product) => (
              <ProductTile product={product} key={product._id} />
            ))}
          </Grid>
          <ViewAll to='/products'>View all products</ViewAll>
        </>
      )}
    </section>
  );
};

export default Products;
