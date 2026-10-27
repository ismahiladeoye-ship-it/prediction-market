import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Button, HStack, Spinner, Text } from '@chakra-ui/react';
import Navbar from '../components/Navbar';
import Announcement from '../components/Announcement';
import Footer from '../components/Footer';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { listOrdersAPI } from '../services/orders/orderService';
import { getErrorMessage } from '../api/client';
import { formatDate, formatPrice } from '../utils/format';
import ConfirmEmailNotice from '../components/auth/ConfirmEmailNotice';

const Account = () => {
  const user = useSelector((state) => state.user);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    listOrdersAPI(page)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)));
  }, [page]);

  return (
    <div>
      <Announcement />
      <Navbar />
      <Wrapper>
        <Title>MY ACCOUNT</Title>
        <ConfirmEmailNotice />
        <Profile>
          <p>
            <strong>{user.name}</strong>
          </p>
          <p>{user.email}</p>
          <p>@{user.username}</p>
        </Profile>

        <SectionTitle>Order history</SectionTitle>
        {error && (
          <Text color='red.500' role='alert'>
            {error}
          </Text>
        )}
        {!data && !error && (
          <Box textAlign='center' py={10}>
            <Spinner color='gray.900' />
          </Box>
        )}
        {data && data.orders.length === 0 && (
          <Empty>
            You have not placed any orders yet. <Link to='/products'>Start shopping</Link>
          </Empty>
        )}
        {data && data.orders.length > 0 && (
          <Orders>
            {data.orders.map((order) => (
              <OrderRow key={order.id} to={`/orders/${order.id}`}>
                <div>
                  <strong>{order.orderNumber}</strong>
                  <small>
                    {formatDate(order.createdAt)} · {order.items.reduce((n, i) => n + i.quantity, 0)} item(s)
                  </small>
                </div>
                <OrderStatusBadge status={order.status} />
                <span>{formatPrice(order.summary.total)}</span>
              </OrderRow>
            ))}
          </Orders>
        )}
        {data && data.totalPages > 1 && (
          <HStack spacing={4} mt={6} justify='center'>
            <Button onClick={() => setPage((p) => p - 1)} isDisabled={page <= 1}>
              Previous
            </Button>
            <Text>
              Page {page} of {data.totalPages}
            </Text>
            <Button onClick={() => setPage((p) => p + 1)} isDisabled={page >= data.totalPages}>
              Next
            </Button>
          </HStack>
        )}
      </Wrapper>
      <Footer />
    </div>
  );
};

export default Account;

const Wrapper = styled.div`
  padding: 20px;
  margin: 40px auto 60px;
  width: 100%;
  @media (min-width: 1024px) {
    width: 74%;
  }
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  line-height: 1;
  font-size: clamp(44px, 10vw, 72px);
  text-align: center;
  margin-bottom: 20px;
`;

const Profile = styled.div`
  border: 0.5px solid lightgray;
  border-radius: 10px;
  padding: 20px;
  line-height: 1.7;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin: 30px 0 12px;
`;

const Orders = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const OrderRow = styled(Link)`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  div {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  small {
    color: #777;
  }
  span:last-child {
    font-weight: 300;
    font-size: 18px;
    white-space: nowrap;
  }
  &:hover {
    background-color: #f5fafd;
  }
`;

const Empty = styled.p`
  font-weight: 300;
  font-size: 18px;
  a {
    color: var(--accent);
    text-decoration: underline;
  }
`;
