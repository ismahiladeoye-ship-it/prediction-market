import styled from 'styled-components';
import Navbar from '../components/Navbar';
import Announcement from '../components/Announcement';
import Newsletter from '../components/Newsletter';
import { mobile, tablet } from '../responsive';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useState } from 'react';
import Footer from '../components/Footer';
import { getProductByIdAPI } from '../services/products/productService';
import { renderStars } from '../components/ProductCard';
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
import { formatPrice, humanize } from '../utils/format';
import { imageSrc, onImageError } from '../utils/imageFallback';

const Product = () => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [size, setSize] = useState('');
  const [adding, setAdding] = useState(false);
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
        return `${capitalizeFirstChar('category')} Name`;
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
            <ProductDetailInfo>{d === 'category' ? humanize(product[d]) : product[d]}</ProductDetailInfo>
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
        <Navbar />
        <Announcement />
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
              <RouterLink to='/products' style={{ color: 'teal', textDecoration: 'underline' }}>
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
      <Navbar />
      <Announcement />
      <Wrapper>
        <ImgContainer>
          {product && <Image src={imageSrc(product?.imageUrl)} alt={product?.name} onClick={handleImageClick} onError={onImageError} />}
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
              {!isProductInWishlist ? <FavoriteBorderIcon style={{ color: 'teal' }} /> : <FavoriteIcon style={{ color: 'teal' }} />}
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
                <FilterTitle>Color</FilterTitle>
                <FilterColor color={product.color.toLowerCase()} title={product.color} aria-label={`Colour: ${product.color}`} />
                <ColorName>{product.color}</ColorName>
              </Filter>
            )}
            {needsSize && (
              <Filter>
                <FilterTitle>Size</FilterTitle>
                <FilterSize value={size} onChange={(e) => setSize(e.target.value)} aria-label='Size'>
                  <FilterSizeOption value=''>Select</FilterSizeOption>
                  {product.sizes.map((s) => (
                    <FilterSizeOption key={s} value={s}>
                      {s}
                    </FilterSizeOption>
                  ))}
                </FilterSize>
              </Filter>
            )}
          </FilterContainer>
          <AddContainer>
            <ActionButtons>
              <Button onClick={handleAddToCart} disabled={outOfStock || adding}>
                {outOfStock ? 'OUT OF STOCK' : 'ADD TO CART'}
              </Button>
              <Button onClick={handleBuyNow} disabled={outOfStock || adding}>
                BUY NOW
              </Button>
            </ActionButtons>
          </AddContainer>
          <ProductDetails>
            <ProductDetailTitle>Product details</ProductDetailTitle>
            {renderProductDetails()}
          </ProductDetails>
        </InfoContainer>
      </Wrapper>
      <Newsletter />
      <Footer />
      {modalOpen && (
        <Modal onClick={closeModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <CloseButton onClick={closeModal} aria-label='Close image'>
              ✖
            </CloseButton>
            <ModalImage src={imageSrc(product?.imageUrl)} alt={product?.name} onError={onImageError} />
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
  padding: 50px;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  ${mobile({ flexDirection: 'column;' })}
  ${mobile({ padding: '10px;' })}
    ${tablet({ padding: '10px;' })}
`;

const ImgContainer = styled.div`
  flex: 1;
  width: 200px;
`;

const Image = styled.img`
  width: fit-content;
  height: 64vh;
  object-fit: contain;
  margin-inline: auto;
  ${mobile({ height: '40vh;' })}
  ${mobile({ width: '100%;' })}
    ${tablet({ height: '40vh;' })}
    ${tablet({ width: '100%;' })}
    object-position: center;
`;

const InfoContainer = styled.div`
  flex: 1;
  padding: 0px 50px;
  justify-content: flex-start;
  align-items: flex-start;
  ${mobile({ padding: '4px;' })}
  text-align: left;
`;

const Title = styled.h1`
  font-weight: 500;
  font-size: 24px;
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
  color: #2c90d7;
`;

const Desc = styled.p`
  margin: 10px 0px;
  font-size: 18px;
  font-weight: 400;
`;

const Price = styled.span`
  font-weight: 200;
  font-size: 40px;
`;

const FilterContainer = styled.div`
  width: 50%;
  ${mobile({ width: '100%' })}
  margin: 30px 0px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
`;

const Filter = styled.div`
  display: flex;
  align-items: center;
`;

const FilterTitle = styled.span`
  font-size: 20px;
  font-weight: 200;
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

const FilterSize = styled.select`
  margin-left: 10px;
  padding: 5px;
`;

const FilterSizeOption = styled.option``;

const AddContainer = styled.div`
  width: 80%;
  ${mobile({ width: '100%' })}
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  ${mobile({ width: '100%' })}
`;

const Button = styled.button`
  width: 200px;
  ${mobile({ width: 'auto', flex: 1, minWidth: 0 })}
  padding: 15px;
  border: 2px solid teal;
  background-color: white;
  cursor: pointer;
  font-weight: 500;
  &:hover {
    background-color: #f8f4f4;
  }
  &:disabled {
    border-color: #ccc;
    color: #999;
    cursor: not-allowed;
    background-color: white;
  }
`;

const StockInfo = styled.p`
  margin-top: 10px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ low }) => (low ? 'red' : 'teal')};
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
