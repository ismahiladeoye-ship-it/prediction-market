import styled from 'styled-components';
import Navbar from '../components/Navbar';
import Announcement from '../components/Announcement';
import { mobile, tablet } from '../responsive';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useState } from 'react';
import Footer from '../components/Footer';
import { getProductByIdAPI } from '../services/products/productService';
import { renderStars } from '../components/Stars';
import { capitalizeFirstChar } from '../utils/stringUtils';
import { Box, ButtonSpinner, Text } from '@chakra-ui/react';
import { useToast } from '@chakra-ui/react';
import { addToCart } from '../store/slices/cartSlice';
import { useDispatch } from 'react-redux';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useSelector } from 'react-redux';
import { toggleWishlist } from '../store/slices/wishlistSlice';
import { getErrorMessage } from '../api/client';
import { formatPrice } from '../utils/format';
import { placementLabel } from '../utils/taxonomy';
import { imageSrc, onImageError } from '../utils/imageFallback';
import { swatchColour } from '../utils/colourSwatch';
import { HiOutlineArrowPath, HiOutlineCheckCircle, HiOutlineTruck } from 'react-icons/hi2';
import { storeConfig } from '../data';

const PERK_ICONS = { delivery: HiOutlineTruck, returns: HiOutlineArrowPath };

