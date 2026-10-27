// Shop departments (Men, Women, Electronics), their categories and
// subcategories. The same data is in src/taxonomy.json for the storefront
// menus; a test keeps the two files identical. A product belongs to one
// department, or is unisex: listed under every department marked "unisex"
// (Men and Women).
const TAXONOMY = require('./taxonomy.json');

const DEPARTMENTS = TAXONOMY.departments;
const DEPARTMENT_SLUGS = DEPARTMENTS.map((d) => d.slug);
const UNISEX_DEPARTMENTS = DEPARTMENTS.filter((d) => d.unisex).map((d) => d.slug);
const PRODUCT_DEPARTMENTS = [...DEPARTMENT_SLUGS, 'unisex'];

const findDepartment = (slug) => DEPARTMENTS.find((d) => d.slug === slug);
const findCategory = (department, category) => findDepartment(department)?.categories.find((c) => c.slug === category);
const findSubcategory = (department, category, subcategory) => findCategory(department, category)?.subcategories.find((s) => s.slug === subcategory);

// Departments a product's category is looked up in (unisex: Men and Women).
const departmentsFor = (department) => (department === 'unisex' ? UNISEX_DEPARTMENTS : [department]);

// Why a department/category/subcategory combination is not valid, or null.
const placementProblem = ({ department, category, subcategory }) => {
  const depts = departmentsFor(department);
  if (!depts.some((d) => findCategory(d, category))) {
    const names = [...new Set(depts.flatMap((d) => findDepartment(d).categories.map((c) => c.slug)))];
    return `Category "${category}" is not a ${department} category. Use one of: ${names.join(', ')}`;
  }
  if (subcategory && !depts.some((d) => findSubcategory(d, category, subcategory))) {
    const names = [...new Set(depts.flatMap((d) => findCategory(d, category)?.subcategories.map((s) => s.slug) || []))];
    return `Subcategory "${subcategory}" is not in ${category}. Use one of: ${names.join(', ')}`;
  }
  return null;
};

module.exports = {
  TAXONOMY,
  DEPARTMENTS,
  DEPARTMENT_SLUGS,
  UNISEX_DEPARTMENTS,
  PRODUCT_DEPARTMENTS,
  findDepartment,
  findCategory,
  findSubcategory,
  departmentsFor,
  placementProblem,
};
