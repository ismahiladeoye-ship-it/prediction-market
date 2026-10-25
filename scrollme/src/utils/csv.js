// Builds a CSV that opens cleanly in Excel: quoted cells, a byte-order mark for
// £ and accents, and text that looks like a formula prefixed so it stays text.
const FORMULA_START = /^[=+\-@\t\r]/;

const cell = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  const text = FORMULA_START.test(String(value)) ? `'${value}` : String(value);
  return /[",\n\r]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (rows) => `﻿${rows.map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;

export const downloadCsv = (filename, rows) => {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
