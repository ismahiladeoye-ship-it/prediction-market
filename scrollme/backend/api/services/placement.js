const { DEPARTMENT_SLUGS, PRODUCT_DEPARTMENTS, departmentsFor, findDepartment } = require('../config/taxonomy');

// Turns everyday spreadsheet words ("Men's", "Hoodie", "Sneakers") into the
// department, category and subcategory slugs of config/taxonomy.json.

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const DEPARTMENT_ALIASES = {
  men: 'men',
  mens: 'men',
  'men-s': 'men',
  man: 'men',
  male: 'men',
  m: 'men',
  gents: 'men',
  women: 'women',
  womens: 'women',
  'women-s': 'women',
  woman: 'women',
  ladies: 'women',
  female: 'women',
  w: 'women',
  unisex: 'unisex',
  both: 'unisex',
  'men-and-women': 'unisex',
};

const CATEGORY_ALIASES = {
  footwear: 'shoes-boots',
  shoes: 'shoes-boots',
  coats: 'coats-jackets',
  jackets: 'coats-jackets',
  outerwear: 'coats-jackets',
  sportswear: 'activewear',
  gym: 'activewear',
  luggage: 'bags',
  jewellery: 'jewellery-watches',
  jewelry: 'jewellery-watches',
  'watches-and-jewellery': 'jewellery-watches',
  fragrances: 'fragrance',
  grooming: 'fragrance',
  beauty: 'fragrance',
  underwear: 'underwear-nightwear',
  lingerie: 'underwear-nightwear',
  nightwear: 'underwear-nightwear',
  'lingerie-and-nightwear': 'underwear-nightwear',
  tailoring: 'suits-tailoring',
};

// Each everyday word can mean a different subcategory in each department.
const SUBCATEGORY_ALIASES = {
  tee: ['t-shirts'],
  tees: ['t-shirts'],
  tshirt: ['t-shirts'],
  tshirts: ['t-shirts'],
  hoodie: ['hoodies-sweatshirts', 'hoodies'],
  hoodies: ['hoodies-sweatshirts', 'hoodies'],
  sweatshirt: ['hoodies-sweatshirts'],
  sweatshirts: ['hoodies-sweatshirts'],
  jumper: ['knitwear'],
  jumpers: ['knitwear'],
  sweater: ['knitwear'],
  sweaters: ['knitwear'],
  cardigan: ['knitwear'],
  cardigans: ['knitwear'],
  'track-pants': ['joggers'],
  trackies: ['joggers'],
  sneaker: ['trainers'],
  sneakers: ['trainers'],
  puffer: ['puffer-jackets'],
  puffers: ['puffer-jackets'],
  beanie: ['hats-beanies'],
  beanies: ['hats-beanies'],
  hat: ['hats-beanies'],
  hats: ['hats-beanies'],
  perfume: ['perfume', 'aftershave'],
  aftershave: ['aftershave', 'perfume'],
  cologne: ['aftershave', 'perfume'],
  necklace: ['necklaces', 'chains-necklaces'],
  necklaces: ['necklaces', 'chains-necklaces'],
  chain: ['chains-necklaces', 'necklaces'],
  chains: ['chains-necklaces', 'necklaces'],
  slides: ['sliders'],
  wallet: ['wallets', 'purses'],
  purse: ['purses', 'wallets'],
};

const toDepartment = (value) => {
  const slug = slugify(value);
  return DEPARTMENT_ALIASES[slug] || slug;
};

// Subcategory slugs a word may stand for, most likely first.
const subcategoryKeys = (slug) => [...(SUBCATEGORY_ALIASES[slug] || []), slug, `${slug}s`, slug.replace(/s$/, '')];

// An unknown or missing department searches both (validation reports it).
const departmentsToSearch = (department) => (PRODUCT_DEPARTMENTS.includes(department) ? departmentsFor(department) : DEPARTMENT_SLUGS);

const categoriesOf = (department) => departmentsToSearch(department).flatMap((d) => findDepartment(d).categories);

const findCategoryWord = (department, word) => {
  const slug = slugify(word);
  const target = CATEGORY_ALIASES[slug] || slug;
  return categoriesOf(department).find((c) => c.slug === target || slugify(c.title) === slug)?.slug;
};

// The first subcategory (in `category`, if given) that the word names.
const findSubcategoryWord = (department, category, word) => {
  const keys = subcategoryKeys(slugify(word));
  const categories = categoriesOf(department).filter((c) => !category || c.slug === category);
  for (const key of keys) {
    for (const c of categories) {
      const sub = c.subcategories.find((s) => s.slug === key || slugify(s.title) === key);
      if (sub) return { category: c.slug, subcategory: sub.slug };
    }
  }
  return null;
};

// { department, category, subcategory } as slugs. Words that match nothing are
// returned slugified so validation can explain what is allowed.
const resolvePlacement = ({ department, category, subcategory }) => {
  const out = {};
  if (department) out.department = toDepartment(department);
  if (category) {
    const cat = findCategoryWord(out.department, category);
    if (cat) out.category = cat;
    else {
      // "Hoodies" in the category column: find the category that contains it.
      const found = findSubcategoryWord(out.department, null, category);
      if (found) Object.assign(out, subcategory ? { category: found.category } : found);
      else out.category = slugify(category);
    }
  }
  if (subcategory) {
    const found = findSubcategoryWord(out.department, out.category, subcategory);
    out.subcategory = found ? found.subcategory : slugify(subcategory);
    if (found && !out.category) out.category = found.category;
  }
  return out;
};

module.exports = { slugify, toDepartment, resolvePlacement };
