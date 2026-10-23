const pexels = (id, w = 1600) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

// Everything a shop owner is likely to edit, in one place.
export const storeConfig = {
  name: 'Get It Sourced',
  // Rotating messages in the bar above the header. Only state what is true:
  // free delivery matches SHIPPING_STANDARD=0 and UK-only SHIP_TO_COUNTRIES in the API.
  announcements: ['FREE UK DELIVERY ON ALL ORDERS', '30-DAY RETURNS', 'PAY WITH CARD, APPLE PAY, PAYPAL OR KLARNA'],
  // Shown under "Add to cart" on product pages (icon: delivery, returns or check).
  perks: [
    { icon: 'delivery', text: 'Free UK delivery' },
    { icon: 'returns', text: '30-day returns' },
  ],
  // Home page hero. Photos: Pexels licence (free for commercial use), no visible brand logos.
  heroSlides: [
    {
      id: 'footwear',
      title: 'Footwear, sourced',
      subtitle: 'Fresh pairs, ready to ship',
      cta: 'Shop',
      link: '/collections/footwear',
      img: pexels(7519524),
      position: 'center 60%',
    },
    {
      id: 'outerwear',
      title: 'Built for the cold',
      subtitle: 'Puffers, jackets and layers',
      cta: 'Shop',
      link: '/collections/clothing?category=jackets',
      img: pexels(19426409),
      position: 'center 35%',
    },
    {
      id: 'hoodies',
      title: 'Hoodies & sweats',
      subtitle: 'Everyday staples',
      cta: 'Shop',
      link: '/collections/clothing?category=sweatshirts',
      img: pexels(7026775),
      position: 'center 30%',
    },
    {
      id: 'all',
      title: 'Shop every drop',
      subtitle: 'Thousands of pieces in one place',
      cta: 'Shop all',
      link: '/products',
      img: pexels(5480696),
      position: 'center 25%',
    },
  ],
  // "Shop by collection" carousels. Each card opens a collection, optionally
  // narrowed to one category; cards with no products are hidden.
  collectionRows: [
    {
      label: 'Clothing',
      items: [
        { id: 'hoodies', title: 'Hoodies & sweats', collection: 'clothing', category: 'sweatshirts', img: pexels(9594679, 900) },
        {
          id: 'jackets',
          title: 'Jackets',
          collection: 'clothing',
          category: 'jackets',
          img: pexels(19426409, 900),
          position: 'center 30%',
        },
        { id: 'clothing', title: 'All clothing', collection: 'clothing', img: pexels(3812433, 900) },
        { id: 'tshirts', title: 'T-shirts', collection: 'clothing', category: 'tshirts', img: pexels(5698851, 900) },
        { id: 'knitwear', title: 'Knitwear', collection: 'clothing', category: 'sweaters', img: pexels(1937336, 900) },
      ],
    },
    {
      label: 'Footwear, fragrances and accessories',
      items: [
        { id: 'footwear', title: 'Footwear', collection: 'footwear', img: pexels(7193634, 900) },
        { id: 'fragrances', title: 'Fragrances', collection: 'fragrances', img: pexels(34036480, 900) },
        { id: 'accessories', title: 'Accessories', collection: 'accessories', img: pexels(11817096, 900) },
      ],
    },
  ],
  // Split image-and-text section on the home page. Edit or set to null to hide.
  feature: {
    title: "Can't find it? We'll source it",
    text: "Tell us the piece, size and budget you're after and we'll look for it for you.",
    cta: 'Send a request',
    link: '/contact-us',
    img: pexels(7679444, 1400),
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
