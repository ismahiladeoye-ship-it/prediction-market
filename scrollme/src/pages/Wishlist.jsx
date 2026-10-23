import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { fetchWishlist, removeWishlistItem } from '../store/slices/wishlistSlice';
import Navbar from '../components/Navbar';
import Announcement from '../components/Announcement';
import Footer from '../components/Footer';
import { useToast } from '@chakra-ui/react';
import { addToCart } from '../store/slices/cartSlice';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrice } from '../utils/format';
import { imageSrc, onImageError } from '../utils/imageFallback';

const Container = styled.div`
  margin-top: 100px;
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
`;

const ProductCard = styled.div`
  margin: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 10px;
  width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #fff;
  position: relative;
`;

const Image = styled.img`
  width: 200px;
  height: 200px;
  object-fit: cover;
  object-position: top;
  margin-bottom: 10px;
`;

const Title = styled.h3`
  font-size: 18px;
  margin: 10px 0;
`;

const Price = styled.p`
  font-size: 16px;
  margin-bottom: 10px;
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: transparent;
  border: none;
  color: red;
  font-size: 20px;
  cursor: pointer;
  &:hover {
    color: darkred;
  }
`;

const MoveToBagButton = styled.button`
  padding: 10px 15px;
  border: 1px solid red;
  background-color: white;
  color: red;
  border-radius: 5px;
  cursor: pointer;
  margin-top: auto;
  &:hover {
    background-color: #f5f5f5;
  }
`;

const EmptyWishlist = styled.p`
  font-size: 20px;
  color: #999;
`;

const Wishlist = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const wishlistItems = useSelector((state) => state.wishlist?.items);

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  const handleRemoveFromWishlist = (_id) => {
    dispatch(removeWishlistItem(_id));
  };

  const handleAddToCart = async (product) => {
    // A size has to be chosen on the product page first.
    if (product.sizes?.length) {
      navigate(`/${product.category || 'product'}/${product._id}`);
      return;
    }
    try {
      await dispatch(addToCart({ productId: product._id, quantity: 1 })).unwrap();
      dispatch(removeWishlistItem(product._id));
      toast({
        title: 'Product moved to cart.',
        description: 'You can view your cart to proceed.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error adding product to cart.',
        description: typeof err === 'string' ? err : 'Something went wrong.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      <Navbar />
      <Announcement />
      <Container>
        {wishlistItems?.length > 0 ? (
          wishlistItems?.map((product) => (
            <ProductCard key={product?._id}>
              <RemoveButton onClick={() => handleRemoveFromWishlist(product?._id)} aria-label={`Remove ${product?.name} from wishlist`}>
                X
              </RemoveButton>
              <Link to={`/${product?.category || 'product'}/${product?._id}`}>
                <Image src={imageSrc(product?.imageUrl)} alt={product?.name} onError={onImageError} />
              </Link>
              <Title>{product?.name}</Title>
              <Price>{formatPrice(product?.price)}</Price>
              {product?.isActive === false || product?.stock === 0 ? (
                <Unavailable>Currently unavailable</Unavailable>
              ) : (
                <MoveToBagButton onClick={() => handleAddToCart(product)}>{product?.sizes?.length ? 'Choose Size' : 'Move to Cart'}</MoveToBagButton>
              )}
            </ProductCard>
          ))
        ) : (
          <EmptyWishlist>Your wishlist is empty.</EmptyWishlist>
        )}
      </Container>
      <Footer />
    </>
  );
};

const Unavailable = styled.p`
  margin-top: auto;
  color: #999;
  font-size: 14px;
`;

export default Wishlist;
