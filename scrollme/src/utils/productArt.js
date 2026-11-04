// Drawings shown in place of a photo: the product's type (hoodie, jeans,
// trainer, perfume…) in the product's own colour, with its brand name and an
// "Illustration" label. They are drawn here, so no photo is copied from
// anyone, and a real photo uploaded in Admin always replaces them.

const BACKGROUND = '#f3f2ef';

// Colour words used in product names, with a typical shade for each.
const COLOURS = {
  black: '#1f1f22',
  jet: '#1f1f22',
  onyx: '#26262a',
  ebony: '#2a2522',
  noir: '#1f1f22',
  white: '#f8f8f6',
  snow: '#f6f6f4',
  chalk: '#efede6',
  ivory: '#f2ecdc',
  cream: '#ede3cc',
  ecru: '#e6dcc4',
  egret: '#ece6d6',
  bone: '#e4dccb',
  vanilla: '#efe3c2',
  natural: '#e3d8c1',
  oatmeal: '#d9ccb2',
  oat: '#d9ccb2',
  grey: '#9a9da2',
  gray: '#9a9da2',
  marl: '#a3a6aa',
  heather: '#a6a9ad',
  charcoal: '#3f4247',
  anthracite: '#3a3d41',
  graphite: '#4a4d52',
  slate: '#5e6670',
  silver: '#c3c6cb',
  smoke: '#8e9196',
  ash: '#b6b6b3',
  pewter: '#8a8d90',
  steel: '#71797e',
  iron: '#4b4f54',
  granite: '#6a6c6f',
  concrete: '#a7a6a1',
  asphalt: '#4c4d50',
  castlerock: '#7d7f82',
  navy: '#1f2a44',
  midnight: '#1e2433',
  blue: '#2f5fa7',
  royal: '#2c4fb3',
  cobalt: '#1f4fbf',
  sky: '#8ec3ea',
  denim: '#4a6a8c',
  indigo: '#2e3a6b',
  ink: '#26304a',
  sapphire: '#1f3f8a',
  azure: '#3b82c4',
  powder: '#b3cde6',
  teal: '#1e7b7b',
  turquoise: '#2fb2ad',
  aqua: '#68c9cf',
  petrol: '#1f5560',
  ocean: '#2b5f86',
  storm: '#4f5d6b',
  green: '#2f7d4a',
  olive: '#6b6b3a',
  khaki: '#a39a6b',
  sage: '#9cab8a',
  mint: '#a6dcbf',
  forest: '#244d34',
  lime: '#a6cf3e',
  emerald: '#1f7a4f',
  bottle: '#1f4a35',
  moss: '#5f6b3a',
  pine: '#2a4a3a',
  fern: '#4f7a4a',
  army: '#4b5320',
  camo: '#5f6440',
  jade: '#3a9a76',
  pistachio: '#b5cf9a',
  red: '#c0392b',
  scarlet: '#c62d2d',
  crimson: '#a51f2f',
  burgundy: '#6d1f2b',
  maroon: '#6b1e24',
  wine: '#6a1f2f',
  claret: '#6d1d2e',
  cherry: '#a4202e',
  ruby: '#9b1b30',
  berry: '#8a2a4f',
  redcurrant: '#8e1f2b',
  pink: '#f0a8c0',
  rose: '#e39aac',
  blush: '#efc2c4',
  fuchsia: '#c2307a',
  magenta: '#b8337a',
  petal: '#f2c3cf',
  purple: '#6a3d8f',
  lilac: '#b8a2d4',
  lavender: '#b9a8dc',
  violet: '#7a4fb5',
  plum: '#5e2f52',
  mauve: '#a9849a',
  orange: '#e8762d',
  coral: '#ef7f6c',
  peach: '#f2b494',
  apricot: '#f1b27a',
  rust: '#a8502a',
  terracotta: '#b9603f',
  yellow: '#f2cf3a',
  lemon: '#f4e06a',
  mustard: '#c99a2e',
  gold: '#c9a23c',
  amber: '#d39a3a',
  honey: '#d6a24a',
  brown: '#6b4a2f',
  chocolate: '#4a2f22',
  espresso: '#3b2a22',
  coffee: '#6f4e37',
  mocha: '#7a5b46',
  walnut: '#5d4030',
  tan: '#c19a6b',
  camel: '#c19a6b',
  beige: '#d8c7a6',
  sand: '#d9c39b',
  stone: '#c8bba4',
  taupe: '#8f8172',
  cashew: '#d3b48c',
  putty: '#c9bda8',
  mushroom: '#a99a88',
  nude: '#e0b9a0',
  biscuit: '#d6b98c',
  caramel: '#b9783f',
  cognac: '#9a5a2e',
  chestnut: '#8a4b2a',
  mahogany: '#6a2f22',
  wheat: '#e0c98f',
  sesame: '#d9c7a0',
  linen: '#ebe3d3',
  starlight: '#ece6da',
  multi: '#8d7fbf',
  multicolour: '#8d7fbf',
  print: '#8d7fbf',
  check: '#8b7a62',
};

