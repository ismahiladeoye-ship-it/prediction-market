const pexels = (id, w = 1600) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

// Everything a shop owner is likely to edit, in one place.
export const storeConfig = {
  name: 'Get It Sourced',
  // Rotating messages in the home page banner, below Specials. Only state what is true:
  // keep the delivery wording in line with FREE_SHIPPING_THRESHOLD and SHIP_TO_COUNTRIES in the API.
  announcements: ['£2.99 UK DELIVERY · FREE FROM £50', '30-DAY RETURNS', 'PAY WITH CARD, APPLE PAY OR KLARNA'],
  // Shown under "Add to cart" on product pages (icon: delivery, returns or check).
  perks: [
    { icon: 'delivery', text: 'Free UK delivery from £50 (£2.99 under £50)' },
    { icon: 'returns', text: '30-day returns' },
  ],
  // Show the hero photos in black and white. Off: the owner chose colour (Nov 2026).
  heroMono: false,
  // Home page hero. The footwear, caps and cold-weather slides are the owner's photos,
  // used with permission (public/hero; the receipt in the caps photo is blurred). The others are
  // Pexels licence (free for commercial use), product only. The caps slide is about
  // sourcing anything, so it opens the "Source an item" form.
  heroSlides: [
    {
      id: 'footwear',
      title: 'Footwear, sourced',
      subtitle: 'Fresh pairs, ready to ship',
      cta: 'Shop',
      link: '/products?category=shoes-boots',
      img: '/hero/footwear-owner.webp',
      position: 'center',
    },
    {
      id: 'caps',
      title: 'We can source anything',
      subtitle: "Tell us what you're after",
      cta: 'Request it',
      link: '/contact-us?type=sourcing',
      img: '/hero/caps-owner.webp',
      position: 'center 45%',
    },
    {
      id: 'outerwear',
      title: 'Built for the cold',
      subtitle: 'Puffers, jackets and layers',
      cta: 'Shop',
      link: '/products?category=coats-jackets',
      img: '/hero/outerwear-owner.webp',
      position: 'center 10%',
    },
    {
      id: 'hoodies',
      title: 'Hoodies & sweats',
      subtitle: 'Everyday staples',
      cta: 'Shop',
      link: '/products?category=clothing&subcategory=hoodies-sweatshirts',
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
  // Home page "Shop by category": one card per entry, in display order. Cards with
  // no products are hidden. Departments and categories: src/taxonomy.json.
  homeSections: [
    { department: 'men', category: 'clothing', img: pexels(31961168, 900) },
    { department: 'women', category: 'clothing', img: pexels(2249249, 900) },
    { department: 'men', category: 'shoes-boots', img: pexels(19577865, 900) },
    { department: 'women', category: 'shoes-boots', img: pexels(7193634, 900) },
    {
      department: 'men',
      category: 'bags',
      // Pexels 16359299, with the maker's name removed from the patch.
      img: '/images/home/accessories-backpack.jpg',
    },
    { department: 'women', category: 'fragrance', img: pexels(34036480, 900) },
  ],
  location: 'United Kingdom',
  contactEmail: '',
  // Full profile URLs. Empty ones are hidden.
  socials: {
    instagram: '',
    whatsapp: '',
    tiktok: '',
  },
};
