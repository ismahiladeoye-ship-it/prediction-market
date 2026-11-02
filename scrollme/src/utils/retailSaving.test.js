import { retailSaving } from './format';

test('works out the saving against the retail price, only when ours is lower', () => {
  expect(retailSaving(155, 170)).toEqual({ retail: 170, amount: 15, percent: 9 });
  expect(retailSaving(300, 499)).toEqual({ retail: 499, amount: 199, percent: 40 });
  expect(retailSaving(19.99, 24.99)).toEqual({ retail: 24.99, amount: 5, percent: 20 });
  expect(retailSaving(100, 100)).toBeNull();
  expect(retailSaving(120, 100)).toBeNull();
  expect(retailSaving(100, undefined)).toBeNull();
  expect(retailSaving(100, null)).toBeNull();
});
