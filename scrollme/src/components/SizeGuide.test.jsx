import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/renderWithProviders';
import SizeGuide from './SizeGuide';

const cellsOf = (uk) =>
  screen
    .getAllByRole('row')
    .map((row) =>
      within(row)
        .queryAllByRole('cell')
        .map((c) => c.textContent)
    )
    .find((cells) => cells[0] === uk);

test('opens a UK/EU/US size chart with how to measure', async () => {
  renderWithProviders(<SizeGuide department='men' />);
  userEvent.click(screen.getByRole('button', { name: 'Size guide' }));
  const dialog = await screen.findByRole('dialog', { name: "Men's shoe size guide" });
  expect(dialog).toHaveTextContent('How to measure your foot');
  expect(cellsOf('8')).toEqual(['8', '42', '9', '26']);
});

test("shows the women's chart on women's shoes", async () => {
  renderWithProviders(<SizeGuide department='women' />);
  userEvent.click(screen.getByRole('button', { name: 'Size guide' }));
  await screen.findByRole('dialog', { name: "Women's shoe size guide" });
  expect(cellsOf('5')).toEqual(['5', '38', '7.5', '23.8']);
});
