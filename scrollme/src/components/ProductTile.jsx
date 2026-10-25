import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { HiHeart, HiOutlineHeart } from 'react-icons/hi2';
import { toggleWishlist } from '../store/slices/wishlistSlice';
import { formatPrice } from '../utils/format';
import { imageSrc, onImageError } from '../utils/imageFallback';

const Card = styled.article`
  position: relative;
  min-width: 0;
`;

const ImageLink = styled(Link)`
  display: block;
  aspect-ratio: 3 / 4;
  border-radius: 14px;
  overflow: hidden;
  background: var(--soft);
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }
  &:hover img {
    transform: scale(1.04);
  }
`;

const Heart = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
`;

const Badge = styled.span`
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--ink);
  color: white;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Brand = styled.p`
  margin-top: 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
`;

const Name = styled(Link)`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 2px;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.35;
`;

const Price = styled.p`
  margin-top: 4px;
  font-size: 15px;
  font-weight: 700;
`;

// Product card used on the home page and in listings.
const ProductTile = ({ product }) => {
  const dispatch = useDispatch();
  const inWishlist = useSelector((state) => state.wishlist.items.some((w) => w._id === product._id));
  const href = `/${product.category || 'product'}/${product._id}`;
  const soldOut = product.stock <= 0;

  return (
    <Card>
      <ImageLink to={href} aria-label={product.name}>
        <img src={imageSrc(product.imageUrl)} alt='' loading='lazy' onError={onImageError} />
      </ImageLink>
      {soldOut ? <Badge>Sold out</Badge> : product.stock < 5 ? <Badge>Only {product.stock} left</Badge> : null}
      <Heart
        type='button'
        aria-label={inWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        onClick={() => dispatch(toggleWishlist(product))}
      >
        {inWishlist ? <HiHeart size={20} /> : <HiOutlineHeart size={20} />}
      </Heart>
      {product.brand && <Brand>{product.brand}</Brand>}
      <Name to={href}>{product.name}</Name>
      <Price>{formatPrice(product.price)}</Price>
    </Card>
  );
};

export default ProductTile;
