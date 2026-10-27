// Men, Women and Electronics, their categories and subcategories (the same
// data as the API's config/taxonomy.json). Unisex products are listed under
// the departments marked "unisex" (Men and Women).
import taxonomy from '../taxonomy.json';
import { humanize } from './format';

export const departments = taxonomy.departments;
const unisexDepartments = departments.filter((d) => d.unisex).map((d) => d.slug);

export const findDepartment = (slug) => departments.find((d) => d.slug === slug);
export const findCategory = (department, category) => findDepartment(department)?.categories.find((c) => c.slug === category);
export const findSubcategory = (department, category, subcategory) =>
  findCategory(department, category)?.subcategories.find((s) => s.slug === subcategory);

export const departmentLink = (department) => `/${department}`;
export const categoryLink = (department, category) => `/${department}/${category}`;
export const subcategoryLink = (department, category, subcategory) => `/${department}/${category}/${subcategory}`;

// Departments to look a category up in: one, Men and Women for unisex, or all.
const lookIn = (department) =>
  department === 'unisex' ? unisexDepartments : findDepartment(department) ? [department] : departments.map((d) => d.slug);

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

// "Men's Clothing", "Women's Shoes & Boots"; Electronics categories keep their own name ("Gaming").
export const departmentCategoryTitle = (department, category) =>
  findDepartment(department).unisex
    ? `${findDepartment(department).title}'s ${categoryTitle(department, category)}`
    : categoryTitle(department, category);

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
// category and/or subcategory (unisex products count under Men and Women).
export const countIn = (counts, { department, category, subcategory }) =>
  (counts || [])
    .filter(
      (r) =>
        (!department || r.department === department || (r.department === 'unisex' && unisexDepartments.includes(department))) &&
        (!category || r.category === category) &&
        (!subcategory || r.subcategory === subcategory)
    )
    .reduce((n, r) => n + r.count, 0);
