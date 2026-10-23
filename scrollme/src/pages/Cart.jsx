import styled from 'styled-components';
import Navbar from '../components/Navbar';
import Announcement from '../components/Announcement';
import Footer from '../components/Footer';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { Text } from '../styles/Text';
import { LeftDivider } from '../styles/Divider';
import { useDispatch } from 'react-redux';
import { Box, Spinner, useToast } from '@chakra-ui/react';
import { deleteCartItem, updateCartItem, viewCart } from '../store/slices/cartSlice';
import { toggleWishlist } from '../store/slices/wishlistSlice';
import { formatPrice } from '../utils/format';
import { imageSrc, onImageError } from '../utils/imageFallback';

const Container = styled.div``;

const Wrapper = styled.div`
  padding: 20px;
  margin-top: 100px;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  line-height: 1;
  font-size: clamp(44px, 10vw, 72px);
  text-align: center;
`;

const Top = styled.div`
  width: 76%;
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
`;

const TopButton = styled.button`
  padding: 12px 22px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.08em;
  cursor: pointer;
  border: 1.5px solid var(--ink);
  background-color: ${(props) => (props.type === 'filled' ? 'var(--ink)' : 'transparent')};
  color: ${(props) => (props.type === 'filled' ? 'white' : 'var(--ink)')};
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TopTexts = styled.div`
  @media (max-width: 768px) {
    display: none;
  }
`;
const TopText = styled.span`
  text-decoration: underline;
  cursor: pointer;
  margin: 0px 10px;
`;

const Bottom = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-inline: auto;
  gap: 20px;

  @media (min-width: 768px) {
    flex-direction: row;
    width: 90%;
  }

  @media (min-width: 1024px) {
    width: 74%;
  }
`;

const Info = styled.div`
  flex: 3;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 14px;
`;

const Product = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--line);
  padding: 12px 0;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const ProductDetail = styled.div`
  flex: 2;
  display: flex;
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const Image = styled.img`
  width: 150px;
  border-radius: 12px;
  background: var(--soft);
  @media (max-width: 768px) {
    width: 150px;
  }
`;

const Details = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 3px;
  @media (max-width: 768px) {
    align-items: center;
  }
`;

const ProductName = styled.p`
  font-size: 14px;
  font-weight: 400;
  margin-block-end: 20px;
`;
const ProductBrand = styled.p`
  font-size: 16px;
  font-weight: 600;
`;

const PriceDetail = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;

  @media (max-width: 768px) {
    margin-top: 10px;
  }
`;

const ProductPrice = styled.div`
  font-size: 20px;
  font-weight: 700;
`;

const Hr = styled.hr`
  background-color: #eee;
  border: none;
  height: 1px;
  margin: 10px 0;
`;

const Summary = styled.div`
  flex: 2;
  border: 0.5px solid lightgray;
  border-radius: 10px;
  padding: 20px;
  min-height: 50vh;
  height: fit-content;
  margin-top: 20px;

  @media (max-width: 768px) {
    width: 100%;
    margin-top: 40px;
  }
`;

const SummaryTitle = styled.h2`
  font-family: var(--font-display);
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  line-height: 1;
  font-size: 36px;
`;

const SummaryItem = styled.div`
  margin: 30px 0px;
  display: flex;
  justify-content: space-between;
  font-weight: ${(props) => props.type === 'total' && '500'};
  font-size: ${(props) => props.type === 'total' && '24px'};
`;

const SummaryItemText = styled.span``;

const DeliveryNote = styled.p`
  margin: -18px 0 24px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--soft);
  font-size: 14px;
`;

const SummaryItemPrice = styled.span``;

const Button = styled.button`
  width: 100%;
  height: 52px;
  border-radius: 999px;
  letter-spacing: 0.08em;
  cursor: pointer;
  background-color: black;
  color: white;
  font-weight: 600;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.p`
  width: 100%;
  padding: 40px 0;
  text-align: center;
  font-size: 18px;
  font-weight: 300;
  a {
    color: var(--accent);
    text-decoration: underline;
  }
`;

