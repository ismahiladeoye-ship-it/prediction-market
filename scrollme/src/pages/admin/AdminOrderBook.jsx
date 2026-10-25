import { useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  Link,
  Select,
  SimpleGrid,
  Spinner,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { getOrderBookAPI } from '../../services/admin/adminService';
import { getErrorMessage } from '../../api/client';
import { formatPrice } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { imageSrc, onImageError } from '../../utils/imageFallback';

const MONTHS_LISTED = 24;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// "2026-10" in UK time, the same months the API groups orders by.
const currentUkMonth = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit' }).formatToParts(
    new Date()
  );
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}`;
};

const shiftMonth = (month, delta) => {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
};

// e.g. October 2026
const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

// e.g. S ×1 · M ×2
const sizesText = (sizes) => sizes.map((s) => `${s.size} ×${s.quantity}`).join(' · ');

const Card = ({ label, value, help, to }) => (
  <Box
    as={to ? RouterLink : 'div'}
    to={to}
    p={5}
    bg='white'
    borderRadius='lg'
    boxShadow='0 2px 10px rgba(0,0,0,0.08)'
    _hover={to ? { boxShadow: '0 2px 14px rgba(0,0,0,0.18)' } : undefined}
  >
    <Stat>
      <StatLabel color='gray.600'>{label}</StatLabel>
      <StatNumber color='gray.900' fontSize={{ base: 'xl', md: '2xl' }}>
        {value}
      </StatNumber>
      {help && (
        <StatHelpText mb={0} color='gray.600'>
          {help}
        </StatHelpText>
      )}
    </Stat>
  </Box>
);

const StockCell = ({ product, threshold }) => {
  if (product.stock === null) return <Text color='gray.500'>—</Text>;
  return (
    <HStack justify='flex-end' spacing={2}>
      {!product.isActive && <Badge>Hidden</Badge>}
      {product.stock <= 0 && <Badge colorScheme='red'>Sold out</Badge>}
      {product.stock > 0 && product.stock <= threshold && <Badge colorScheme='orange'>Low · {product.stock}</Badge>}
      {product.stock > threshold && <Text>{product.stock}</Text>}
    </HStack>
  );
};

const Thumb = ({ product }) => (
  <Image src={imageSrc(product.imageUrl)} onError={onImageError} alt='' boxSize='44px' objectFit='cover' borderRadius='md' flexShrink={0} />
);

const ProductName = ({ product }) => (
  <>
    <Link as={RouterLink} to={`/admin/products?q=${encodeURIComponent(product.sku || product.name)}`} fontWeight={600}>
      {product.name}
    </Link>
    <Text fontSize='xs' color='gray.500'>
      {[product.sku, product.brand].filter(Boolean).join(' · ')}
    </Text>
  </>
);

const Sizes = ({ sizes }) =>
  sizes.length ? (
    sizesText(sizes)
  ) : (
    <Text as='span' color='gray.500'>
      One size
    </Text>
  );

// What sold each month (paid orders), by product and size, and the stock left.
const AdminOrderBook = () => {
  const [params, setParams] = useSearchParams();
  const thisMonth = currentUkMonth();
  const requested = params.get('month') || '';
  const month = MONTH_RE.test(requested) && requested <= thisMonth ? requested : thisMonth;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let current = true;
    setData(null);
    setError(null);
    getOrderBookAPI(month)
      .then((d) => current && setData(d))
      .catch((err) => current && setError(getErrorMessage(err)));
    return () => {
      current = false;
    };
  }, [month]);

  const choose = (m) => setParams(m === thisMonth ? {} : { month: m });
  const options = Array.from({ length: MONTHS_LISTED }, (_, i) => shiftMonth(thisMonth, -i));
  if (!options.includes(month)) options.push(month);

  const download = () => {
    const { summary, products, currency } = data;
    downloadCsv(`order-book-${month}.csv`, [
      ['Product', 'SKU', 'Brand', 'Category', 'Sizes sold', 'Quantity sold', `Sales (${currency.toUpperCase()})`, 'In stock now'],
      ...products.map((p) => [p.name, p.sku, p.brand, p.category, sizesText(p.sizes), p.quantity, p.sales, p.stock ?? '']),
      [],
      ['Total products', '', '', '', '', summary.itemsSold, summary.productSales, ''],
      ['Delivery charged', '', '', '', '', '', summary.delivery, ''],
      ['Orders', '', '', '', '', summary.orders, summary.total, ''],
    ]);
  };

  const maxMonthTotal = data ? Math.max(...data.months.map((m) => m.total), 0) : 0;
  const s = data?.summary;

  return (
    <Box>
      <Text color='gray.600' mb={4} maxW='720px'>
        What sold each month, by product and size, from paid orders (UK time), and how much stock is left now.
      </Text>
      <Flex gap={3} wrap='wrap' align='center' mb={6}>
        <Button variant='outline' onClick={() => choose(shiftMonth(month, -1))}>
          ‹ Previous
        </Button>
        <Select maxW='220px' value={month} onChange={(e) => choose(e.target.value)} aria-label='Month' bg='white'>
          {options.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </Select>
        <Button variant='outline' onClick={() => choose(shiftMonth(month, 1))} isDisabled={month >= thisMonth}>
          Next ›
        </Button>
        <Button colorScheme='brand' onClick={download} isDisabled={!data?.products.length} ml={{ md: 'auto' }}>
          Download CSV
        </Button>
      </Flex>

      {error && <Text color='red.500'>{error}</Text>}
      {!data && !error && <Spinner color='gray.900' />}
      {data && (
        <>
          <SimpleGrid columns={{ base: 2, lg: 4 }} spacing={4} mb={3}>
            <Card label='Orders' value={s.orders} />
            <Card label='Items sold' value={s.itemsSold} />
            <Card
              label='Sales'
              value={formatPrice(s.total)}
              help={`Products ${formatPrice(s.productSales)} + delivery ${formatPrice(s.delivery)}${s.tax ? ` + tax ${formatPrice(s.tax)}` : ''}`}
            />
            <Card label='Average order' value={formatPrice(s.averageOrder)} />
          </SimpleGrid>
          {s.cancelledOrRefunded.orders > 0 && (
            <Text fontSize='sm' color='gray.600' mb={3}>
              {s.cancelledOrRefunded.orders} order(s) paid this month ({formatPrice(s.cancelledOrRefunded.total)}) were later cancelled or
              refunded and are not counted.
            </Text>
          )}

          <Heading as='h2' size='md' mt={8} mb={3}>
            What sold in {monthLabel(month)}
          </Heading>
          {data.products.length === 0 ? (
            <Text color='gray.600'>No paid orders in {monthLabel(month)}.</Text>
          ) : (
            <>
              {/* Phones: one card per product, so the numbers stay on screen. */}
              <Box
                as='ul'
                aria-label='Products sold'
                display={{ base: 'block', md: 'none' }}
                bg='white'
                borderRadius='md'
                boxShadow='0 2px 10px rgba(0,0,0,0.06)'
              >
                {data.products.map((p) => (
                  <Box as='li' key={p.productId} listStyleType='none' p={3} borderBottom='1px solid' borderColor='gray.100'>
                    <HStack align='start' spacing={3}>
                      <Thumb product={p} />
                      <Box flex='1' minW={0}>
                        <ProductName product={p} />
                        <Text fontSize='sm' mt={1}>
                          <Sizes sizes={p.sizes} />
                        </Text>
                        <Flex justify='space-between' align='center' mt={2} fontSize='sm' gap={2} wrap='wrap'>
                          <Text>
                            <b>{p.quantity}</b> sold · {formatPrice(p.sales)}
                          </Text>
                          <HStack spacing={2}>
                            <Text color='gray.600'>In stock</Text>
                            <StockCell product={p} threshold={data.stock.lowStockThreshold} />
                          </HStack>
                        </Flex>
                      </Box>
                    </HStack>
                  </Box>
                ))}
              </Box>
              <TableContainer display={{ base: 'none', md: 'block' }} bg='white' borderRadius='md' boxShadow='0 2px 10px rgba(0,0,0,0.06)'>
                <Table size='sm' aria-label='Products sold'>
                  <Thead>
                    <Tr>
                      <Th>Product</Th>
                      <Th>Sizes</Th>
                      <Th isNumeric>Sold</Th>
                      <Th isNumeric>Sales</Th>
                      <Th isNumeric>In stock now</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.products.map((p) => (
                      <Tr key={p.productId}>
                        <Td>
                          <HStack spacing={3}>
                            <Thumb product={p} />
                            <Box whiteSpace='normal' minW='180px'>
                              <ProductName product={p} />
                            </Box>
                          </HStack>
                        </Td>
                        <Td whiteSpace='normal'>
                          <Sizes sizes={p.sizes} />
                        </Td>
                        <Td isNumeric fontWeight={600}>
                          {p.quantity}
                        </Td>
                        <Td isNumeric>{formatPrice(p.sales)}</Td>
                        <Td isNumeric>
                          <StockCell product={p} threshold={data.stock.lowStockThreshold} />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </>
          )}

          <Heading as='h2' size='md' mt={8} mb={3}>
            Stock on hand now
          </Heading>
          <SimpleGrid columns={{ base: 2, lg: 4 }} spacing={4}>
            <Card label='Items in stock' value={data.stock.units.toLocaleString()} />
            <Card label='Products on sale' value={data.stock.products.toLocaleString()} />
            <Card label={`Low stock (≤ ${data.stock.lowStockThreshold})`} value={data.stock.lowStock} to='/admin/products?lowStock=true' />
            <Card label='Sold out' value={data.stock.outOfStock} />
          </SimpleGrid>

          <Heading as='h2' size='md' mt={8} mb={3}>
            Month by month
          </Heading>
          <TableContainer bg='white' borderRadius='md' boxShadow='0 2px 10px rgba(0,0,0,0.06)'>
            <Table size='sm' aria-label='Sales by month'>
              <Thead>
                <Tr>
                  <Th>Month</Th>
                  <Th isNumeric>Orders</Th>
                  <Th isNumeric display={{ base: 'none', md: 'table-cell' }}>
                    Items
                  </Th>
                  <Th isNumeric>Sales</Th>
                  <Th w='30%' display={{ base: 'none', md: 'table-cell' }} />
                </Tr>
              </Thead>
              <Tbody>
                {data.months.map((m) => (
                  <Tr key={m.month} bg={m.month === month ? 'gray.50' : undefined}>
                    <Td>
                      <Button variant='link' color='gray.900' fontWeight={m.month === month ? 700 : 400} onClick={() => choose(m.month)}>
                        {monthLabel(m.month)}
                      </Button>
                    </Td>
                    <Td isNumeric>{m.orders}</Td>
                    <Td isNumeric display={{ base: 'none', md: 'table-cell' }}>
                      {m.itemsSold}
                    </Td>
                    <Td isNumeric>{formatPrice(m.total)}</Td>
                    <Td display={{ base: 'none', md: 'table-cell' }}>
                      <Box h='8px' bg='gray.100' borderRadius='full' aria-hidden='true'>
                        <Box h='8px' bg='gray.800' borderRadius='full' w={maxMonthTotal ? `${(m.total / maxMonthTotal) * 100}%` : 0} />
                      </Box>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default AdminOrderBook;
