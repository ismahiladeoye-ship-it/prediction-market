import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';
import { storeConfig } from '../data';

const Bar = styled.div`
  width: 100%;
  min-height: 40px;
  background: var(--paper);
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--line);
`;

const Message = styled.p`
  flex: 1;
  text-align: center;
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: 0.06em;
  line-height: 1.1;
  padding: 8px 4px;
`;

const Arrow = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink);
`;

// Rotating announcement bar; pauses while hovered or focused.
const Announcement = () => {
  const messages = storeConfig.announcements;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || messages.length < 2) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % messages.length), 5000);
    return () => clearInterval(timer);
  }, [paused, messages.length]);

  const go = (step) => setIndex((i) => (i + step + messages.length) % messages.length);

  return (
    <Bar
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {messages.length > 1 && (
        <Arrow type='button' aria-label='Previous announcement' onClick={() => go(-1)}>
          <HiOutlineChevronLeft size={18} />
        </Arrow>
      )}
      <Message aria-live='polite'>{messages[index]}</Message>
      {messages.length > 1 && (
        <Arrow type='button' aria-label='Next announcement' onClick={() => go(1)}>
          <HiOutlineChevronRight size={18} />
        </Arrow>
      )}
    </Bar>
  );
};

export default Announcement;
