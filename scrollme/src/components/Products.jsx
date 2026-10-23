import styled from 'styled-components';
import Product from './Product';
import { listProductsAPI } from '../services/products/productService';
import { useEffect, useState } from 'react';
import { Box, Button, Spinner, Text } from '@chakra-ui/react';
import { getErrorMessage } from '../api/client';

const Container = styled.div`
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
`;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPopularProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listProductsAPI({ page: 1, limit: 10, sort: 'rating' });
      setProducts(response?.products || []);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopularProducts();
  }, []);

  if (loading) {
    return (
      <Box textAlign='center' mt={5}>
        <Spinner size='xl' />
        <Text mt={4}>Loading products...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign='center' mt={5}>
        <Text color='red.500'>Error fetching products: {getErrorMessage(error)}</Text>
        <Button mt={3} size='sm' onClick={fetchPopularProducts}>
          Try again
        </Button>
      </Box>
    );
  }

  return (
    <Container>
      {products.map((product) => (
        <Product item={product} key={product._id} />
      ))}
    </Container>
  );
};

export default Products;