const Product = () => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [size, setSize] = useState('');
  const [adding, setAdding] = useState(false);
  const [photo, setPhoto] = useState(0);
  const { productId } = useParams();
  const toast = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  const isProductInWishlist = useSelector((state) => state.wishlist.items.some((item) => item._id === productId));

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        setSize('');
        setPhoto(0);
        const selectedProduct = await getProductByIdAPI(productId);
        setProduct(selectedProduct);
      } catch (err) {
        setError(err.response?.status === 404 || err.response?.status === 400 ? 'not_found' : getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const outOfStock = product && product.stock <= 0;
  const photos = product?.images?.length ? product.images : [product?.imageUrl];
  const mainPhoto = photos[photo] || photos[0];
  const needsSize = Boolean(product?.sizes?.length);

  const addCurrentToCart = async () => {
    if (!isAuthenticated) {
      toast({ title: 'Please sign in to add items to your cart.', status: 'info', duration: 3000, isClosable: true });
      navigate('/login', { state: { from: location } });
      return false;
    }
    if (needsSize && !size) {
      toast({ title: 'Please choose a size.', status: 'warning', duration: 3000, isClosable: true });
      return false;
    }
    setAdding(true);
    try {
      await dispatch(addToCart({ productId: product._id, quantity: 1, size })).unwrap();
      return true;
    } catch (err) {
      toast({
        title: 'Error adding product to cart.',
        description: typeof err === 'string' ? err : 'Something went wrong.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return false;
    } finally {
      setAdding(false);
    }
  };

  const handleAddToCart = async () => {
    if (await addCurrentToCart()) {
      toast({
        title: 'Product added to cart.',
        description: 'You can view your cart to proceed.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleBuyNow = async () => {
    if (await addCurrentToCart()) navigate('/checkout');
  };

  const getDetailHeading = (detailItem) => {
    switch (detailItem) {
      case 'material':
        return capitalizeFirstChar('material');
      case 'brand':
        return `${capitalizeFirstChar('brand')} Name`;
      case 'weight':
        return capitalizeFirstChar('weight');
      case 'category':
        return capitalizeFirstChar('category');
      default:
        return null;
    }
  };

  const renderProductDetails = () => {
    const productDetailItems = ['material', 'brand', 'weight', 'category'];

    return productDetailItems
      .filter((d) => product?.[d] !== undefined && product?.[d] !== '' && product?.[d] !== 0)
      .map((d) => {
        return (
          <DetailContainer key={d}>
            {' '}
            <ProductDetailInfo>{getDetailHeading(d)}</ProductDetailInfo>
            <ProductDetailInfo>{d === 'category' ? placementLabel(product) : product[d]}</ProductDetailInfo>
          </DetailContainer>
        );
      });
  };

  const handleWishlistToggle = () => {
    dispatch(toggleWishlist(product));
  };

  const handleImageClick = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [modalOpen]);

  if (loading || error) {
    return (
      <Container>
        <Announcement />
        <Navbar />
        <Box
          display='flex'
          flexDirection='column'
          justifyContent='center'
          alignItems='center'
          minHeight='60vh'
          gap={4}
          px={4}
          textAlign='center'
        >
          {loading ? (
            <ButtonSpinner size='xl' />
          ) : error === 'not_found' ? (
            <>
              <Text fontSize='2xl' fontWeight={300}>
                Product not found
              </Text>
              <Text color='gray.600'>It may have been removed or is no longer available.</Text>
              <RouterLink to='/products' style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                Browse all products
              </RouterLink>
            </>
          ) : (
            <Text color='red.500' fontSize='xl' role='alert'>
              {error}
            </Text>
          )}
        </Box>
        <Footer />
      </Container>
    );
  }
  return (
    <Container>
      <Announcement />
      <Navbar />
      <Wrapper>
        <ImgContainer>
          {product && <Image src={imageSrc(mainPhoto)} alt={product?.name} onClick={handleImageClick} onError={onImageError} />}
          {photos.length > 1 && (
            <Thumbs role='group' aria-label='Product photos'>
              {photos.map((url, i) => (
                <Thumb
                  key={url}
                  type='button'
                  $active={i === photo}
                  aria-label={`Photo ${i + 1} of ${photos.length}`}
                  aria-pressed={i === photo}
                  onClick={() => setPhoto(i)}
                >
                  <img src={url} alt='' onError={onImageError} />
                </Thumb>
              ))}
            </Thumbs>
          )}
        </ImgContainer>
        <InfoContainer>
          <Flex>
            <Title>{product?.name}</Title>
            <HeartIcon
              as='button'
              type='button'
              aria-label={isProductInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              isInWishlist={isProductInWishlist}
              onClick={handleWishlistToggle}
            >
              {!isProductInWishlist ? (
                <FavoriteBorderIcon style={{ color: 'var(--accent)' }} />
              ) : (
                <FavoriteIcon style={{ color: 'var(--accent)' }} />
              )}
            </HeartIcon>
          </Flex>
          <ProductRating>
            <AverageRating>{product?.ratings?.averageRating}</AverageRating>
            <ProductStar>{renderStars(product?.ratings?.averageRating)}</ProductStar>
            <ProductReview>{product?.ratings?.numberOfReviews || 0} reviews</ProductReview>
          </ProductRating>
          <Desc>{product?.description}</Desc>
          <Price>{formatPrice(product?.price)}</Price>
          <StockInfo low={product.stock < 10}>
            {outOfStock ? 'Out of stock' : product.stock < 10 ? `Only ${product.stock} left in stock` : 'In stock'}
          </StockInfo>
          <FilterContainer>
            {product?.color && (
              <Filter>
                <FilterTitle>Colour</FilterTitle>
                {product.colours?.length > 1 ? (
                  // The same item in its other colours, each its own product page.
                  <Swatches aria-label='Colours'>
                    {product.colours.map((c) => (
                      <li key={c._id}>
                        <SwatchLink
                          to={`/${c.category}/${c._id}`}
                          replace
                          aria-label={`${c.color}${c.inStock ? '' : ', out of stock'}`}
                          aria-current={c._id === product._id ? 'true' : undefined}
                          title={c.inStock ? c.color : `${c.color} (out of stock)`}
                          $colour={swatchColour(c.color)}
                          $selected={c._id === product._id}
                          $soldOut={!c.inStock}
                        />
                      </li>
                    ))}
                  </Swatches>
                ) : (
                  <FilterColor color={swatchColour(product.color)} title={product.color} aria-label={`Colour: ${product.color}`} />
                )}
                <ColorName>{product.color}</ColorName>
              </Filter>
            )}
            {needsSize && (
              <Filter>
                <FilterTitle $block>Size</FilterTitle>
                <SizePills role='radiogroup' aria-label='Size'>
                  {product.sizes.map((s) => (
                    <SizePill
                      key={s}
                      type='button'
                      role='radio'
                      aria-checked={size === s}
                      $selected={size === s}
                      onClick={() => setSize(s)}
                    >
                      {s}
                    </SizePill>
                  ))}
                </SizePills>
              </Filter>
            )}
          </FilterContainer>
          <AddContainer>
            <ActionButtons>
              <Button $primary onClick={handleAddToCart} disabled={outOfStock || adding}>
                {outOfStock ? 'OUT OF STOCK' : 'ADD TO CART'}
              </Button>
              <Button onClick={handleBuyNow} disabled={outOfStock || adding}>
                BUY NOW
              </Button>
            </ActionButtons>
            {storeConfig.perks?.length > 0 && (
              <Perks>
                {storeConfig.perks.map(({ icon, text }) => {
                  const Icon = PERK_ICONS[icon] || HiOutlineCheckCircle;
                  return (
                    <li key={text}>
                      <Icon size={18} aria-hidden='true' />
                      {text}
                    </li>
                  );
                })}
              </Perks>
            )}
          </AddContainer>
          <ProductDetails>
            <ProductDetailTitle>Product details</ProductDetailTitle>
            {renderProductDetails()}
          </ProductDetails>
        </InfoContainer>
      </Wrapper>
      <Footer />
      {modalOpen && (
        <Modal onClick={closeModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <CloseButton onClick={closeModal} aria-label='Close image'>
              ✖
            </CloseButton>
            <ModalImage src={imageSrc(mainPhoto)} alt={product?.name} onError={onImageError} />
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default Product;

const Container = styled.div``;

const Flex = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  gap: 6px;
`;

const Wrapper = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 32px;
  padding: 40px 32px;
  ${tablet({ padding: '24px 16px' })}
  ${mobile({ flexDirection: 'column', padding: '16px', gap: '20px' })}
`;

const ImgContainer = styled.div`
  flex: 1;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
`;

const Image = styled.img`
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  max-height: 78vh;
  object-fit: contain;
  border-radius: var(--radius);
  background: white;
  border: 1px solid var(--line);
  cursor: zoom-in;
`;

const Thumbs = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 12px;
  overflow-x: auto;
`;

const Thumb = styled.button`
  flex: 0 0 72px;
  height: 96px;
  padding: 0;
  border-radius: 10px;
  overflow: hidden;
  background: white;
  border: 2px solid ${({ $active }) => ($active ? 'var(--ink)' : 'var(--line)')};
  cursor: pointer;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const InfoContainer = styled.div`
  flex: 1;
  min-width: 0;
  padding: 0px 24px;
  justify-content: flex-start;
  align-items: flex-start;
  ${mobile({ padding: '4px;' })}
  text-align: left;
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-weight: 400;
  text-transform: uppercase;
  font-size: clamp(38px, 8vw, 60px);
  line-height: 1;
  letter-spacing: 0.01em;
`;

const ProductRating = styled.div`
  display: flex;
  gap: 5px;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
`;

const AverageRating = styled.p`
  font-size: 14px;
  font-weight: 400;
`;

const ProductStar = styled.div`
  width: content-fit;
  // height: 40px
  margin-inline-end: 10px;
`;

const ProductReview = styled.p`
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
`;

const Desc = styled.p`
  margin: 14px 0px;
  font-size: 16px;
  line-height: 1.6;
  color: var(--muted);
`;

const Price = styled.span`
  font-weight: 700;
  font-size: 26px;
`;

const FilterContainer = styled.div`
  width: 100%;
  margin: 26px 0px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
`;

const Filter = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const FilterTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  min-width: 64px;
  width: ${({ $block }) => ($block ? '100%' : 'auto')};
`;

const FilterColor = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #ddd;
  background-color: ${(props) => props.color};
  margin: 0px 5px;
  cursor: pointer;
`;

const Swatches = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
`;

// A round colour swatch; the chosen colour has a ring, sold-out ones are crossed through.
const SwatchLink = styled(RouterLink)`
  display: block;
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: ${({ $colour }) => $colour};
  border: 1px solid rgba(0, 0, 0, 0.18);
  box-shadow: ${({ $selected }) => ($selected ? '0 0 0 2px #fff, 0 0 0 4px #111' : 'none')};
  opacity: ${({ $soldOut }) => ($soldOut ? 0.45 : 1)};
  &::after {
    content: '';
    display: ${({ $soldOut }) => ($soldOut ? 'block' : 'none')};
    position: absolute;
    left: 50%;
    top: -2px;
    bottom: -2px;
    border-left: 1.5px solid #111;
    transform: rotate(45deg);
  }
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
  }
`;

const SizePills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const SizePill = styled.button`
  min-width: 52px;
  height: 44px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1.5px solid ${({ $selected }) => ($selected ? 'var(--ink)' : 'var(--line)')};
  background: ${({ $selected }) => ($selected ? 'var(--ink)' : 'white')};
  color: ${({ $selected }) => ($selected ? 'white' : 'var(--ink)')};
  font-weight: 600;
  cursor: pointer;
  &:hover {
    border-color: var(--ink);
  }
`;

const AddContainer = styled.div`
  width: 100%;
  max-width: 480px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const Perks = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  list-style: none;
  font-size: 14px;
  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

const ActionButtons = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Button = styled.button`
  width: 100%;
  height: 56px;
  border-radius: 999px;
  border: 1.5px solid var(--ink);
  background-color: ${({ $primary }) => ($primary ? 'var(--ink)' : 'white')};
  color: ${({ $primary }) => ($primary ? 'white' : 'var(--ink)')};
  cursor: pointer;
  font-weight: 700;
  letter-spacing: 0.1em;
  &:hover {
    opacity: 0.88;
  }
  &:disabled {
    border-color: #ccc;
    background-color: ${({ $primary }) => ($primary ? '#ccc' : 'white')};
    color: ${({ $primary }) => ($primary ? 'white' : '#999')};
    cursor: not-allowed;
    opacity: 1;
  }
`;

const StockInfo = styled.p`
  margin-top: 10px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ low }) => (low ? 'var(--sale)' : 'var(--ink)')};
`;

const ColorName = styled.span`
  font-size: 14px;
  margin-left: 4px;
`;

const ProductDetails = styled.div`
  width: 320px;
  max-width: 100%;
  margin-block-start: 30px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: flex-start;
  align-items: flex-start;
`;

const ProductDetailTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
`;

const DetailContainer = styled.div`
  width: 100%;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
`;

const ProductDetailInfo = styled.p`
  width: 50%;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
`;

const HeartIcon = styled.div`
  background: none;
  border: none;
  cursor: pointer;
  margin-left: 10px;
  color: ${({ isInWishlist }) => (isInWishlist ? 'white' : 'gray')};
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  overflow: hidden;
`;

const ModalContent = styled.div`
  position: relative;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
`;

const CloseButton = styled.button`
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  z-index: 1001;
`;

const ModalImage = styled.img`
  width: 100%;
  max-height: 90vh;
  height: auto;
  object-fit: contain;
  transition: transform 0.3s ease;
  &:hover {
    transform: scale(1.1);
  }
`;
