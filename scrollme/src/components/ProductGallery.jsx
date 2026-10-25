import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import ProductTile from './ProductTile';
import { listCategoriesAPI, listCollectionsAPI, listProductsAPI } from '../services/products/productService';
import { getErrorMessage } from '../api/client';
import { humanize } from '../utils/format';
import { Box, Button, Checkbox, Flex, HStack, Input, InputGroup, InputLeftAddon, Select, Spinner, Text } from '@chakra-ui/react';

const Title = styled.h1`
  font-family: var(--font-display);
  font-weight: 400;
  text-transform: uppercase;
  font-size: clamp(44px, 10vw, 80px);
  line-height: 1;
  padding: 32px 16px 8px;
  text-align: center;
  word-break: break-word;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 12px;
  @media (min-width: 900px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 32px 20px;
  }
`;

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
const ProductGallery = ({ category: fixedCategory, collection, title, notFound = false }) => {
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
      if (notFound) {
        setData({ products: [], totalPages: 0, totalProducts: 0 });
        return;
      }
      const response = await listProductsAPI({
        page,
        limit: PAGE_SIZE,
        q,
        collection,
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
  }, [page, q, collection, category, sort, minPrice, maxPrice, inStock, notFound]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Category choices: every category, or only those inside the current collection.
  useEffect(() => {
    if (fixedCategory) return;
    const load = collection
      ? listCollectionsAPI().then((all) => (all.find((c) => c.slug === collection)?.categories || []).map((slug) => ({ slug })))
      : listCategoriesAPI();
    load.then(setCategories).catch(() => setCategories([]));
  }, [fixedCategory, collection]);

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
      <Title>{heading}</Title>
      <Box px={{ base: 4, md: 8 }} py={4} minHeight='60vh'>
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
                    {humanize(c.slug)}
                    {c.count !== undefined ? ` (${c.count})` : ''}
                  </option>
                ))}
              </Select>
            </Box>
          )}
          <Box minW={{ base: '100%', sm: '180px' }}>
            <Text fontSize='sm' fontWeight={600} mb={1}>
              Sort Products
            </Text>
            <Select
              bg='white'
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value === 'newest' ? '' : e.target.value })}
              aria-label='Sort products'
            >
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
            <Button type='submit' colorScheme='brand' variant='outline'>
              Apply
            </Button>
          </HStack>
          <Checkbox
            colorScheme='brand'
            isChecked={inStock}
            onChange={(e) => updateParams({ inStock: e.target.checked ? 'true' : '' })}
            pb={2}
          >
            In stock only
          </Checkbox>
          {hasFilters && (
            <Button variant='link' colorScheme='brand' pb={2} onClick={() => setSearchParams(new URLSearchParams())}>
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
              {notFound ? 'This collection does not exist' : 'No products found'}
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
            <Grid>
              {data.products.map((product) => (
                <ProductTile product={product} key={product._id} />
              ))}
            </Grid>
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
