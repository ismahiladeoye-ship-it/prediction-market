import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import ProductTile from './ProductTile';
import { listCategoriesAPI, listProductsAPI } from '../services/products/productService';
import { getErrorMessage } from '../api/client';
import { categoriesOf, categoryTitle, countIn, departments, subcategoriesOf } from '../utils/taxonomy';
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

const Crumbs = styled.nav`
  padding: 24px 16px 0;
  text-align: center;
  font-size: 13px;
  color: var(--muted, #6b6b6b);
  ol {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li + li::before {
    content: '/';
    margin-right: 6px;
  }
  a:hover {
    text-decoration: underline;
  }
`;

// Quick links to the categories (or subcategories) of the page.
const Chips = styled.nav`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 16px 4px;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
  @media (min-width: 900px) {
    flex-wrap: wrap;
    justify-content: center;
    padding: 8px 32px 4px;
  }
  a {
    flex-shrink: 0;
    padding: 8px 16px;
    border: 1px solid var(--line);
    border-radius: 999px;
    font-size: 14px;
    white-space: nowrap;
  }
  a:hover {
    border-color: var(--ink);
  }
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

// A labelled filter dropdown; options are [value, label] pairs.
const FilterSelect = ({ label, value, onChange, allLabel, options }) => (
  <Box minW={{ base: '100%', sm: '200px' }}>
    <Text fontSize='sm' fontWeight={600} mb={1}>
      {label}
    </Text>
    <Select bg='white' value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value=''>{allLabel}</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </Select>
  </Box>
);

// Catalogue grid. All filters live in the URL so results can be shared,
// bookmarked and restored with the Back button. The department, category and
// subcategory props fix those filters (the /men/... and /women/... pages).
const ProductGallery = ({
  department: fixedDepartment,
  category: fixedCategory,
  subcategory: fixedSubcategory,
  title,
  breadcrumbs = [],
  links = [],
  notFound = false,
  notFoundText = 'This page does not exist',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ products: [], totalPages: 0, totalProducts: 0 });
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const page = Math.max(parseInt(searchParams.get('page'), 10) || 1, 1);
  const q = searchParams.get('q') || '';
  const department = fixedDepartment || searchParams.get('department') || '';
  const category = fixedCategory || searchParams.get('category') || '';
  const subcategory = fixedSubcategory || searchParams.get('subcategory') || '';
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
        department,
        category,
        subcategory,
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
  }, [page, q, department, category, subcategory, sort, minPrice, maxPrice, inStock, notFound]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Product counts for the filter choices.
  useEffect(() => {
    listCategoriesAPI()
      .then(setCounts)
      .catch(() => setCounts(null));
  }, []);

  const goToPage = (p) => {
    updateParams({ page: p > 1 ? p : '' }, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyPrice = (e) => {
    e.preventDefault();
    updateParams(priceDraft);
  };

  const withCount = (label, where) => (counts ? `${label} (${countIn(counts, { department, ...where })})` : label);
  const categoryOptions = categoriesOf(department).map((c) => [c.slug, withCount(c.title, { category: c.slug })]);
  const subcategoryOptions = category
    ? subcategoriesOf(department, category).map((sc) => [sc.slug, withCount(sc.title, { category, subcategory: sc.slug })])
    : [];

  const heading = title || (q ? `Results for “${q}”` : category ? categoryTitle(department, category) : 'Products Gallery');
  const hasFilters = Boolean(
    q ||
      (!fixedDepartment && department) ||
      (!fixedCategory && category) ||
      (!fixedSubcategory && subcategory) ||
      minPrice ||
      maxPrice ||
      inStock
  );

  return (
    <React.Fragment>
      {breadcrumbs.length > 0 && (
        <Crumbs aria-label='Breadcrumb'>
          <ol>
            {breadcrumbs.map((b, i) => (
              <li key={b.to || b.label}>
                {i < breadcrumbs.length - 1 ? <Link to={b.to}>{b.label}</Link> : <span aria-current='page'>{b.label}</span>}
              </li>
            ))}
          </ol>
        </Crumbs>
      )}
      <Title>{heading}</Title>
      {links.length > 0 && (
        <Chips aria-label={`${heading} categories`}>
          {links.map((l) => (
            <Link key={l.to} to={l.to}>
              {l.label}
            </Link>
          ))}
        </Chips>
      )}
      <Box px={{ base: 4, md: 8 }} py={4} minHeight='60vh'>
        <Flex as='section' aria-label='Filters' gap={3} wrap='wrap' align='flex-end' mb={6}>
          {!fixedDepartment && (
            <FilterSelect
              label='Department'
              allLabel='All departments'
              value={department}
              onChange={(v) => updateParams({ department: v })}
              options={departments.map((d) => [d.slug, d.title])}
            />
          )}
          {!fixedCategory && (
            <FilterSelect
              label='Category'
              allLabel='All categories'
              value={category}
              onChange={(v) => updateParams({ category: v, subcategory: '' })}
              options={categoryOptions}
            />
          )}
          {!fixedSubcategory && category && subcategoryOptions.length > 0 && (
            <FilterSelect
              label='Subcategory'
              allLabel={`All ${categoryTitle(department, category).toLowerCase()}`}
              value={subcategory}
              onChange={(v) => updateParams({ subcategory: v })}
              options={subcategoryOptions}
            />
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
              {notFound ? notFoundText : 'No products found'}
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
