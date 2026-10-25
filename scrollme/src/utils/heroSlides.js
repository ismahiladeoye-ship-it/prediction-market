import { storeConfig } from '../data';

// Which part of a cover photo stays in view when it is cropped.
export const FOCUS_POSITIONS = { top: 'center 20%', center: 'center', bottom: 'center 80%' };

// The slides built into the shop (storeConfig), shown until an admin saves their own.
export const starterHero = () => ({
  slides: storeConfig.heroSlides.map(({ img, title, subtitle, cta, link, position }) => ({
    image: img,
    title,
    subtitle,
    cta,
    link,
    position,
  })),
  mono: storeConfig.heroMono,
});

// The home page content from the API, or the starter slides when there is none.
export const toHero = (content) => {
  if (!content?.heroSlides?.length) return starterHero();
  return {
    slides: content.heroSlides.map((s) => ({ ...s, position: FOCUS_POSITIONS[s.focus] || 'center' })),
    mono: content.heroMono ?? storeConfig.heroMono,
  };
};
