const pexels = (id, w = 1600) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

// Everything a shop owner is likely to edit, in one place.
export const storeConfig = {
  name: 'Get It Sourced',
  // Rotating messages in the bar above the header. Only state what is true
  // (e.g. add 'FREE SHIPPING ON ALL ORDERS' if FREE_SHIPPING_THRESHOLD makes it so).
  announcements: [
    'SOURCED FASHION, FOOTWEAR & ACCESSORIES',
    'PAY WITH CARD, APPLE PAY, PAYPAL OR KLARNA',
    'SIGN UP FOR NEW DROPS & RESTOCKS',
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
      id: 'clothing',
      title: 'New in clothing',
      subtitle: 'Shirts, tees and outerwear',
      cta: 'Shop',
      link: '/collections/clothing',
      img: pexels(5886041),
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
  // Fallback cover images for "Shop by collection" (the API supplies product photos).
  collectionImages: {
    clothing: pexels(2983464, 900),
    footwear: pexels(7193634, 900),
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
