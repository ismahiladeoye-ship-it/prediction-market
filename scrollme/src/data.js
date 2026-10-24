const pexels = (id, w = 1600) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

// Everything a shop owner is likely to edit, in one place.
export const storeConfig = {
  name: 'Get It Sourced',
  // Rotating messages in the bar above the header. Only state what is true:
  // keep the delivery wording in line with FREE_SHIPPING_THRESHOLD and SHIP_TO_COUNTRIES in the API.
  announcements: ['FREE UK DELIVERY ON ORDERS OVER £100', '30-DAY RETURNS', 'PAY WITH CARD, APPLE PAY, PAYPAL OR KLARNA'],
  // Shown under "Add to cart" on product pages (icon: delivery, returns or check).
  perks: [
    { icon: 'delivery', text: 'Free UK delivery over £100' },
    { icon: 'returns', text: '30-day returns' },
  ],
  // Home page hero. Photos: Pexels licence (free for commercial use), product only (no
  // people) and no visible brand logos.
  heroSlides: [
    {
      id: 'footwear',
      title: 'Footwear, sourced',
      subtitle: 'Fresh pairs, ready to ship',
      cta: 'Shop',
      link: '/collections/footwear',
      img: pexels(19577865),
      position: 'center 55%',
    },
    {
      id: 'outerwear',
      title: 'Built for the cold',
      subtitle: 'Puffers, jackets and layers',
      cta: 'Shop',
      link: '/collections/clothing?category=jackets',
      img: pexels(6045058),
      position: 'center 45%',
    },
    {
      id: 'hoodies',
      title: 'Hoodies & sweats',
      subtitle: 'Everyday staples',
      cta: 'Shop',
      link: '/collections/clothing?category=sweatshirts',
      img: pexels(31961168),
      position: 'center 40%',
    },
    {
      id: 'all',
      title: 'Shop every drop',
      subtitle: 'Thousands of pieces in one place',
      cta: 'Shop all',
      link: '/products',
      img: pexels(581339),
      position: 'center',
    },
  ],
  // Home page, one entry per collection in display order: a card in "Shop by
  // collection" and a row of its products with shortcuts to some categories.
  // Collections and shortcuts with no products are hidden.
  homeCollections: [
    {
      collection: 'clothing',
      img: pexels(2249249, 900),
      shortcuts: [
        { label: 'Hoodies & sweats', category: 'sweatshirts' },
        { label: 'Jackets', category: 'jackets' },
        { label: 'T-shirts', category: 'tshirts' },
        { label: 'Jeans', category: 'jeans' },
        { label: 'Knitwear', category: 'sweaters' },
      ],
    },
    {
      collection: 'footwear',
      img: pexels(7193634, 900),
      shortcuts: [
        { label: 'Trainers', category: 'sports-shoes' },
        { label: 'Casual shoes', category: 'casual-shoes' },
        { label: 'Boots', category: 'boots' },
        { label: 'Sandals', category: 'sandals' },
      ],
    },
    {
      collection: 'accessories',
      // Pexels 16359299, with the maker's name removed from the patch.
      img: '/images/home/accessories-backpack.jpg',
      shortcuts: [
        { label: 'Bags', category: 'backpacks' },
        { label: 'Watches', category: 'watches' },
        { label: 'Wallets', category: 'wallets' },
        { label: 'Sunglasses', category: 'sunglasses' },
        { label: 'Caps', category: 'caps' },
      ],
    },
    {
      collection: 'fragrances',
      img: pexels(34036480, 900),
      shortcuts: [
        { label: 'Perfume', category: 'perfume-and-body-mist' },
        { label: 'Deodorant', category: 'deodorant' },
        { label: 'Gift sets', category: 'fragrance-gift-set' },
      ],
    },
  ],
  // Split image-and-text section on the home page. Edit or set to null to hide.
  feature: {
    title: "Can't find it? We'll source it",
    text: "Tell us the piece, size and budget you're after and we'll look for it for you.",
    cta: 'Send a request',
    link: '/contact-us',
    img: pexels(9594676, 1400),
  },
  location: 'United Kingdom',
  contactEmail: '',
  // Full profile URLs. Empty ones are hidden.
  socials: {
    instagram: '',
    whatsapp: '',
    tiktok: '',
  },
};

// Menu and footer collections (must match backend/api/config/collections.js).
export const collections = [
  { slug: 'clothing', title: 'Clothing' },
  { slug: 'footwear', title: 'Footwear' },
  { slug: 'accessories', title: 'Accessories' },
  { slug: 'fragrances', title: 'Fragrances' },
];