// Two-word colours that mean something different from their parts.
const PHRASES = {
  'off white': '#efebe0',
  'grey marl': '#a3a6aa',
  'navy blue': '#1f2a44',
  'sky blue': '#8ec3ea',
  'baby blue': '#b6d4ee',
  'light blue': '#a9c8e8',
  'dark blue': '#203a6b',
  'royal blue': '#2c4fb3',
  'bright white': '#fbfbfa',
  'jet black': '#151517',
  'triple black': '#151517',
  'triple white': '#fbfbfa',
  'dark green': '#244d34',
  'light grey': '#c6c8cb',
  'dark grey': '#4b4e53',
  'mid grey': '#8e9196',
  'medium grey': '#8e9196',
  'light pink': '#f4c6d4',
  'hot pink': '#e0457b',
  'baby pink': '#f6c9d6',
  'polo black': '#1f1f22',
  'cruise navy': '#1f2a44',
  'newport navy': '#1f2a44',
  'dark night navy': '#18213a',
  wash: '#5b7a9c',
  'light wash': '#8aa7c4',
  'mid wash': '#5b7a9c',
  'dark wash': '#33496a',
  'black wash': '#2e2f33',
};

const DEFAULT_COLOUR = '#9a9da2';

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (rgb) => '#' + rgb.map((n) => clamp(n).toString(16).padStart(2, '0')).join('');
const mix = (hex, target, amount) => {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * amount));
};
const darken = (hex, amount) => mix(hex, '#000000', amount);
const lighten = (hex, amount) => mix(hex, '#ffffff', amount);
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

// "Dark Night Navy" -> a dark navy; "Light Grey Heather" -> a light grey.
const shadeFor = (part) => {
  const text = part
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  for (const [phrase, hex] of Object.entries(PHRASES)) {
    if (` ${text} `.includes(` ${phrase} `)) return hex;
  }
  const words = text.split(' ');
  let hex = null;
  for (let i = words.length - 1; i >= 0 && !hex; i -= 1) hex = COLOURS[words[i]] || null;
  if (!hex) return null;
  if (/\b(light|pale|soft|washed|faded|ice|icy)\b/.test(text)) hex = lighten(hex, 0.35);
  else if (/\b(dark|deep|night|rich)\b/.test(text)) hex = darken(hex, 0.3);
  return hex;
};

// The colour name is the product's colour field, or what follows " – " in its name.
export const colourName = (item = {}) => {
  const own = item.color || item.colour;
  if (own) return own;
  const name = item.name || '';
  const at = name.lastIndexOf(' – ');
  return at > 0 ? name.slice(at + 3) : '';
};

export const coloursFor = (item) => {
  const parts = colourName(item).split('/').map(shadeFor).filter(Boolean);
  const main = parts[0] || DEFAULT_COLOUR;
  return { main, trim: parts[1] || null, last: parts.length > 1 ? parts[parts.length - 1] : null };
};

