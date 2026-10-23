import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import SectionHeading from './SectionHeading';
import { listCollectionsAPI } from '../../services/products/productService';
import { collections as fallback, storeConfig } from '../../data';
import { PLACEHOLDER_IMAGE } from '../../utils/imageFallback';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 0 16px;
  @media (min-width: 900px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 20px;
    padding: 0 32px;
  }
`;

const Card = styled(Link)`
  position: relative;
  display: block;
  aspect-ratio: 3 / 4;
  min-height: 0;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--soft);
  isolation: isolate;
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.65) 100%);
  }
  &:hover img {
    transform: scale(1.05);
  }
`;

const Label = styled.span`
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 14px;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  color: white;
  svg {
    flex-shrink: 0;
    margin-bottom: 4px;
  }
`;

const Name = styled.span`
  display: block;
  font-family: var(--font-display);
  font-size: clamp(26px, 7vw, 36px);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1;
`;

const Count = styled.span`
  display: block;
  font-size: 12px;
  opacity: 0.85;
  margin-top: 4px;
`;

// "Shop by collection": a card per collection with a cover photo.
const CollectionGrid = () => {
  const [items, setItems] = useState(fallback);

  useEffect(() => {
    listCollectionsAPI()
      .then((data) => setItems(data.filter((c) => c.count > 0)))
      .catch(() => {});
  }, []);

  return (
    <section aria-labelledby='shop-by-collection'>
      <SectionHeading id='shop-by-collection'>Shop by collection</SectionHeading>
      <Grid>
        {items.map((c) => (
          <Card key={c.slug} to={`/collections/${c.slug}`}>
            <img src={storeConfig.collectionImages[c.slug] || c.imageUrl || PLACEHOLDER_IMAGE} alt='' loading='lazy' />
            <Label>
              <span>
                <Name>{c.title}</Name>
                {c.count !== undefined && <Count>{c.count.toLocaleString()} items</Count>}
              </span>
              <HiOutlineArrowRight size={22} aria-hidden='true' />
            </Label>
          </Card>
        ))}
      </Grid>
    </section>
  );
};

export default CollectionGrid;
