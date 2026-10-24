import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';
import { storeConfig } from '../../data';

const Wrap = styled.section`
  padding: 16px;
  @media (min-width: 900px) {
    padding: 24px 32px;
  }
`;

const Card = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: var(--radius);
  height: clamp(440px, 72vh, 600px);
  background: #1a1a1a;
  @media (min-width: 900px) {
    height: clamp(420px, 58vh, 540px);
  }
  color: white;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
`;

const Slide = styled.div`
  position: absolute;
  inset: 0;
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transition: opacity 0.8s ease;
  background-image: linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.25) 45%, rgba(0, 0, 0, 0.6) 100%),
    url(${({ $img }) => $img});
  background-size: cover;
  background-position: ${({ $position }) => $position || 'center'};
  filter: ${({ $mono }) => ($mono ? 'grayscale(1) contrast(1.08)' : 'none')};
`;

const Content = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 16%;
  padding: 0 28px;
  max-width: 900px;
  @media (min-width: 900px) {
    top: 50%;
    transform: translateY(-58%);
    padding: 0 64px;
  }
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-weight: 400;
  text-transform: uppercase;
  font-size: clamp(52px, 11vw, 88px);
  line-height: 0.92;
  letter-spacing: 0.01em;
`;

const Subtitle = styled.p`
  margin: 18px 0 26px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: clamp(14px, 3.6vw, 18px);
`;

const Cta = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 130px;
  height: 54px;
  padding: 0 30px;
  border-radius: 16px;
  background: white;
  color: var(--ink);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: transform 0.2s ease;
  &:hover {
    transform: translateY(-2px);
  }
`;

const Controls = styled.div`
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 18px;
`;

const Control = styled.button`
  width: 52px;
  height: 52px;
  border-radius: 12px;
  border: none;
  background: white;
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
`;

// Rounded, dark hero card that cross-fades between slides.
const Hero = () => {
  const slides = storeConfig.heroSlides;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (paused || reduced || slides.length < 2) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  const go = (step) => setIndex((i) => (i + step + slides.length) % slides.length);
  const slide = slides[index];

  return (
    <Wrap aria-roledescription='carousel' aria-label='Featured'>
      <Card
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {slides.map((s, i) => (
          <Slide key={s.id} $img={s.img} $position={s.position} $mono={storeConfig.heroMono} $active={i === index} aria-hidden='true' />
        ))}
        <Content aria-live='polite'>
          <Title>{slide.title}</Title>
          <Subtitle>{slide.subtitle}</Subtitle>
          <Cta to={slide.link}>{slide.cta}</Cta>
        </Content>
        {slides.length > 1 && (
          <Controls>
            <Control type='button' aria-label='Previous slide' onClick={() => go(-1)}>
              <HiOutlineChevronLeft size={22} />
            </Control>
            <Control type='button' aria-label='Next slide' onClick={() => go(1)}>
              <HiOutlineChevronRight size={22} />
            </Control>
          </Controls>
        )}
      </Card>
    </Wrap>
  );
};

export default Hero;
