const raw = require('./products.json');
const generated = require('./generatedProducts.json');
const { placementProblem } = require('../../api/config/taxonomy');

// Source product types -> [category, subcategory] in config/taxonomy.json, per
// department (one entry = same in both; "electronics" = that department for
// everyone). Other types (kidswear, sarees, jewellery, homeware, make-up...)
// are left out of the sample shop.
const PLACEMENTS = {
  tshirts: ['clothing', 't-shirts'],
  shirts: { men: ['clothing', 'shirts'], women: ['clothing', 'shirts-blouses'] },
  tops: { women: ['clothing', 'tops'] },
  sweatshirts: ['clothing', 'hoodies-sweatshirts'],
  sweaters: ['clothing', 'knitwear'],
  jeans: ['clothing', 'jeans'],
  trousers: ['clothing', 'trousers'],
  'track-pants': { men: ['clothing', 'joggers'], women: ['activewear', 'joggers'] },
  shorts: { men: ['clothing', 'shorts'], women: ['activewear', 'gym-shorts'] },
  tracksuits: { men: ['clothing', 'tracksuits'], women: ['activewear', 'tracksuits'] },
  skirts: { women: ['clothing', 'skirts'] },
  jumpsuit: { women: ['clothing', 'jumpsuits-playsuits'] },
  'co-ords': { women: ['clothing', 'co-ords'] },
  dresses: { women: ['dresses', 'casual-dresses'] },
  leggings: { women: ['activewear', 'leggings'] },
  jackets: { men: ['coats-jackets', 'bomber-jackets'], women: ['coats-jackets', 'denim-jackets'] },
  coats: { men: ['coats-jackets', 'overcoats'], women: ['coats-jackets', 'wool-coats'] },
  blazers: { men: ['suits-tailoring', 'blazers'], women: ['coats-jackets', 'blazers'] },
  suits: { men: ['suits-tailoring', 'suits'] },
  'casual-shoes': { men: ['shoes-boots', 'casual-shoes'], women: ['shoes-boots', 'trainers'] },
  'sports-shoes': ['shoes-boots', 'trainers'],
  'formal-shoes': { men: ['shoes-boots', 'smart-shoes'] },
  boots: { men: ['shoes-boots', 'boots'], women: ['shoes-boots', 'ankle-boots'] },
  heels: { women: ['shoes-boots', 'heels'] },
  flats: { women: ['shoes-boots', 'flats'] },
  sandals: ['shoes-boots', 'sandals'],
  'sports-sandals': ['shoes-boots', 'sliders'],
  'flip-flops': { men: ['shoes-boots', 'flip-flops'], women: ['shoes-boots', 'sliders'] },
  handbags: { women: ['bags', 'handbags'] },
  clutches: { women: ['bags', 'clutch-bags'] },
  backpacks: ['bags', 'backpacks'],
  'duffel-bag': { men: ['bags', 'holdalls'], women: ['bags', 'luggage'] },
  'trolley-bag': { men: ['bags', 'suitcases'], women: ['bags', 'luggage'] },
  wallets: { men: ['accessories', 'wallets'], women: ['bags', 'purses'] },
  watches: ['accessories', 'watches'],
  'smart-watches': { electronics: ['wearables', 'smart-watches'] },
  headphones: { electronics: ['audio', 'headphones'] },
  sunglasses: ['accessories', 'sunglasses'],
  belts: ['accessories', 'belts'],
  caps: { men: ['accessories', 'caps'], women: ['accessories', 'hats-beanies'] },
  hat: ['accessories', 'hats-beanies'],
  socks: { men: ['accessories', 'socks'], women: ['accessories', 'socks-tights'] },
  scarves: ['accessories', 'scarves'],
  ties: { men: ['suits-tailoring', 'ties-bow-ties'] },
  bra: { women: ['underwear-nightwear', 'bras'] },
  briefs: { men: ['underwear-nightwear', 'briefs'], women: ['underwear-nightwear', 'knickers'] },
  trunk: { men: ['underwear-nightwear', 'trunks'] },
  boxers: { men: ['underwear-nightwear', 'boxers'] },
  'innerwear-vests': { men: ['underwear-nightwear', 'vests'] },
  shapewear: { women: ['underwear-nightwear', 'shapewear'] },
  'night-suits': ['underwear-nightwear', 'pyjamas'],
  nightdress: { women: ['underwear-nightwear', 'nightdresses'] },
  'lounge-pants': ['underwear-nightwear', 'loungewear'],
  'perfume-and-body-mist': { men: ['fragrance', 'aftershave'], women: ['fragrance', 'perfume'] },
  deodorant: ['fragrance', 'deodorant'],
};

