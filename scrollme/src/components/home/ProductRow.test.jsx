import { act, fireEvent, screen } from '@testing-library/react';
import ProductRow, { ROTATE_MS } from './ProductRow';
import { renderWithProviders } from '../../test/renderWithProviders';

const items = Array.from({ length: 7 }, (_, i) => ({
  _id: String(i + 1),
  name: `Product ${i + 1}`,
  brand: 'Brand',
  price: 10,
  inStock: true,
}));

// jsdom has no layout: give the track a width so it can scroll.
const layout = (el, { scrollLeft = 0, clientWidth = 500, scrollWidth = 1400 } = {}) => {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
  el.scrollLeft = scrollLeft;
  Object.defineProperty(el.firstElementChild, 'offsetWidth', { configurable: true, value: 180 });
  el.scrollTo = jest.fn();
  return el;
};

describe('ProductRow rotation', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('moves on one product at a time and back to the start at the end', () => {
    renderWithProviders(<ProductRow id='row-specials' title='Specials' items={items} banner rotate />);
    const track = layout(screen.getByTestId('row-specials-track'));
    act(() => jest.advanceTimersByTime(ROTATE_MS));
    expect(track.scrollTo).toHaveBeenLastCalledWith({ left: 180, behavior: 'smooth' });
    track.scrollLeft = 900; // 900 + 500 visible reaches the 1400 end
    act(() => jest.advanceTimersByTime(ROTATE_MS));
    expect(track.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
  });

  it('pauses while the shopper hovers and does not rotate unless asked', () => {
    renderWithProviders(<ProductRow id='row-specials' title='Specials' items={items} banner rotate />);
    const track = layout(screen.getByTestId('row-specials-track'));
    fireEvent.mouseEnter(screen.getByText('Product 1').closest('section'));
    act(() => jest.advanceTimersByTime(ROTATE_MS * 2));
    expect(track.scrollTo).not.toHaveBeenCalled();
    fireEvent.mouseLeave(screen.getByText('Product 1').closest('section'));
    act(() => jest.advanceTimersByTime(ROTATE_MS + 10));
    expect(track.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('stays still when rotate is off', () => {
    renderWithProviders(<ProductRow id='row-other' title='Other' items={items} />);
    const track = layout(screen.getByTestId('row-other-track'));
    act(() => jest.advanceTimersByTime(ROTATE_MS * 3));
    expect(track.scrollTo).not.toHaveBeenCalled();
  });
});
