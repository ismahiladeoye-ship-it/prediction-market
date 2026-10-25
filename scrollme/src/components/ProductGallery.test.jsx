import { screen, waitFor, fireEvent } from '@testing-library/react';
import ProductGallery from './ProductGallery';
import { renderWithProviders } from '../test/renderWithProviders';
import { listCategoriesAPI, listProductsAPI } from '../services/products/productService';

jest.mock('../services/products/productService', () => ({
  listProductsAPI: jest.fn(),
  listCategoriesAPI: jest.fn(),
}));

const product = (id, extra = {}) => ({
  _id: id,
  name: `Product ${id}`,
  brand: 'brand',
  category: 'shirts',
  price: 10,
  stock: 3,
  description: 'desc',
  ratings: { averageRating: 4, numberOfReviews: 2 },
  ...extra,
});

describe('ProductGallery', () => {
  beforeEach(() => {
    listCategoriesAPI.mockResolvedValue([{ slug: 'shirts', count: 2 }]);
  });

  it('passes URL filters to the API and renders products', async () => {
    listProductsAPI.mockResolvedValue({
      products: [product('1'), product('2', { description: undefined, ratings: undefined })],
      totalPages: 1,
      totalProducts: 2,
    });
    renderWithProviders(<ProductGallery />, { route: '/products?q=shirt&sort=price_asc&page=1' });
    expect(await screen.findByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getAllByText('Only 3 left')).toHaveLength(2);
    expect(listProductsAPI).toHaveBeenCalledWith(expect.objectContaining({ q: 'shirt', sort: 'price_asc', page: 1 }));
    expect(screen.getByText('Results for “shirt”')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    listProductsAPI.mockResolvedValue({ products: [], totalPages: 0, totalProducts: 0 });
    renderWithProviders(<ProductGallery />, { route: '/products?q=zzz' });
    expect(await screen.findByText('No products found')).toBeInTheDocument();
  });

  it('shows an error with a retry button', async () => {
    listProductsAPI.mockRejectedValueOnce({ response: { data: { message: 'Database unavailable' } } });
    listProductsAPI.mockResolvedValueOnce({ products: [product('9')], totalPages: 1, totalProducts: 1 });
    renderWithProviders(<ProductGallery />, { route: '/products' });
    expect(await screen.findByText(/Database unavailable/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByText('Product 9')).toBeInTheDocument());
  });

  it('restricts a category page to its category', async () => {
    listProductsAPI.mockResolvedValue({ products: [product('1')], totalPages: 1, totalProducts: 1 });
    renderWithProviders(<ProductGallery category='lounge-pants' />, { route: '/lounge-pants' });
    expect(await screen.findByText('Lounge Pants')).toBeInTheDocument();
    expect(listProductsAPI).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'lounge-pants' }));
  });
});
