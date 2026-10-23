import { SearchOutlined, ShoppingCartOutlined } from '@mui/icons-material';
import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import LazyLoad from 'react-lazyload';
import { useDispatch, useSelector } from 'react-redux';
import { toggleWishlist } from '../store/slices/wishlistSlice';
import { Box, useToast } from '@chakra-ui/react';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { addToCart } from '../store/slices/cartSlice';
import { imageSrc, onImageError } from '../utils/imageFallback';

const Info = styled.div`
  opacity: 0;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.5s ease;
  cursor: pointer;
`;

const Container = styled.div`
  flex: 1;
  margin: 5px;
  min-width: 280px;
  height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5fbfd;
  position: relative;
  &:hover ${Info} {
    opacity: 1;
  }
`;
const Circle = styled.div`
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background-color: white;
  position: absolute;
`;

const ImageContainer = styled.div`
  height: 75%;
  width: 60%;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: auto;
`;

const Image = styled.img`
  height: 100%;
  width: 100%;
  object-fit: cover;
  z-index: 2;
`;

const Icon = styled.button`
  border: none;
  padding: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px;
  transition: all 0.5s ease;

  &:hover {
    background-color: #e9f5f5;
    transform: scale(1.1);
  }
`;

// Placeholder styled component
const Placeholder = styled.div`
  height: 100%;
  width: 100%;
  background-color: #f0f0f0;
`;
const toastBox = (bg, text) => () => (
  <Box color='white' p={3} bg={bg} borderRadius={4}>
    {text}
  </Box>
);

const Product = ({ item }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const toast = useToast();
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  const isProductInWishlist = useSelector((state) => state.wishlist.items.some((w) => w._id === item?._id));
  const productPath = `/${item?.category || 'product'}/${item?._id}`;

  const handleProductSearch = () => {
    navigate(productPath);
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    // Products sold in sizes need a size, which is chosen on the product page.
    if (item?.sizes?.length) {
      navigate(productPath);
      return;
    }
    try {
      await dispatch(addToCart({ productId: item._id, quantity: 1 })).unwrap();
      toast({ position: 'bottom-right', status: 'success', render: toastBox('teal', 'Product added to cart.') });
    } catch (err) {
      toast({
        position: 'bottom-right',
        status: 'error',
        render: toastBox('red', typeof err === 'string' ? err : 'Error adding product to cart.'),
      });
    }
  };

  const handleAddToWishlist = () => {
    dispatch(toggleWishlist(item));
    toast({
      position: 'bottom-right',
      render: toastBox('teal', isProductInWishlist ? 'Product removed from wishlist!' : 'Product added to wishlist!'),
    });
  };

  return (
    <Container>
      <Circle />
      <ImageContainer>
        <LazyLoad height={200.5} offset={10} once placeholder={<Placeholder />}>
          <Image src={imageSrc(item?.imageUrl)} alt={item?.name || 'Product'} onError={onImageError} />
        </LazyLoad>
      </ImageContainer>
      <Info>
        <Icon type='button' aria-label='Add to cart' onClick={handleAddToCart}>
          <ShoppingCartOutlined />
        </Icon>
        <Icon type='button' aria-label='View product' onClick={handleProductSearch}>
          <SearchOutlined />
        </Icon>
        <Icon type='button' aria-label={isProductInWishlist ? 'Remove from wishlist' : 'Add to wishlist'} onClick={handleAddToWishlist}>
          {!isProductInWishlist ? <FavoriteBorderIcon style={{ color: 'teal' }} /> : <FavoriteIcon style={{ color: 'teal' }} />}
        </Icon>
      </Info>
    </Container>
  );
};

export default Product;
