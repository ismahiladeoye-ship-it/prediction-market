import test from 'node:test';
import assert from 'node:assert/strict';
import { readPage, finding, tidySize, sortSizes, mainPrice } from './price-sync.mjs';

// The supplier page holds its variants as escaped JSON inside a script.
const variant = (onStock, size, sku, pence, ticket = pence) =>
  `{\\"isOnStock\\":${onStock},\\"x\\":1,\\"size\\":\\"${size}\\",\\"sku\\":\\"${sku}\\",\\"sizeSequence\\":\\"1\\",\\"stockLevel\\":null,\\"stockLevelThreshold\\":{\\"a\\":1},\\"price\\":{\\"value\\":{\\"centAmount\\":${pence},\\"currencyCode\\":\\"GBP\\"}},\\"ticketPrice\\":{\\"value\\":{\\"centAmount\\":${ticket}`;
const page = [
  variant(true, 'Small', '48101003350', 6600),
  variant(true, 'Medium', '48101003390', 6600),
  variant(true, 'Large', '48101003430', 5000),
  variant(false, 'X Large', '48101003470', 6600),
  variant(false, 'Small', '48101004350', 6600), // another colour, sold out
  variant(true, '7 (41)', '11111111070', 8999),
].join('');

test('reads colours, sizes in stock and prices from a supplier page', () => {
  const p = readPage(page);
  assert.deepEqual([...p['48101003'].all], ['S', 'M', 'L', 'XL']);
  assert.deepEqual(
    p['48101003'].inStock.map((v) => v.size),
    ['S', 'M', 'L']
  );
  assert.equal(readPage('<html>nothing here</html>') && Object.keys(readPage('<html></html>')).length, 0);
});

test('takes the price most sizes sell at, and only the sizes in stock', () => {
  const p = readPage(page);
  assert.deepEqual(finding({ sourceCode: '48101003', sizes: ['S'] }, p), { supplierPrice: 66, sizes: ['S', 'M'] });
  assert.deepEqual(finding({ sourceCode: '48101004', sizes: ['S'] }, p), { supplierPrice: null, sizes: [] });
  assert.deepEqual(finding({ sourceCode: '99999999', sizes: ['S'] }, p), { supplierPrice: null, sizes: [] });
  assert.equal(finding({ sourceCode: '48101003' }, {}), null); // unreadable page: leave it
});

test('finds a bottle size for fragrances', () => {
  const p = readPage([variant(true, '50ml', '22222222050', 9500), variant(false, '100ml', '22222222100', 12500)].join(''));
  assert.deepEqual(finding({ sourceCode: '22222222', sourceSize: '50ml' }, p), { supplierPrice: 95 });
  assert.deepEqual(finding({ sourceCode: '22222222', sourceSize: '100 ml' }, p), { supplierPrice: null });
  assert.equal(finding({ sourceCode: '22222222', sourceSize: '30ml' }, p), null);
});

test('tidies and orders sizes like the shop stores them', () => {
  assert.equal(tidySize('7 (41)'), '7');
  assert.equal(tidySize('36 (3.5)'), '3.5');
  assert.equal(tidySize('UK 5'), '5');
  assert.equal(tidySize('X Large'), 'XL');
  assert.deepEqual(sortSizes(['XL', 'S', '2XL', 'M']), ['S', 'M', 'XL', '2XL']);
  assert.deepEqual(sortSizes(['10', '7.5', '8']), ['7.5', '8', '10']);
  assert.deepEqual(
    mainPrice([
      { size: 'S', price: 50 },
      { size: 'M', price: 60 },
    ]),
    { price: 60, sizes: ['M'] }
  );
});
