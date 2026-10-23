import styled from 'styled-components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Spinner, Text } from '@chakra-ui/react';
import { HiOutlineArrowRight, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';
import ProductTile from './ProductTile';
import { listProductsAPI } from '../services/products/productService';
import { getErrorMessage } from '../api/client';

const DESKTOP = '@media (min-width: 900px)';

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 64px 0 20px;
  padding: 0 16px;
  ${DESKTOP} {
    padding: 0 32px;
  }
  h2 {
    font-family: var(--font-display);
    font-weight: 400;
    text-transform: uppercase;
    font-size: clamp(34px, 8vw, 48px);
    line-height: 1;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ViewAll = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--soft);
  }
`;

const ScrollButton = styled.button`
  display: none;
  ${DESKTOP} {
    display: inline-flex;
  }
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: white;
  cursor: pointer;
  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;

const Track = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc((100% - 12px) / 2);
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding: 0 16px;
  scroll-padding: 0 16px;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
  > * {
    scroll-snap-align: start;
  }
  ${DESKTOP} {
    grid-auto-columns: calc((100% - 80px) / 5);
    gap: 20px;
    padding: 0 32px;
    scroll-padding: 0 32px;
  }
`;

const Progress = styled.div`
  position: relative;
  height: 2px;
  margin: 22px 16px 0;
  background: var(--line);
  ${DESKTOP} {
    margin: 26px 32px 0;
  }
  span {
    position: absolute;
    top: -1px;
    height: 4px;
    border-radius: 2px;
    background: var(--ink);
    transition: left 0.15s linear;
  }
`;

// "Top rated": a swipeable row of the best-reviewed products in stock.
const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bar, setBar] = useState({ left: 0, width: 1 });
  const track = useRef(null);

  const fetchPopularProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listProductsAPI({ page: 1, limit: 24, sort: 'rating', inStock: 'true' });
      // The catalogue has some duplicate listings; show each item once.
      const seen = new Set();
      const unique = (response?.products || []).filter((p) => {
        const key = `${p.name}|${p.imageUrl}`;
        return !seen.has(key) && seen.add(key);
      });
      setProducts(unique.slice(0, 12));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopularProducts();
  }, []);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el || !el.scrollWidth) return;
    setBar({ left: el.scrollLeft / el.scrollWidth, width: el.clientWidth / el.scrollWidth });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, products]);

  const scrollBy = (dir) => track.current?.scrollBy({ left: dir * track.current.clientWidth, behavior: 'smooth' });
  const atStart = bar.left <= 0.001;
  const atEnd = bar.left + bar.width >= 0.999;

  return (
    <section aria-labelledby='top-rated'>
      <Head>
        <h2 id='top-rated'>Top rated</h2>
        <Actions>
          <ScrollButton type='button' aria-label='Scroll products back' onClick={() => scrollBy(-1)} disabled={atStart}>
            <HiOutlineChevronLeft size={18} />
          </ScrollButton>
          <ScrollButton type='button' aria-label='Scroll products forward' onClick={() => scrollBy(1)} disabled={atEnd}>
            <HiOutlineChevronRight size={18} />
          </ScrollButton>
          <ViewAll to='/products?sort=rating'>
            View all
            <span aria-hidden='true'>
              <HiOutlineArrowRight size={14} />
            </span>
          </ViewAll>
        </Actions>
      </Head>
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
          <Track ref={track} onScroll={measure}>
            {products.map((product) => (
              <ProductTile product={product} key={product._id} />
            ))}
          </Track>
          {bar.width < 1 && (
            <Progress aria-hidden='true'>
              <span style={{ left: `${bar.left * 100}%`, width: `${bar.width * 100}%` }} />
            </Progress>
          )}
        </>
      )}
    </section>
  );
};

export default Products;
