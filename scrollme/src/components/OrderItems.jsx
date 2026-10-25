import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { formatPrice } from '../utils/format';
import { imageSrc, onImageError } from '../utils/imageFallback';

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  img {
    width: 64px;
    height: 80px;
    object-fit: cover;
  }
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 14px;
  p:first-child {
    font-weight: 600;
  }
`;

const Meta = styled.p`
  color: #777;
  font-size: 13px;
`;

const Price = styled.span`
  font-size: 18px;
  font-weight: 300;
  white-space: nowrap;
`;

const OrderItems = ({ items }) =>
  items.map((item) => (
    <Item key={`${item.productId}-${item.size}`}>
      <Link to={`/${item.category || 'product'}/${item.productId}`}>
        <img src={imageSrc(item.imageUrl)} alt={item.name} onError={onImageError} />
      </Link>
      <Body>
        <p>{item.brand}</p>
        <p>{item.name}</p>
        <Meta>
          {item.size ? `Size ${item.size} · ` : ''}
          {item.quantity} × {formatPrice(item.unitPrice)}
        </Meta>
      </Body>
      <Price>{formatPrice(item.lineTotal)}</Price>
    </Item>
  ));

export default OrderItems;
