import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import { storeConfig } from '../../data';

const Wrap = styled.section`
  display: grid;
  gap: 28px;
  margin-top: 72px;
  padding: 0 16px;
  @media (min-width: 900px) {
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 48px;
    padding: 0 32px;
  }
`;

const Image = styled.img`
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: var(--radius);
  @media (min-width: 900px) {
    order: 2;
    aspect-ratio: 6 / 5;
  }
`;

const Copy = styled.div`
  text-align: center;
  max-width: 520px;
  margin: 0 auto;
  h2 {
    font-family: var(--font-display);
    font-weight: 400;
    text-transform: uppercase;
    font-size: clamp(36px, 8vw, 52px);
    line-height: 1;
  }
  p {
    margin: 16px 0 26px;
    font-size: 16px;
    line-height: 1.6;
  }
`;

const Cta = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 999px;
  background: var(--ink);
  color: white;
  font-weight: 600;
  font-size: 15px;
  transition: transform 0.2s ease;
  &:hover {
    transform: translateY(-2px);
  }
`;

// Image beside a short pitch and a call to action (storeConfig.feature).
const FeatureSplit = () => {
  const feature = storeConfig.feature;
  if (!feature) return null;
  return (
    <Wrap aria-labelledby='feature-title'>
      <Image src={feature.img} alt='' loading='lazy' />
      <Copy>
        <h2 id='feature-title'>{feature.title}</h2>
        <p>{feature.text}</p>
        <Cta to={feature.link}>
          {feature.cta} <HiOutlineArrowRight size={18} aria-hidden='true' />
        </Cta>
      </Copy>
    </Wrap>
  );
};

export default FeatureSplit;
