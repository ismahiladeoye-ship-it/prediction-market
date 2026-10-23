import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from './ProductCard';
import { listCategoriesAPI, listProductsAPI } from '../services/products/productService';
import { getErrorMessage } from '../api/client';
import { humanize } from '../utils/format';
import { Box, Button, Checkbox, Flex, Heading, HStack, Input, InputGroup, InputLeftAddon, Select, SimpleGrid, Spinner, Text } from '@chakra-ui/react';

const PAGE_SIZE = 40;
const SORTS = [
  ['newest', 'Newest'],
  ['price_asc', 'Price (asc)'],
  ['price_desc', 'Price (desc)'],
  ['rating', 'Top rated'],
  ['name', 'Name (A–Z)'],
];

// Catalogue grid. All filters live in the URL so results can be shared,
// bookmarked and restored with the Back button. `category` fixes the category
// (used by the /:categorySlug pages).
const ProductGallery = ({ category: fixedCategory, title }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ products: [], totalPages: 0, totalProducts: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const page = Math.max(parseInt(searchParams.get('page'), 10) || 1, 1);
  const q = searchParams.get('q') || '';
  const category = fixedCategory || searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const inStock = searchParams.get('inStock') === 'true';

  const [priceDraft, setPriceDraft] = useState({ minPrice, maxPrice });
  useEffect(() => setPriceDraft({ minPrice, maxPrice }), [minPrice, maxPrice]);

  const updateParams = (changes, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value === false || value === undefined || value === null) next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage) next.delete('page');
    setSearchParams(next);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listProductsAPI({
        page,
        limit: PAGE_SIZE,
        q,
        category,
        sort,
        minPrice,
        maxPrice,
        inStock: inStock ? 'true' : '',
      });
      setData({ products: response?.products || [], totalPages: response?.totalPages || 0, totalProducts: response?.totalProducts || 0 });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, q, category, sort, minPrice, maxPrice, inStock]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (fixedCategory) return;
    listCategoriesAPI()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [fixedCategory]);

  const goToPage = (p) => {
    updateParams({ page: p > 1 ? p : '' }, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyPrice = (e) => {
    e.preventDefault();
    updateParams(priceDraft);
  };

  const heading = title || (q ? `Results for “${q}”` : category ? humanize(category) : 'Products Gallery');
  const hasFilters = Boolean(q || (!fixedCategory && category) || minPrice || maxPrice || inStock);

  return (
    <React.Fragment>
      <Heading as='h2' size='lg' p={4}>
        {heading}
      </Heading>
      <Box p={4} bg='#f5fafd' minHeight='100vh'>
        <Flex as='section' aria-label='Filters' gap={3} wrap='wrap' align='flex-end' mb={6}>
          {!fixedCategory && (
            <Box minW={{ base: '100%', sm: '200px' }}>
              <Text fontSize='sm' fontWeight={600} mb={1}>
                Category
              </Text>
              <Select bg='white' value={category} onChange={(e) => updateParams({ category: e.target.value })} aria-label='Category'>
                <option value=''>All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {humanize(c.slug)} ({c.count})
                  </option>
                ))}
              </Select>
            </Box>
          )}
          <Box minW={{ base: '100%', sm: '180px' }}>
            <Text fontSize='sm' fontWeight={600} mb={1}>
              Sort Products
            </Text>
            <Select bg='white' value={sort} onChange={(e) => updateParams({ sort: e.target.value === 'newest' ? '' : e.target.value })} aria-label='Sort products'>
              {SORTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Box>
          <HStack as='form' onSubmit={applyPrice} spacing={2} align='flex-end' w={{ base: '100%', sm: 'auto' }}>
            <InputGroup size='md' maxW='140px'>
              <InputLeftAddon>Min</InputLeftAddon>
              <Input
                bg='white'
                type='number'
                min={0}
                value={priceDraft.minPrice}
                onChange={(e) => setPriceDraft((d) => ({ ...d, minPrice: e.target.value }))}
                aria-label='Minimum price'
              />
            </InputGroup>
            <InputGroup size='md' maxW='140px'>
              <InputLeftAddon>Max</InputLeftAddon>
              <Input
                bg='white'
                type='number'
                min={0}
                value={priceDraft.maxPrice}
                onChange={(e) => setPriceDraft((d) => ({ ...d, maxPrice: e.target.value }))}
                aria-label='Maximum price'
              />
            </InputGroup>
            <Button type='submit' colorScheme='teal' variant='outline'>
              Apply
            </Button>
          </HStack>
          <Checkbox colorScheme='teal' isChecked={inStock} onChange={(e) => updateParams({ inStock: e.target.checked ? 'true' : '' })} pb={2}>
            In stock only
          </Checkbox>
          {hasFilters && (
            <Button variant='link' colorScheme='teal' pb={2} onClick={() => setSearchParams(new URLSearchParams())}>
              Clear filters
            </Button>
          )}
        </Flex>

        {loading ? (
          <Box textAlign='center' mt={5}>
            <Spinner size='xl' />
            <Text mt={4}>Loading products...</Text>
          </Box>
        ) : error ? (
          <Box textAlign='center' mt={5} role='alert'>
            <Text color='red.500'>Error fetching products: {getErrorMessage(error)}</Text>
            <Button mt={3} onClick={fetchProducts}>
              Try again
            </Button>
          </Box>
        ) : data.products.length === 0 ? (
          <Box textAlign='center' mt={10}>
            <Text fontSize='xl' fontWeight={600}>
              No products found
            </Text>
            <Text mt={2} color='gray.600'>
              Try a different search or remove some filters.
            </Text>
          </Box>
        ) : (
          <>
            <Text mb={4} color='gray.600' fontSize='sm'>
              {data.totalProducts.toLocaleString()} products
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} justifyItems='center' alignItems='center' gap={6}>
              {data.products.map((product) => (
                <ProductCard product={product} key={product._id} />
              ))}
            </SimpleGrid>
          </>
        )}

        {data.totalPages > 1 && !loading && !error && (
          <HStack spacing={4} mt={6} justify='center'>
            <Button onClick={() => goToPage(page - 1)} isDisabled={page <= 1}>
              Previous
            </Button>
            <Text>
              Page {page} of {data.totalPages}
            </Text>
            <Button onClick={() => goToPage(page + 1)} isDisabled={page >= data.totalPages}>
              Next
            </Button>
          </HStack>
        )}
      </Box>
    </React.Fragment>
  );
};

export default ProductGallery;