// The sample shop's size: enough to browse every menu without a huge database.
const SAMPLE_SIZE = 2000;

// The source is an Indian retailer's catalogue; product names use British English here.
const BRITISH = [
  [/\bTrack ?Pants\b/gi, 'Joggers'],
  [/\bPants\b/g, 'Trousers'],
  [/\bSneakers\b/gi, 'Trainers'],
  [/\bSneaker\b/gi, 'Trainer'],
  [/\bSweaters\b/gi, 'Jumpers'],
  [/\bSweater\b/gi, 'Jumper'],
  [/\bPajamas\b/gi, 'Pyjamas'],
  [/\bPajama\b/gi, 'Pyjama'],
  [/\bNight ?Suits?\b/gi, 'Pyjama Set'],
  [/\bPanties\b/gi, 'Knickers'],
  [/\bInnerwear Vests?\b/gi, 'Vest'],
  [/\bFlip Flops\b/gi, 'Flip-Flops'],
  [/\bT-?shirts?\b/gi, (m) => (/s$/i.test(m) ? 'T-shirts' : 'T-shirt')],
  [/\bColor/g, 'Colour'], // Colored, Colorblocked...
];
const britishName = (name) => BRITISH.reduce((n, [pattern, replacement]) => n.replace(pattern, replacement), String(name || ''));

// Takes products in turn from each department/category/subcategory so even a
// small sample (the e2e tests use the first 400) covers every menu.
const spread = (products, size) => {
  const groups = new Map();
  for (const p of products) {
    const key = `${p.department}/${p.category}/${p.subcategory}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const queues = [...groups.values()];
  const out = [];
  for (let i = 0; out.length < size && queues.some((q) => i < q.length); i += 1) {
    for (const q of queues) if (i < q.length && out.length < size) out.push(q[i]);
  }
  return out;
};

// The source's gender tag ("men-clothing", "unisex-accessories"...).
const departmentOf = (tags) => {
  const tag = tags.find((t) => /^(men|women|unisex)-/.test(t));
  return tag ? tag.split('-')[0] : null;
};

const placementOf = (gender, productTag) => {
  const entry = PLACEMENTS[productTag];
  if (!gender || !entry) return null;
  const department = entry.electronics ? 'electronics' : gender;
  const pair = Array.isArray(entry) ? entry : entry.electronics || entry[gender] || (gender === 'unisex' && (entry.men || entry.women));
  if (!pair) return null;
  const placement = { department, category: pair[0], subcategory: pair[1] };
  return placementProblem(placement) ? null : placement;
};

// The original generator stored the brand in `category`, replaced the real
// sizes with random numbers and randomised `isActive`. This rebuilds the seed
// documents from the scraped source (products.json) and keeps only the
// generated fields that have no source equivalent (stock, material, weight...).
const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const buildProducts = () =>
  spread(
    raw.flatMap((src, i) => {
      const gen = generated[i] || {};
      const tags = splitList(src.tags);
      const placement = placementOf(departmentOf(tags), String(src.product_tag || '').toLowerCase());
      if (!placement) return [];
      const sizes = splitList(src.sizes).filter((s) => !/^one ?size$/i.test(s));
      return {
        name: britishName(src.product_name),
        description: src.meta_description || gen.description || '',
        price: src.marked_price,
        discounted_price: src.discounted_price,
        ...placement,
        brand: src.brand_tag,
        imageUrl: src.img_link,
        stock: Number.isInteger(gen.stock) ? gen.stock : 25,
        weight: gen.weight || 0,
        dimensions: gen.dimensions,
        material: gen.material,
        color: gen.color,
        sizes,
        tags,
        ratings: { averageRating: Number(src.rating) || 0, numberOfReviews: Number(src.rating_count) || 0 },
        isActive: true,
        createdAt: gen.createdAt ? new Date(gen.createdAt) : new Date(),
        updatedAt: gen.updatedAt ? new Date(gen.updatedAt) : new Date(),
      };
    }),
    SAMPLE_SIZE
  );

module.exports = buildProducts;
