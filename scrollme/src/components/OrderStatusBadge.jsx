import { Badge } from '@chakra-ui/react';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../utils/format';

const OrderStatusBadge = ({ status }) => (
  <Badge colorScheme={ORDER_STATUS_COLORS[status] || 'gray'} px={2} py={1} borderRadius='md' data-testid='order-status'>
    {ORDER_STATUS_LABELS[status] || status}
  </Badge>
);

export default OrderStatusBadge;
