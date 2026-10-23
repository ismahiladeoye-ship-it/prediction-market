import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  HStack,
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
  useToast,
} from '@chakra-ui/react';
import { getAdminOrderAPI, listAdminOrdersAPI, updateOrderStatusAPI } from '../../services/admin/adminService';
import { getErrorMessage } from '../../api/client';
import { formatDate, formatPrice, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../../utils/format';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import OrderItems from '../../components/OrderItems';

const OrderDrawer = ({ orderId, onClose, onChanged }) => {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [tracking, setTracking] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    setData(null);
    setStatus('');
    setNote('');
    getAdminOrderAPI(orderId)
      .then((d) => {
        setData(d);
        setTracking(d.order.trackingNumber || '');
      })
      .catch((err) => toast({ title: getErrorMessage(err), status: 'error' }));
  }, [orderId, toast]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateOrderStatusAPI(orderId, { status, note: note || undefined, trackingNumber: tracking || undefined });
      setData(updated);
      setStatus('');
      setNote('');
      onChanged(updated.order);
      toast({ title: `Order marked ${ORDER_STATUS_LABELS[updated.order.status]}`, status: 'success', duration: 3000 });
    } catch (err) {
      toast({ title: 'Could not update order', description: getErrorMessage(err), status: 'error', duration: 5000, isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const order = data?.order;
  return (
    <Drawer isOpen={Boolean(orderId)} onClose={onClose} size='md'>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>{order ? `Order ${order.orderNumber}` : 'Order'}</DrawerHeader>
        <DrawerBody>
          {!order ? (
            <Spinner color='teal' />
          ) : (
            <Box fontSize='sm'>
              <HStack mb={3} wrap='wrap'>
                <OrderStatusBadge status={order.status} />
                <Text color='gray.600'>
                  Payment: {order.payment.status}
                  {order.payment.method ? ` · ${PAYMENT_METHOD_LABELS[order.payment.method] || order.payment.method}` : ''}
                </Text>
              </HStack>
              {order.attention && (
                <Alert status='warning' mb={3}>
                  <AlertIcon />
                  {order.attention}
                </Alert>
              )}
              <Text>
                <strong>{order.shippingAddress.fullName}</strong> · {order.email} · {order.shippingAddress.phone}
              </Text>
              <Text>
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}, {order.shippingAddress.city} {order.shippingAddress.postalCode},{' '}
                {order.shippingAddress.country}
              </Text>
              <Text mb={3}>Delivery: {order.deliveryMethod}</Text>
              <OrderItems items={order.items} />
              <Text mt={3} textAlign='right'>
                Subtotal {formatPrice(order.summary.subtotal)} · Tax {formatPrice(order.summary.tax)} · Delivery {formatPrice(order.summary.shipping)}
              </Text>
              <Text textAlign='right' fontSize='lg' fontWeight={600}>
                Total {formatPrice(order.summary.total)}
              </Text>

              <Box mt={6} p={4} bg='gray.50' borderRadius='md'>
                <Text fontWeight={600} mb={2}>
                  Update status
                </Text>
                {data.allowedTransitions.length === 0 ? (
                  <Text color='gray.600'>This order is final.</Text>
                ) : (
                  <>
                    <FormControl mb={2}>
                      <FormLabel fontSize='sm'>New status</FormLabel>
                      <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder='Choose…' bg='white'>
                        {data.allowedTransitions.map((s) => (
                          <option key={s} value={s}>
                            {ORDER_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    {status === 'shipped' && (
                      <FormControl mb={2}>
                        <FormLabel fontSize='sm'>Tracking number</FormLabel>
                        <Input value={tracking} onChange={(e) => setTracking(e.target.value)} bg='white' maxLength={100} />
                      </FormControl>
                    )}
                    <FormControl mb={3}>
                      <FormLabel fontSize='sm'>Note (optional)</FormLabel>
                      <Input value={note} onChange={(e) => setNote(e.target.value)} bg='white' maxLength={500} />
                    </FormControl>
                    {(status === 'cancelled' || status === 'refunded') && (
                      <Text fontSize='xs' color='gray.600' mb={2}>
                        Reserved stock is returned automatically. Refunds must also be issued in the payment provider&apos;s dashboard.
                      </Text>
                    )}
                    <Button colorScheme='teal' onClick={save} isDisabled={!status} isLoading={saving}>
                      Save
                    </Button>
                  </>
                )}
              </Box>

              <Text fontWeight={600} mt={6} mb={2}>
                History
              </Text>
              {order.statusHistory.map((h, i) => (
                <Text key={i} color='gray.700'>
                  {new Date(h.at).toLocaleString()} — {ORDER_STATUS_LABELS[h.status]}
                  {h.note ? ` (${h.note})` : ''}
                </Text>
              ))}
            </Box>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

const AdminOrders = () => {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState(params.get('q') || '');
  const page = Number(params.get('page')) || 1;
  const status = params.get('status') || '';
  const q = params.get('q') || '';

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await listAdminOrdersAPI({ page, limit: 20, status, q }));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [page, status, q]);

  useEffect(() => {
    load();
  }, [load]);

  const replace = (order) => setData((d) => ({ ...d, orders: d.orders.map((o) => (o.id === order.id ? order : o)) }));

  return (
    <>
      <Flex gap={3} wrap='wrap' mb={4}>
        <HStack
          as='form'
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: search.trim() });
          }}
        >
          <Input placeholder='Order number, email or name' value={search} onChange={(e) => setSearch(e.target.value)} maxW='280px' bg='white' />
          <Button type='submit' variant='outline' colorScheme='teal'>
            Search
          </Button>
        </HStack>
        <Select maxW='200px' value={status} onChange={(e) => update({ status: e.target.value })} aria-label='Status filter'>
          <option value=''>All statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Flex>
      {error && <Text color='red.500'>{error}</Text>}
      {!data && !error && <Spinner color='teal' />}
      {data && data.orders.length === 0 && <Text color='gray.600'>No orders found.</Text>}
      {data && data.orders.length > 0 && (
        <TableContainer bg='white' borderRadius='md' boxShadow='0 2px 10px rgba(0,0,0,0.06)'>
          <Table size='sm'>
            <Thead>
              <Tr>
                <Th>Order</Th>
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th isNumeric>Total</Th>
                <Th>Status</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {data.orders.map((o) => (
                <Tr key={o.id} bg={o.attention ? 'orange.50' : undefined}>
                  <Td fontWeight={600}>{o.orderNumber}</Td>
                  <Td>{formatDate(o.createdAt)}</Td>
                  <Td>
                    {o.shippingAddress.fullName}
                    <Text fontSize='xs' color='gray.500'>
                      {o.email}
                    </Text>
                  </Td>
                  <Td isNumeric>{formatPrice(o.summary.total)}</Td>
                  <Td>
                    <OrderStatusBadge status={o.status} />
                  </Td>
                  <Td>
                    <Button size='xs' onClick={() => setOpenId(o.id)}>
                      Manage
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
      {data && data.totalPages > 1 && (
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
      <OrderDrawer orderId={openId} onClose={() => setOpenId(null)} onChanged={replace} />
    </>
  );
};

export default AdminOrders;
