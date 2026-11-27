// Logos for the home page brands banner, white on a clear background, in display
// order. `ratio` is width / height, used to size the logos evenly.
// - Nike and adidas: drawings from Simple Icons (simpleicons.org, CC0), cropped
//   to the mark. The trademarks belong to their owners.
// - The rest: files the owner supplied (Nov 2026), made white, in public/brand-logos.
// To add one: put a white PNG in public/brand-logos and add { name, src, ratio }.
const brandLogos = [
  {
    name: 'Nike',
    viewBox: '0 7.8 24 8.401',
    ratio: 2.857,
    path: 'M24 7.8L6.442 15.276c-1.456.616-2.679.925-3.668.925-1.12 0-1.933-.392-2.437-1.177-.317-.504-.41-1.143-.28-1.918.13-.775.476-1.6 1.036-2.478.467-.71 1.232-1.643 2.297-2.8a6.122 6.122 0 00-.784 1.848c-.28 1.195-.028 2.072.756 2.632.373.261.886.392 1.54.392.522 0 1.11-.084 1.764-.252L24 7.8z',
  },
  {
    name: 'adidas',
    viewBox: '0 4.465 24 15.07',
    ratio: 1.593,
    path: 'm24 19.535-8.697-15.07-4.659 2.687 7.145 12.383Zm-8.287 0L9.969 9.59 5.31 12.277l4.192 7.258ZM4.658 14.723l2.776 4.812H1.223L0 17.41Z',
  },
  { name: 'ASICS', src: '/brand-logos/asics.png', ratio: 2.6 },
  { name: 'Alo', src: '/brand-logos/alo.png', ratio: 1.431 },
  { name: 'lululemon', src: '/brand-logos/lululemon.png', ratio: 4.806 },
  { name: 'Chrome Hearts', src: '/brand-logos/chromehearts.png', ratio: 0.945 },
  { name: 'Selfridges & Co', src: '/brand-logos/selfridges.png', ratio: 4.423 },
  { name: 'House of Fraser', src: '/brand-logos/houseoffraser.png', ratio: 2.325 },
];

export default brandLogos;
