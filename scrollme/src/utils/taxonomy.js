// Men and Women, their categories and subcategories (the same data as the
// API's config/taxonomy.json). Unisex products are listed under both.
import taxonomy from '../taxonomy.json';
import { humanize } from './format';

export const departments = taxonomy.departments;

export const findDepartment = (slug) => departments.find((d) => d.slug === slug);
export const findCategory = (department, category) => findDepartment(department)?.categories.find((c) => c.slug === category);
export const findSubcategory = (department, category, subcategory) =>
  findCategory(department, category)?.subcategories.find((s) => s.slug === subcategory);

export const departmentLink = (department) => `/${department}`;
export const categoryLink = (department, category) => `/${department}/${category}`;
export const subcategoryLink = (department, category, subcategory) => `/${department}/${category}/${subcategory}`;

// Departments to look a product's category up in (unisex or unknown: both).
const lookIn = (department) => (findDepartment(department) ? [department] : departments.map((d) => d.slug));

// Categories of one department, or of both (merged by slug) when none is given.
export const categoriesOf = (department) => {
  const seen = new Map();
  for (const d of lookIn(department)) for (const c of findDepartment(d).categories) if (!seen.has(c.slug)) seen.set(c.slug, c);
  return [...seen.values()];
};

export const subcategoriesOf = (department, category) => {
  const seen = new Map();
  for (const d of lookIn(department))
    for (const s of findCategory(d, category)?.subcategories || []) if (!seen.has(s.slug)) seen.set(s.slug, s);
  return [...seen.values()];
};

export const categoryTitle = (department, category) =>
  lookIn(department)
    .map((d) => findCategory(d, category)?.title)
    .find(Boolean) || humanize(category);

export const subcategoryTitle = (department, category, subcategory) =>
  lookIn(department)
    .map((d) => findSubcategory(d, category, subcategory)?.title)
    .find(Boolean) || humanize(subcategory);

// "Men's Clothing", "Women's Shoes & Boots"
export const departmentCategoryTitle = (department, category) =>
  `${findDepartment(department).title}'s ${categoryTitle(department, category)}`;

// "Men · Clothing · T-shirts" for product pages and the admin list.
export const placementLabel = ({ department, category, subcategory }) =>
  [
    department === 'unisex' ? 'Unisex' : findDepartment(department)?.title,
    category && categoryTitle(department, category),
    subcategory && subcategoryTitle(department, category, subcategory),
  ]
    .filter(Boolean)
    .join(' · ');

// Total of the API's /product/categories counts that fall under a department,
// category and/or subcategory (unisex products count in both departments).
export const countIn = (counts, { department, category, subcategory }) =>
  (counts || [])
    .filter(
      (r) =>
        (!department || r.department === department || r.department === 'unisex') &&
        (!category || r.category === category) &&
        (!subcategory || r.subcategory === subcategory)
    )
    .reduce((n, r) => n + r.count, 0);