// Which drawing to use, from the product's menu and, failing that, its name.
const SHORTS = /\bshorts?\b(?![\s-]*sleeve)/;
const BY_MENU = {
  headphones: 'headphones',
  earbuds: 'earbuds',
  controllers: 'controller',
  consoles: 'console',
  'knee-high-boots': 'tall-boot',
  boots: 'boot',
  'ankle-boots': 'boot',
  heels: 'heel',
  sliders: 'slider',
  sandals: 'slider',
  'flip-flops': 'slider',
  mules: 'slider',
  slippers: 'slider',
  'smart-shoes': 'smart-shoe',
  loafers: 'smart-shoe',
  flats: 'smart-shoe',
  trainers: 'trainer',
  'running-shoes': 'trainer',
  'casual-shoes': 'trainer',
  tracksuits: 'tracksuit',
  jeans: 'jeans',
  joggers: 'joggers',
  leggings: 'trousers',
  shorts: 'shorts',
  'gym-shorts': 'shorts',
  'polo-shirts': 'polo',
  't-shirts': 'tshirt',
  'gym-tops': 'tshirt',
};
const fromName = (name) => {
  if (/\b(eau de|parfum|perfume|cologne|aftershave|edp|edt)\b/.test(name)) return 'bottle';
  if (/headphone/.test(name)) return 'headphones';
  if (/airpods|earbuds/.test(name)) return 'earbuds';
  if (/controller/.test(name)) return 'controller';
  if (/console/.test(name)) return 'console';
  if (/football boot|firm ground|astro/.test(name)) return 'trainer';
  if (/\bboots?\b/.test(name)) return 'boot';
  if (/\b(heels?|pumps?|stiletto)\b/.test(name)) return 'heel';
  if (/slider|sandal|flip.?flop|\bmules?\b|slipper/.test(name)) return 'slider';
  if (/loafer|derby|brogue|oxford|ballet/.test(name)) return 'smart-shoe';
  if (/trainer|sneaker|runner|running shoe/.test(name)) return 'trainer';
  if (/tracksuit(?! (top|jacket|bottom))/.test(name)) return 'tracksuit';
  if (SHORTS.test(name)) return 'shorts';
  if (/\bjeans?\b/.test(name)) return 'jeans';
  if (/jogger|sweatpant|track ?pant|tracksuit bottom|jogging bottom/.test(name)) return 'joggers';
  if (/trouser|chino|\bpants?\b|legging/.test(name)) return 'trousers';
  if (/hood|hoody/.test(name)) return /zip/.test(name) ? 'zip-hoodie' : 'hoodie';
  if (/\bpolo|rugby/.test(name)) return 'polo';
  if (/sweat|jumper|crew neck|fleece|cardigan|quarter.?zip|1\/4 zip/.test(name)) return /zip/.test(name) ? 'zip-sweat' : 'sweatshirt';
  if (/t-shirt|\btee\b|\btop\b|shirt|vest/.test(name)) return 'tshirt';
  return null;
};
export const artType = (item = {}) => {
  const sub = (item.subcategory || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  if (cat === 'fragrance') return 'bottle';
  // Football boots are listed with trainers and boots; draw them as trainers.
  if (cat === 'shoes-boots' && /football|firm ground/.test(name)) return 'trainer';
  if (BY_MENU[sub]) return BY_MENU[sub];
  // Menus that hold more than one kind of item: the name decides.
  if (sub === 'hoodies-sweatshirts' || sub === 'hoodies' || sub === 'knitwear') {
    if (/hood|hoody/.test(name)) return /zip/.test(name) ? 'zip-hoodie' : 'hoodie';
    return /zip/.test(name) ? 'zip-sweat' : 'sweatshirt';
  }
  if (sub === 'trousers') return SHORTS.test(name) ? 'shorts' : 'trousers';
  if (cat === 'shoes-boots') return fromName(name) || 'trainer';
  return fromName(name) || 'tag';
};

// ---- Drawings (300 x 400, product centred in the top 330) ----

const p = (d, fill, stroke, extra = '') =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round" ${extra}/>`;
const line = (d, stroke, width = 2.5, extra = '') =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

const TEE = 'M112 72 L76 86 L36 132 L66 168 L92 150 L92 316 L208 316 L208 150 L234 168 L264 132 L224 86 L188 72 Q150 104 112 72 Z';
const SWEAT = 'M110 74 L74 88 L44 246 L74 254 L94 160 L94 304 L206 304 L206 160 L226 254 L256 246 L226 88 L190 74 Q150 100 110 74 Z';

const drawings = {
  tshirt: ({ main, trim, edge, detail }) =>
    p(TEE, main, edge) +
    line('M112 72 Q150 104 188 72', trim || detail, 6, 'stroke-opacity="0.6"') +
    line('M66 168 L92 150 M234 168 L208 150', detail, 2, 'stroke-opacity="0.35"'),

  polo: ({ main, trim, edge, detail }) =>
    p(TEE, main, edge) +
    p('M142 96 L158 96 L158 152 L142 152 Z', main, detail, 'stroke-opacity="0.5"') +
    [112, 128, 144].map((y) => `<circle cx="150" cy="${y}" r="2.6" fill="${detail}"/>`).join('') +
    p('M114 70 L150 96 L130 120 L102 82 Z', trim || main, edge) +
    p('M186 70 L150 96 L170 120 L198 82 Z', trim || main, edge) +
    line('M66 168 L92 150 M234 168 L208 150', trim || detail, 4, 'stroke-opacity="0.5"'),

  sweatshirt: ({ main, trim, edge, detail }) => {
    const rib = trim || darken(main, 0.08);
    return (
      p(SWEAT, main, edge) +
      p('M44 246 L74 254 L71 270 L40 262 Z', rib, edge) +
      p('M256 246 L226 254 L229 270 L260 262 Z', rib, edge) +
      p('M94 300 L206 300 L206 318 L94 318 Z', rib, edge) +
      line('M110 74 Q150 100 190 74', trim || detail, 7, 'stroke-opacity="0.5"')
    );
  },

  'zip-sweat': (c) =>
    drawings.sweatshirt(c) +
    line('M150 92 L150 300', c.detail, 3) +
    `<rect x="146" y="98" width="8" height="14" rx="2" fill="${c.detail}"/>`,

  hoodie: ({ main, trim, edge, detail }) => {
    const rib = trim || darken(main, 0.08);
    return (
      p('M108 82 Q100 30 150 24 Q200 30 192 82 Z', main, edge) +
      p(SWEAT, main, edge) +
      p('M120 80 Q150 40 180 80 Q150 100 120 80 Z', darken(main, 0.35), edge) +
      p('M44 246 L74 254 L71 270 L40 262 Z', rib, edge) +
      p('M256 246 L226 254 L229 270 L260 262 Z', rib, edge) +
      p('M94 300 L206 300 L206 318 L94 318 Z', rib, edge) +
      line('M112 232 L188 232 L200 288 L100 288 Z', detail, 2.5, 'stroke-opacity="0.45"') +
      line('M140 94 L137 150 M160 94 L163 150', trim || lighten(detail, 0.2), 3)
    );
  },

  'zip-hoodie': (c) =>
    drawings.hoodie({ ...c, trim: c.trim }).replace(/<path d="M112 232[^>]*\/>/, '') +
    line('M150 96 L150 300', c.detail, 3) +
    line('M108 236 L140 236 M192 236 L160 236', c.detail, 2.5, 'stroke-opacity="0.45"'),

  trousers: ({ main, trim, edge, detail }) =>
    p('M92 82 L208 82 L218 330 L162 330 L150 150 L138 330 L82 330 Z', main, edge) +
    p('M92 64 L208 64 L208 84 L92 84 Z', trim || main, edge) +
    line('M150 84 L150 132', detail, 2, 'stroke-opacity="0.45"'),

  joggers: ({ main, trim, edge, detail }) => {
    const rib = trim || darken(main, 0.08);
    return (
      p('M92 82 L208 82 L204 318 L164 318 L150 156 L136 318 L96 318 Z', main, edge) +
      p('M92 62 L208 62 L208 84 L92 84 Z', rib, edge) +
      p('M96 316 L136 316 L134 336 L98 336 Z', rib, edge) +
      p('M164 316 L204 316 L202 336 L166 336 Z', rib, edge) +
      line('M142 84 L140 112 M158 84 L160 112', trim || detail, 2.5) +
      line('M100 100 Q112 118 120 96 M200 100 Q188 118 180 96', detail, 2, 'stroke-opacity="0.4"')
    );
  },

  jeans: ({ main, edge }) => {
    const stitch = '#d7a447';
    return (
      p('M92 82 L208 82 L216 330 L162 330 L150 150 L138 330 L84 330 Z', main, edge) +
      p('M92 64 L208 64 L208 84 L92 84 Z', main, edge) +
      line('M96 86 Q116 112 134 88 M204 86 Q184 112 166 88', stitch, 2, 'stroke-dasharray="4 3"') +
      line('M150 84 L150 126 Q150 136 140 138', stitch, 2, 'stroke-dasharray="4 3"') +
      line('M92 74 L208 74', stitch, 1.5, 'stroke-dasharray="4 3"') +
      [104, 128, 172, 196]
        .map((x) => `<rect x="${x - 3}" y="61" width="6" height="26" rx="1.5" fill="${main}" stroke="${edge}" stroke-width="2"/>`)
        .join('') +
      `<circle cx="150" cy="74" r="4" fill="${stitch}"/>`
    );
  },

  shorts: ({ main, trim, edge, detail }) =>
    p('M92 112 L208 112 L222 240 L160 246 L150 178 L140 246 L78 240 Z', main, edge) +
    p('M92 94 L208 94 L208 114 L92 114 Z', trim || darken(main, 0.08), edge) +
    line('M142 114 L140 140 M158 114 L160 140', trim || detail, 2.5) +
    line('M82 226 L140 232 M218 226 L160 232', detail, 2, 'stroke-opacity="0.35"'),

  tracksuit: (c) =>
    `<g transform="translate(-14 52) scale(0.6)">${drawings['zip-sweat'](c)}</g>` +
    `<g transform="translate(120 74) scale(0.58)">${drawings.joggers(c)}</g>`,

  trainer: ({ main, last, edge, detail }) => {
    const sole = last || '#f4f4f2';
    const soleEdge = luminance(sole) > 0.6 ? '#b9b9b6' : darken(sole, 0.35);
    const lace = luminance(main) < 0.22 ? lighten(main, 0.55) : lighten(main, 0.45);
    return (
      p('M48 262 Q44 238 72 230 L130 214 Q152 196 178 186 Q198 174 222 176 Q240 178 248 196 Q258 226 256 262 Z', main, edge) +
      p('M180 186 Q204 198 236 190 Q232 180 222 178 Q198 176 180 186 Z', darken(main, 0.45), edge) +
      p('M38 262 L262 262 Q272 262 272 272 L272 280 Q272 292 260 292 L56 292 Q34 292 36 274 Z', sole, soleEdge) +
      line('M38 278 L272 278', soleEdge, 1.5) +
      line('M50 262 Q58 244 86 238', detail, 2.5, 'stroke-opacity="0.45"') +
      line('M104 252 Q160 230 236 242', detail, 2.5, 'stroke-opacity="0.4"') +
      [0, 1, 2, 3].map((i) => line(`M${134 + i * 12} ${212 - i * 7} L${146 + i * 12} ${224 - i * 7}`, lace, 3)).join('') +
      line('M244 196 Q256 214 255 236', detail, 2.5, 'stroke-opacity="0.5"')
    );
  },

  boot: ({ main, trim, edge, detail }, tall = false) => {
    const top = tall ? 40 : 96;
    const sole = trim || darken(main, 0.45);
    return (
      p(
        `M70 262 Q66 214 96 206 L128 200 L132 ${top + 8} Q132 ${top} 140 ${top} L208 ${top} Q216 ${top} 216 ${top + 8} L222 196 Q252 214 250 262 Z`,
        main,
        edge
      ) +
      p('M56 262 L262 262 L262 290 Q262 300 250 300 L64 300 Q52 300 52 288 Z', sole, darken(sole, 0.3)) +
      (tall
        ? ''
        : [0, 1, 2, 3, 4]
            .map((i) => line(`M144 ${126 + i * 16} L204 ${126 + i * 16}`, lighten(detail, 0.15), 2.5, 'stroke-opacity="0.6"'))
            .join('')) +
      line(`M214 ${top + 4} L230 ${top - 10}`, detail, 3)
    );
  },

  'tall-boot': (c) => drawings.boot(c, true),

  'smart-shoe': ({ main, edge, detail }) =>
    p('M54 262 Q54 224 104 214 L176 204 Q232 198 250 230 Q260 246 254 262 Z', main, edge) +
    p('M48 262 L258 262 Q266 262 266 270 Q266 278 256 278 L58 278 Q46 278 46 270 Z', '#2b2420', '#1a1512') +
    p('M212 278 L252 278 L250 292 L214 292 Z', '#2b2420', '#1a1512') +
    line('M192 214 Q214 224 240 228', detail, 2.5, 'stroke-opacity="0.55"') +
    line('M96 232 Q120 222 150 220', detail, 2, 'stroke-opacity="0.35"'),

  heel: ({ main, edge }) =>
    p(
      'M58 270 Q60 246 92 240 Q130 236 166 248 Q196 234 214 206 L246 194 Q250 222 236 236 Q200 270 150 278 L64 278 Q56 278 58 270 Z',
      main,
      edge
    ) + p('M226 238 L240 236 L237 306 L230 306 Z', darken(main, 0.3), edge),

  slider: ({ main, trim, edge }) => {
    const bed = trim || darken(main, 0.25);
    return (
      p('M40 270 Q40 258 62 258 L246 258 Q268 258 268 270 Q268 284 246 284 L62 284 Q40 284 40 270 Z', bed, darken(bed, 0.3)) +
      p('M96 260 Q104 226 156 222 Q204 226 212 260 L196 260 Q190 240 156 238 Q116 240 112 260 Z', main, edge)
    );
  },

  bottle: ({ main, edge }) => {
    const glass = main === DEFAULT_COLOUR ? '#d8b35a' : main;
    return (
      `<rect x="88" y="150" width="124" height="170" rx="16" fill="${glass}" stroke="${darken(glass, 0.35)}" stroke-width="2.5"/>` +
      `<rect x="100" y="162" width="100" height="146" rx="10" fill="#ffffff" fill-opacity="0.18"/>` +
      `<rect x="132" y="126" width="36" height="26" fill="#d9d9d6" stroke="#8f8f8c" stroke-width="2"/>` +
      `<rect x="116" y="70" width="68" height="60" rx="8" fill="#2b2b2b" stroke="${edge}" stroke-width="2"/>` +
      `<rect x="114" y="212" width="72" height="50" rx="4" fill="#ffffff" fill-opacity="0.85"/>`
    );
  },

  headphones: ({ main, edge }) =>
    line('M84 214 Q84 92 150 92 Q216 92 216 214', main, 16) +
    line('M84 214 Q84 92 150 92 Q216 92 216 214', edge, 2, 'stroke-opacity="0.4"') +
    `<rect x="62" y="196" width="48" height="96" rx="20" fill="${main}" stroke="${edge}" stroke-width="2.5"/>` +
    `<rect x="190" y="196" width="48" height="96" rx="20" fill="${main}" stroke="${edge}" stroke-width="2.5"/>` +
    `<rect x="100" y="206" width="12" height="76" rx="6" fill="${darken(main, 0.3)}"/>` +
    `<rect x="188" y="206" width="12" height="76" rx="6" fill="${darken(main, 0.3)}"/>`,

  earbuds: ({ main, edge }) =>
    `<rect x="96" y="160" width="108" height="130" rx="44" fill="${main}" stroke="${edge}" stroke-width="2.5"/>` +
    line('M98 200 L202 200', edge, 2, 'stroke-opacity="0.5"') +
    `<circle cx="150" cy="240" r="3" fill="#7fc97f"/>`,

  console: ({ main, edge }) =>
    `<rect x="112" y="66" width="76" height="266" rx="20" fill="${main}" stroke="${edge}" stroke-width="2.5"/>` +
    `<rect x="140" y="66" width="20" height="266" fill="${darken(main, 0.7)}"/>`,

  controller: ({ main, edge, detail }) =>
    p(
      'M70 200 Q80 160 120 166 L180 166 Q220 160 230 200 L248 262 Q254 294 226 298 Q204 300 192 272 L108 272 Q96 300 74 298 Q46 294 52 262 Z',
      main,
      edge
    ) +
    `<circle cx="114" cy="226" r="16" fill="${darken(main, 0.3)}"/><circle cx="186" cy="226" r="16" fill="${darken(main, 0.3)}"/>` +
    line('M96 196 L112 196 M104 188 L104 204', detail, 3) +
    [
      [196, 190],
      [208, 202],
      [196, 214],
      [184, 202],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${detail}"/>`)
      .join(''),

  tag: ({ main, edge }) =>
    p('M96 110 L196 110 L236 160 L196 210 L96 210 Q84 210 84 198 L84 122 Q84 110 96 110 Z', main, edge) +
    `<circle cx="196" cy="160" r="9" fill="${BACKGROUND}" stroke="${edge}" stroke-width="2.5"/>`,
};

const escapeXml = (text) =>
  String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const cache = new Map();

// A data URL for the product's drawing.
export const productArt = (item = {}) => {
  const type = artType(item);
  const { main, trim, last } = coloursFor(item);
  const brand = (item.brand || '').trim().slice(0, 28);
  const key = `${type}|${main}|${trim}|${last}|${brand}`;
  if (cache.has(key)) return cache.get(key);

  const dark = luminance(main) < 0.22;
  const colours = {
    main,
    trim,
    last,
    edge: dark ? '#0f0f10' : darken(main, 0.38),
    detail: dark ? lighten(main, 0.4) : darken(main, 0.38),
  };
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 300 400">' +
    `<rect width="300" height="400" fill="${BACKGROUND}"/>` +
    drawings[type](colours) +
    (brand
      ? `<text x="150" y="362" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="600" letter-spacing="2.5" fill="#6b6b6b" text-anchor="middle">${escapeXml(brand.toUpperCase())}</text>`
      : '') +
    '<text x="150" y="384" font-family="Inter, Arial, sans-serif" font-size="9" letter-spacing="2" fill="#a3a3a3" text-anchor="middle">ILLUSTRATION</text>' +
    '</svg>';
  const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  if (cache.size > 500) cache.clear();
  cache.set(key, url);
  return url;
};
