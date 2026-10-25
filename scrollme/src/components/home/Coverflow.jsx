import styled from 'styled-components';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';

const Stage = styled.div`
  --card: min(400px, 76vw);
  --shift: calc(var(--card) * 0.58);
  position: relative;
  height: calc(var(--card) + 40px);
  overflow: hidden;
  touch-action: pan-y;
  user-select: none;
`;

const Card = styled(Link)`
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--card);
  aspect-ratio: 1 / 1;
  border-radius: var(--radius);
  overflow: hidden;
  background: #1a1a1a;
  color: white;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
  transform: translate(-50%, -50%) translateX(calc(var(--x) * var(--shift))) scale(var(--scale));
  transition: ${({ $instant }) => ($instant ? 'none' : 'transform 0.45s ease, opacity 0.45s ease')};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.6) 100%);
  }
`;

const Chip = styled.span`
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 1;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Footer = styled.span`
  position: absolute;
  left: 18px;
  right: 16px;
  bottom: 16px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const Title = styled.span`
  font-size: clamp(16px, 4.6vw, 21px);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.15;
`;

const Pill = styled.span`
  flex-shrink: 0;
  padding: 12px 20px;
  border-radius: 999px;
  background: white;
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
`;

const Arrow = styled.button`
  position: absolute;
  top: 50%;
  ${({ $side }) => $side}: max(12px, calc(50% - var(--shift) * 2.25));
  z-index: 20;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: none;
  background: white;
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transform: translateY(-50%);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
`;

const SPOTS = { 0: [0, 1], 1: [1, 0.8], 2: [1.72, 0.64] };

// Signed distance from the active slot, wrapping round the ends.
const offsetOf = (i, active, n) => {
  let d = (((i - active) % n) + n) % n;
  if (d > n / 2) d -= n;
  return d;
};

// "Coverflow" carousel: the active card in front, neighbours smaller behind.
// Short lists are repeated (inert copies) so both sides stay filled.
// e.g. 1 item, 1,240 items
const itemCount = (n) => `${n.toLocaleString()} ${n === 1 ? 'item' : 'items'}`;

const Coverflow = ({ items, label }) => {
  const [{ active, previous }, setState] = useState({ active: 0, previous: 0 });
  const pointer = useRef({ x: 0, down: false, swiped: false });
  const repeat = items.length < 5 ? Math.ceil(5 / items.length) : 1;
  const slots = Array.from({ length: items.length * repeat }, (_, i) => ({ item: items[i % items.length], copy: i >= items.length }));
  const n = slots.length;

  const goTo = (index) => setState((s) => ({ active: ((index % n) + n) % n, previous: s.active }));
  const step = (by) => setState((s) => ({ active: (s.active + by + n) % n, previous: s.active }));

  const onPointerDown = (e) => {
    pointer.current = { x: e.clientX, down: true, swiped: false };
  };
  const onPointerUp = (e) => {
    const dx = e.clientX - pointer.current.x;
    if (pointer.current.down && Math.abs(dx) > 40) {
      pointer.current.swiped = true;
      step(dx < 0 ? 1 : -1);
    }
    pointer.current.down = false;
  };
  // A swipe that ends on a card must not also open it.
  const onClickCapture = (e) => {
    if (pointer.current.swiped) {
      e.preventDefault();
      pointer.current.swiped = false;
    }
  };

  if (!items.length) return null;

  return (
    <Stage
      role='region'
      aria-roledescription='carousel'
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (pointer.current.down = false)}
      onClickCapture={onClickCapture}
    >
      {slots.map(({ item, copy }, i) => {
        const d = offsetOf(i, active, n);
        const far = Math.abs(d) > 2;
        const [x, scale] = far ? [2.4, 0.5] : SPOTS[Math.abs(d)];
        const wrapped = Math.abs(d - offsetOf(i, previous, n)) > 2;
        return (
          <Card
            key={`${item.id}-${i}`}
            to={item.link}
            draggable={false}
            aria-label={item.count ? `${item.title}, ${itemCount(item.count)}` : item.title}
            aria-hidden={copy || undefined}
            tabIndex={copy || far ? -1 : undefined}
            onFocus={() => !pointer.current.down && d !== 0 && goTo(i)}
            $instant={wrapped}
            style={{
              '--x': Math.sign(d) * x,
              '--scale': scale,
              zIndex: 10 - Math.abs(d),
              opacity: far ? 0 : 1,
              visibility: far ? 'hidden' : 'visible',
            }}
          >
            <img src={item.img} alt='' loading='lazy' style={item.position ? { objectPosition: item.position } : undefined} />
            {item.count > 0 && <Chip>{itemCount(item.count)}</Chip>}
            <Footer>
              <Title>{item.title}</Title>
              <Pill aria-hidden='true'>SHOP</Pill>
            </Footer>
          </Card>
        );
      })}
      <Arrow type='button' $side='left' aria-label={`Previous: ${label}`} onClick={() => step(-1)}>
        <HiOutlineChevronLeft size={22} />
      </Arrow>
      <Arrow type='button' $side='right' aria-label={`Next: ${label}`} onClick={() => step(1)}>
        <HiOutlineChevronRight size={22} />
      </Arrow>
    </Stage>
  );
};

export default Coverflow;
