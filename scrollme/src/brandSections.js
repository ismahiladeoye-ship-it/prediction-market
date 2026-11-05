// Brand sections: a page under a department that gathers chosen brands'
// products from every category, with its own menu link.
export const brandSections = [
  {
    slug: 'activewear-brands',
    department: 'women',
    title: 'Activewear brands',
    intro: 'Leggings, sports bras, gym tops, hoodies and joggers from the activewear names everyone wants.',
    brands: ['Sweaty Betty', 'Gymshark', 'Vuori', 'Girlfriend Collective', 'PE Nation', 'Juicy Couture'],
  },
  {
    slug: 'activewear-brands',
    department: 'men',
    title: 'Activewear brands',
    intro: 'Gym tops, shorts, joggers, hoodies and base layers from the training brands that take it seriously.',
    brands: ['Gymshark', 'Vuori', 'Castore', 'Gym King'],
  },
];

export const sectionsOf = (department) => brandSections.filter((s) => s.department === department);
export const findSection = (department, slug) => brandSections.find((s) => s.department === department && s.slug === slug) || null;
export const sectionLink = (section) => `/${section.department}/${section.slug}`;
