import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Box, Button, Flex, Heading, HStack, SimpleGrid, Spinner, Text, useToast } from '@chakra-ui/react';
import { listMessagesAPI, updateMessageAPI } from '../../services/admin/adminService';
import { getErrorMessage } from '../../api/client';
import { formatDate } from '../../utils/format';
import { useShopDetails } from '../../context/ShopDetails';

const FILTERS = [
  { value: 'new', label: 'New' },
  { value: 'replied', label: 'Replied' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];
const STATUS_COLORS = { new: 'orange', replied: 'green', closed: 'gray' };

const Detail = ({ label, value }) =>
  value ? (
    <Box>
      <Text fontSize='xs' color='gray.500' textTransform='uppercase' letterSpacing='0.05em'>
        {label}
      </Text>
      <Text>{value}</Text>
    </Box>
  ) : null;

const MessageCard = ({ msg, shopName, onStatus, busy }) => {
  const sourcing = msg.kind === 'sourcing';
  const subject = sourcing ? `Re: your request for ${msg.item}` : `Re: your message to ${shopName}`;
  return (
    <Box as='article' aria-label={`Message from ${msg.name}`} bg='white' borderRadius='lg' boxShadow='0 2px 10px rgba(0,0,0,0.08)' p={5}>
      <Flex justify='space-between' gap={3} wrap='wrap' mb={3}>
        <Box>
          <HStack spacing={2} mb={1}>
            <Badge colorScheme={sourcing ? 'purple' : 'blue'}>{sourcing ? 'Sourcing request' : 'Question'}</Badge>
            <Badge colorScheme={STATUS_COLORS[msg.status]}>{msg.status}</Badge>
          </HStack>
          <Text fontWeight={700}>{msg.name}</Text>
          <Text fontSize='sm' color='gray.600'>
            {msg.email}
            {msg.phone && ` · ${msg.phone}`}
          </Text>
        </Box>
        <Text fontSize='sm' color='gray.500'>
          {formatDate(msg.createdAt)}
        </Text>
      </Flex>
      {(msg.item || msg.size || msg.budget || msg.orderNumber) && (
        <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3} mb={3}>
          <Detail label='Looking for' value={msg.item} />
          <Detail label='Size' value={msg.size} />
          <Detail label='Budget' value={msg.budget} />
          <Detail label='Order' value={msg.orderNumber} />
        </SimpleGrid>
      )}
      <Text whiteSpace='pre-wrap' mb={4}>
        {msg.message}
      </Text>
      <Flex gap={2} wrap='wrap'>
        <Button
          as='a'
          href={`mailto:${msg.email}?subject=${encodeURIComponent(subject)}`}
          size='sm'
          colorScheme='brand'
          onClick={() => msg.status === 'new' && onStatus(msg, 'replied')}
        >
          Reply by email
        </Button>
        {msg.status !== 'replied' && (
          <Button size='sm' variant='outline' onClick={() => onStatus(msg, 'replied')} isDisabled={busy}>
            Mark replied
          </Button>
        )}
        {msg.status !== 'closed' && (
          <Button size='sm' variant='outline' onClick={() => onStatus(msg, 'closed')} isDisabled={busy}>
            Close
          </Button>
        )}
        {msg.status !== 'new' && (
          <Button size='sm' variant='ghost' onClick={() => onStatus(msg, 'new')} isDisabled={busy}>
            Mark as new
          </Button>
        )}
      </Flex>
    </Box>
  );
};

// Admin → Messages: questions and sourcing requests from the contact page.
const AdminMessages = () => {
  const toast = useToast();
  const shop = useShopDetails();
  const [params, setParams] = useSearchParams();
  const status = FILTERS.some((f) => f.value === params.get('status')) ? params.get('status') : 'new';
  const page = Number(params.get('page')) || 1;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await listMessagesAPI({ status, page }));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (msg, next) => {
    setBusy(true);
    try {
      await updateMessageAPI(msg.id, next);
      await load();
    } catch (err) {
      toast({ title: getErrorMessage(err), status: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box maxW='900px'>
      <Heading as='h2' size='md' mb={2}>
        Messages
      </Heading>
      <Text color='gray.600' mb={4}>
        Questions and sourcing requests from the contact page. Each one is also emailed to you; replying to that email answers the customer.
      </Text>
      <HStack spacing={2} mb={5} flexWrap='wrap' role='tablist' aria-label='Message status'>
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size='sm'
            role='tab'
            aria-selected={status === f.value}
            variant={status === f.value ? 'solid' : 'outline'}
            colorScheme='brand'
            onClick={() => setParams(f.value === 'new' ? {} : { status: f.value })}
          >
            {f.label}
            {data && f.value !== 'all' ? ` (${data.counts[f.value]})` : ''}
          </Button>
        ))}
      </HStack>
      {error && <Text color='red.500'>{error}</Text>}
      {!data && !error && <Spinner color='gray.900' />}
      {data && data.messages.length === 0 && <Text color='gray.600'>{status === 'new' ? 'No new messages.' : 'No messages here.'}</Text>}
      {data && (
        <Box display='grid' gap={4}>
          {data.messages.map((msg) => (
            <MessageCard key={msg.id} msg={msg} shopName={shop.name} onStatus={changeStatus} busy={busy} />
          ))}
        </Box>
      )}
      {data && data.totalPages > 1 && (
        <HStack justify='center' mt={4}>
          <Button size='sm' isDisabled={page <= 1} onClick={() => setParams({ status, page: String(page - 1) })}>
            Previous
          </Button>
          <Text>
            Page {page} of {data.totalPages}
          </Text>
          <Button size='sm' isDisabled={page >= data.totalPages} onClick={() => setParams({ status, page: String(page + 1) })}>
            Next
          </Button>
        </HStack>
      )}
    </Box>
  );
};

export default AdminMessages;
