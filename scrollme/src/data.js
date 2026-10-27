const pexels = (id, w = 1600) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
const unsplash = (id, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=70&w=${w}`;

// Everything a shop owner is likely to edit, in one place.
export const storeConfig = {
  name: 'Get It Sourced',
  // Rotating messages in the bar above the header. Only state what is true:
  // keep the delivery wording in line with FREE_SHIPPING_THRESHOLD and SHIP_TO_COUNTRIES in the API.
  announcements: ['FREE UK DELIVERY ON ORDERS OVER £100', '30-DAY RETURNS', 'PAY WITH CARD, APPLE PAY, PAYPAL OR KLARNA'],
  // Shown under "Add to bag" on product pages (icon: delivery, returns or check).
  perks: [
    { icon: 'delivery', text: 'Free UK delivery over £100' },
    { icon: 'returns', text: '30-day returns' },
  ],
  // Show the hero photos in black and white, to match the store's monochrome look.
  heroMono: true,
  // Home page hero. Photos: Pexels or Unsplash licence (free for commercial use), product
  // only (no people). The footwear slide shows ASICS GEL trainers (Unsplash, Indrajeet
  // Choudhary), which read as black in the monochrome hero.
  heroSlides: [
    {
      id: 'footwear',
      title: 'Footwear, sourced',
      subtitle: 'Fresh pairs, ready to ship',
      cta: 'Shop',
      link: '/products?category=shoes-boots',
      img: unsplash('photo-1572710029599-1e1ffe84493f'),
      position: 'center 40%',
    },
    {
      id: 'outerwear',
      title: 'Built for the cold',
      subtitle: 'Puffers, jackets and layers',
      cta: 'Shop',
      link: '/products?category=coats-jackets',
      img: pexels(6045058),
      position: 'center 45%',
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
  // Home page, one entry per section in display order: a card in "Shop by
  // category" and a row of that department's category with shortcut buttons.
  // A shortcut opens a subcategory, or with `search` the category's search
  // results (e.g. a brand). Sections and subcategory shortcuts with no products
  // are hidden. Departments and categories: src/taxonomy.json.
  homeSections: [
    {
      department: 'men',
      category: 'clothing',
      img: pexels(31961168, 900),
      shortcuts: [
        { label: 'Hoodies & sweatshirts', subcategory: 'hoodies-sweatshirts' },
        { label: 'T-shirts', subcategory: 't-shirts' },
        { label: 'Tracksuits', subcategory: 'tracksuits' },
        { label: 'Joggers', subcategory: 'joggers' },
        { label: 'Jeans', subcategory: 'jeans' },
      ],
    },
    {
      department: 'women',
      category: 'clothing',
      img: pexels(2249249, 900),
      shortcuts: [
        { label: 'Tops', subcategory: 'tops' },
        { label: 'Hoodies & sweatshirts', subcategory: 'hoodies-sweatshirts' },
        { label: 'Jeans', subcategory: 'jeans' },
        { label: 'Co-ords', subcategory: 'co-ords' },
        { label: 'Jumpers & cardigans', subcategory: 'knitwear' },
      ],
    },
    {
      department: 'men',
      category: 'shoes-boots',
      img: pexels(19577865, 900),
      shortcuts: [
        { label: 'ASICS', search: 'asics' },
        { label: 'UGG Tasman', search: 'ugg tasman' },
        // Not "lv": searches match inside words (silver, velvet).
        { label: 'LV', search: 'louis vuitton' },
        { label: 'Dior B30', search: 'dior b30' },
      ],
    },
    {
      department: 'women',
      category: 'shoes-boots',
      img: pexels(7193634, 900),
      shortcuts: [
        { label: 'ASICS', search: 'asics' },
        { label: 'UGG Tasman', search: 'ugg tasman' },
        { label: 'LV', search: 'louis vuitton' },
        { label: 'Dior B30', search: 'dior b30' },
      ],
    },
    {
      department: 'men',
      category: 'bags',
      // Pexels 16359299, with the maker's name removed from the patch.
      img: '/images/home/accessories-backpack.jpg',
      shortcuts: [
        { label: 'Backpacks', subcategory: 'backpacks' },
        { label: 'Crossbody bags', subcategory: 'crossbody-bags' },
        { label: 'Bum bags', subcategory: 'bum-bags' },
        { label: 'Holdalls', subcategory: 'holdalls' },
      ],
    },
    {
      department: 'women',
      category: 'fragrance',
      img: pexels(34036480, 900),
      shortcuts: [
        { label: 'Perfume', subcategory: 'perfume' },
        { label: 'Body mist', subcategory: 'body-mist' },
        { label: 'Gift sets', subcategory: 'gift-sets' },
      ],
    },
  ],
  // Split image-and-text section on the home page. Edit or set to null to hide.
  feature: {
    title: "Can't find it? We'll source it",
    text: "Tell us the piece, size and budget you're after and we'll look for it for you.",
    cta: 'Send a request',
    link: '/contact-us?type=sourcing',
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
