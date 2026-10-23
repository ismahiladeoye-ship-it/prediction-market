import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Image,
  Input,
  Select,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { listAdminProductsAPI, adjustStockAPI, deactivateProductAPI, updateProductAPI } from '../../services/admin/adminService';
import { getErrorMessage } from '../../api/client';
import { formatPrice, humanize } from '../../utils/format';
import { imageSrc, onImageError } from '../../utils/imageFallback';
import ProductFormModal from './ProductFormModal';

const AdminProducts = () => {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const modal = useDisclosure();
  const [editing, setEditing] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(params.get('q') || '');

  const page = Number(params.get('page')) || 1;
  const q = params.get('q') || '';
  const visibility = params.get('active') || '';
  const lowStock = params.get('lowStock') || '';

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await listAdminProductsAPI({ page, limit: 20, q, active: visibility, lowStock, sort: 'newest' }));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [page, q, visibility, lowStock]);

  useEffect(() => {
    load();
  }, [load]);

  const replace = (product) => setData((d) => ({ ...d, products: d.products.map((p) => (p._id === product._id ? product : p)) }));

  const act = async (fn, success) => {
    try {
      replace(await fn());
      toast({ title: success, status: 'success', duration: 2500 });
    } catch (err) {
      toast({ title: 'Action failed', description: getErrorMessage(err), status: 'error', duration: 5000, isClosable: true });
    }
  };

  const changeStock = (product) => {
    const input = window.prompt(`Adjust stock for "${product.name}" (current ${product.stock}). Use +10 to add or -3 to remove:`);
    if (!input) return;
    const delta = parseInt(input, 10);
    if (!Number.isInteger(delta) || delta === 0) {
      toast({ title: 'Enter a whole number such as +10 or -3', status: 'warning', duration: 3000 });
      return;
    }
    act(() => adjustStockAPI(product._id, delta), 'Stock updated');
  };

  const openEditor = (product) => {
    setEditing(product);
    modal.onOpen();
  };

  return (
    <>
      <Flex gap={3} wrap='wrap' mb={4} align='center'>
        <HStack
          as='form'
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: search.trim() });
          }}
        >
          <Input placeholder='Search name, brand, category' value={search} onChange={(e) => setSearch(e.target.value)} maxW='280px' bg='white' />
          <Button type='submit' variant='outline' colorScheme='teal'>
            Search
          </Button>
        </HStack>
        <Select maxW='180px' value={visibility} onChange={(e) => update({ active: e.target.value })} aria-label='Visibility'>
          <option value=''>All products</option>
          <option value='true'>Visible</option>
          <option value='false'>Hidden</option>
        </Select>
        <Select maxW='180px' value={lowStock} onChange={(e) => update({ lowStock: e.target.value })} aria-label='Stock level'>
          <option value=''>Any stock</option>
          <option value='true'>Low stock (≤ 5)</option>
        </Select>
        <Button colorScheme='teal' ml={{ md: 'auto' }} onClick={() => openEditor(null)}>
          New product
        </Button>
      </Flex>

      {error && <Text color='red.500'>{error}</Text>}
      {!data && !error && <Spinner color='teal' />}
      {data && (
        <>
          <Text fontSize='sm' color='gray.600' mb={2}>
            {data.totalProducts.toLocaleString()} products
          </Text>
          <TableContainer bg='white' borderRadius='md' boxShadow='0 2px 10px rgba(0,0,0,0.06)'>
            <Table size='sm'>
              <Thead>
                <Tr>
                  <Th>Product</Th>
                  <Th>Category</Th>
                  <Th isNumeric>Price</Th>
                  <Th isNumeric>Stock</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.products.map((p) => (
                  <Tr key={p._id}>
                    <Td>
                      <HStack>
                        <Image src={imageSrc(p.imageUrl)} onError={onImageError} alt='' boxSize='40px' objectFit='cover' />
                        <Box maxW='260px' whiteSpace='normal'>
                          <Text fontWeight={600} noOfLines={2}>
                            {p.name}
                          </Text>
                          <Text fontSize='xs' color='gray.500'>
                            {p.brand}
                          </Text>
                        </Box>
                      </HStack>
                    </Td>
                    <Td>{humanize(p.category)}</Td>
                    <Td isNumeric>{formatPrice(p.price)}</Td>
                    <Td isNumeric>
                      <Text as='span' color={p.stock <= 5 ? 'red.500' : undefined} fontWeight={p.stock <= 5 ? 700 : undefined}>
                        {p.stock}
                      </Text>
                    </Td>
                    <Td>{p.isActive ? <Badge colorScheme='teal'>Visible</Badge> : <Badge>Hidden</Badge>}</Td>
                    <Td>
                      <HStack spacing={1}>
                        <Button size='xs' onClick={() => openEditor(p)}>
                          Edit
                        </Button>
                        <Button size='xs' onClick={() => changeStock(p)}>
                          Stock
                        </Button>
                        {p.isActive ? (
                          <Button size='xs' colorScheme='red' variant='outline' onClick={() => act(() => deactivateProductAPI(p._id), 'Product hidden')}>
                            Hide
                          </Button>
                        ) : (
                          <Button size='xs' colorScheme='teal' variant='outline' onClick={() => act(() => updateProductAPI(p._id, { isActive: true }), 'Product visible')}>
                            Show
                          </Button>
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
          {data.totalPages > 1 && (
            <HStack justify='center' mt={4}>
              <Button size='sm' isDisabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                Previous
              </Button>
              <Text>
                Page {page} of {data.totalPages}
              </Text>
              <Button size='sm' isDisabled={page >= data.totalPages} onClick={() => update({ page: String(page + 1) })}>
                Next
              </Button>
            </HStack>
          )}
        </>
      )}
      <ProductFormModal isOpen={modal.isOpen} onClose={modal.onClose} product={editing} onSaved={(saved) => (editing ? replace(saved) : load())} />
    </>
  );
};

export default AdminProducts;