const IssueBox = styled.div`
  width: 100%;
  padding: 10px 14px;
  border-left: 3px solid red;
  background-color: #fff5f5;
  font-size: 14px;
`;

const LineTotal = styled.span`
  font-size: 14px;
  color: #777;
`;

const Cart = () => {
  const { items: cartItems, summary, issues, status, freeShippingThreshold } = useSelector((state) => state.cart);
  // How much more to spend for free standard delivery (the API decides the actual charge).
  const toFreeDelivery = freeShippingThreshold && summary.shipping > 0 ? freeShippingThreshold - summary.subtotal : 0;
  const wishListItems = useSelector((state) => state.wishlist?.items);
  const toast = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isEmpty = cartItems.length === 0;
  const canCheckout = !isEmpty && issues.length === 0;

  // Always show the server's current prices and stock.
  useEffect(() => {
    dispatch(viewCart());
  }, [dispatch]);

  const handleQuantityChange = (item, quantity) => {
    dispatch(updateCartItem({ productId: item.productId, size: item.size, quantity }))
      .unwrap()
      .then(() => {
        toast({
          position: 'bottom-right',
          render: () => (
            <Box color='white' p={1} bg='gray.900' borderRadius='xs'>
              Quantity updated!
            </Box>
          ),
        });
      })
      .catch((error) => {
        toast({
          position: 'bottom-right',
          status: 'error',
          render: () => (
            <Box color='white' p={3} bg='red.500'>
              {typeof error === 'string' ? error : 'Error while updating quantity!'}
            </Box>
          ),
        });
        dispatch(viewCart());
      });
  };

  const handleRemoveFromCart = (item, { silent = false } = {}) =>
    dispatch(deleteCartItem({ productId: item.productId, size: item.size }))
      .unwrap()
      .then(() => {
        if (silent) return;
        toast({
          title: 'Product removed from cart.',
          description: 'The item has been successfully removed from your cart.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      })
      .catch(() => {
        toast({
          title: 'Error removing product.',
          description: 'There was an issue removing the item from your cart.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      });

  // "Save for Later" moves the item to the wishlist.
  const handleSaveForLater = async (item) => {
    if (!wishListItems.some((w) => w._id === item.productId)) {
      await dispatch(
        toggleWishlist({ _id: item.productId, name: item.name, imageUrl: item.imageUrl, price: item.price, category: item.category })
      );
    }
    await handleRemoveFromCart(item, { silent: true });
    toast({
      title: 'Saved for later.',
      description: 'The item was moved to your wishlist.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const goToCheckout = () => navigate('/checkout');

  return (
    <Container>
      <Announcement />
      <Navbar />
      <Wrapper>
        <Title>YOUR BAG</Title>
        <Top>
          <Link to='/'>
            <TopButton>CONTINUE SHOPPING</TopButton>
          </Link>
          <TopTexts>
            <TopText>Shopping Bag({cartItems.length})</TopText>
            <TopText>
              <Link to={'/wishlist'}>Your Wishlist ({wishListItems?.length})</Link>
            </TopText>
          </TopTexts>
          <TopButton type='filled' onClick={goToCheckout} disabled={!canCheckout}>
            CHECKOUT NOW
          </TopButton>
        </Top>
        <Bottom>
          <Info>
            {status === 'loading' && isEmpty && (
              <Box w='100%' textAlign='center' py={10}>
                <Spinner size='lg' color='gray.900' />
              </Box>
            )}
            {status !== 'loading' && isEmpty && (
              <EmptyState>
                Your bag is empty. <Link to='/products'>Start shopping</Link>
              </EmptyState>
            )}
            {issues.map((issue) => (
              <IssueBox key={`${issue.productId}-${issue.size}`} role='alert'>
                {issue.message}
              </IssueBox>
            ))}
            {cartItems.map((item) => (
              <Product key={`${item.productId}-${item.size}`}>
                <ProductDetail>
                  <Link to={`/${item.category || 'product'}/${item.productId}`}>
                    <Image src={imageSrc(item.image)} alt={item.name} onError={onImageError} />
                  </Link>
                  <Details>
                    <ProductBrand>{item.brand}</ProductBrand>
                    <ProductName>
                      {item.name}
                      {item.size ? ` · Size ${item.size}` : ''}
                    </ProductName>
                    <CartItemActions
                      key={item.quantity}
                      initialQuantity={item.quantity}
                      maxQuantity={Math.min(item.stock, 20)}
                      onChange={(newQuantity) => handleQuantityChange(item, newQuantity)}
                      onRemove={() => handleRemoveFromCart(item)}
                      onSaveForLater={() => handleSaveForLater(item)}
                    />
                  </Details>
                </ProductDetail>
                <PriceDetail>
                  <ProductPrice>{formatPrice(item.price)}</ProductPrice>
                  {item.quantity > 1 && <LineTotal>{formatPrice(item.lineTotal)} total</LineTotal>}
                </PriceDetail>
              </Product>
            ))}
            <Hr />
          </Info>
          <Summary>
            <SummaryTitle>ORDER SUMMARY</SummaryTitle>
            <SummaryItem>
              <SummaryItemText>Subtotal</SummaryItemText>
              <SummaryItemPrice>{formatPrice(summary.subtotal)}</SummaryItemPrice>
            </SummaryItem>
            {summary.tax > 0 && (
              <SummaryItem>
                <SummaryItemText>Tax</SummaryItemText>
                <SummaryItemPrice>{formatPrice(summary.tax)}</SummaryItemPrice>
              </SummaryItem>
            )}
            <SummaryItem>
              <SummaryItemText>Delivery</SummaryItemText>
              <SummaryItemPrice>{summary.shipping > 0 ? formatPrice(summary.shipping) : 'Free'}</SummaryItemPrice>
            </SummaryItem>
            {toFreeDelivery > 0 && <DeliveryNote role='status'>Spend {formatPrice(toFreeDelivery)} more for free UK delivery</DeliveryNote>}
            <SummaryItem type='total'>
              <SummaryItemText>Total</SummaryItemText>
              <SummaryItemPrice>{formatPrice(summary.total)}</SummaryItemPrice>
            </SummaryItem>
            <Button onClick={goToCheckout} disabled={!canCheckout}>
              CHECKOUT NOW
            </Button>
          </Summary>
        </Bottom>
      </Wrapper>
      <Footer />
    </Container>
  );
};

export default Cart;

const ContainerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  color: #333;

  &:disabled {
    color: #ccc;
    cursor: not-allowed;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--muted);
  text-decoration: underline;
  cursor: pointer;

  span {
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ActionLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: inherit;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;

const CartItemActions = ({ initialQuantity, maxQuantity = 20, onChange, onRemove, onSaveForLater }) => {
  const [quantity, setQuantity] = useState(initialQuantity || 1);

  const handleIncrement = () => {
    if (quantity >= maxQuantity) return;
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    onChange(newQuantity);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      onChange(newQuantity);
    }
  };

  return (
    <ContainerWrapper>
      <Controls>
        <IconButton onClick={handleDecrement} disabled={quantity <= 1} aria-label='Decrease quantity'>
          –
        </IconButton>
        <Text aria-label='Quantity'>{quantity}</Text>
        <IconButton onClick={handleIncrement} disabled={quantity >= maxQuantity} aria-label='Increase quantity'>
          +
        </IconButton>
      </Controls>
      <Actions>
        <ActionLink type='button' onClick={onRemove}>
          Remove
        </ActionLink>
        <LeftDivider />
        <ActionLink type='button' onClick={onSaveForLater}>
          Save for Later
        </ActionLink>
      </Actions>
    </ContainerWrapper>
  );
};
