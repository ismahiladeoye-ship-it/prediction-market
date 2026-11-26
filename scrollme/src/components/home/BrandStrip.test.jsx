import { screen } from '@testing-library/react';
import BrandStrip from './BrandStrip';
import SourceQuote from './SourceQuote';
import brandLogos from '../../brandLogos';
import { renderWithProviders } from '../../test/renderWithProviders';

describe('home page brands banner and quote', () => {
  it('shows each brand logo once to screen readers, with no brand names as text', () => {
    renderWithProviders(<BrandStrip />);
    expect(screen.getByRole('heading', { name: 'Brands and stores we source from' })).toBeInTheDocument();
    for (const { name } of brandLogos) {
      expect(screen.getAllByRole('img', { name })).toHaveLength(1);
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    }
    expect(screen.getByText(/independent reseller/)).toBeInTheDocument();
  });

  it('links the quote to the sourcing request form', () => {
    renderWithProviders(<SourceQuote />);
    expect(screen.getByText('“You say it, we source it.”')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tell us what you're after/ })).toHaveAttribute('href', '/contact-us?type=sourcing');
  });
});
