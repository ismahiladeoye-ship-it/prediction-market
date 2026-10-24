import { toCsv } from './csv';

it('quotes cells that need it and keeps numbers as numbers', () => {
  expect(
    toCsv([
      ['Product', 'Sold'],
      ['Tracksuit, "Black"', 4],
    ])
  ).toBe('﻿Product,Sold\r\n"Tracksuit, ""Black""",4\r\n');
});

it('stops product names from running as spreadsheet formulas', () => {
  expect(toCsv([['=HYPERLINK("http://x")', '-5', '@SUM(A1)', -5]])).toBe('﻿"\'=HYPERLINK(""http://x"")",\'-5,\'@SUM(A1),-5\r\n');
});
