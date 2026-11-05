import { brandSections, findSection, sectionLink, sectionsOf } from './brandSections';
import { findDepartment } from './utils/taxonomy';

test("the women's activewear brands section has its own link under Women", () => {
  const s = findSection('women', 'activewear-brands');
  expect(s.brands).toEqual(['Sweaty Betty', 'Gymshark', 'Vuori', 'Girlfriend Collective', 'PE Nation', 'Juicy Couture']);
  expect(sectionLink(s)).toBe('/women/activewear-brands');
  expect(sectionsOf('women')).toContain(s);
  expect(findSection('electronics', 'activewear-brands')).toBeNull();
  expect(sectionsOf('electronics')).toEqual([]);
});

test("the men's activewear brands section has its own link under Men", () => {
  const s = findSection('men', 'activewear-brands');
  expect(s.brands).toEqual(['Gymshark', 'Vuori', 'Castore', 'Gym King']);
  expect(sectionLink(s)).toBe('/men/activewear-brands');
});

test('section slugs never hide a category page of the same department', () => {
  for (const s of brandSections) {
    expect(findDepartment(s.department).categories.map((c) => c.slug)).not.toContain(s.slug);
  }
});
