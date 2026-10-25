import { passwordHint, passwordProblems } from './passwordPolicy';

it('matches the API password rules', () => {
  expect(passwordProblems('Str0ng!Pass')).toEqual([]);
  expect(passwordProblems('password123')).toEqual(['an uppercase letter', 'a special character']);
  expect(passwordHint('abc')).toMatch(/at least 8 characters/);
});

it('counts multi-byte characters as bytes, like bcrypt', () => {
  expect(passwordProblems(`Aa1!${'é'.repeat(34)}`)).toEqual([]); // 4 + 68 bytes
  expect(passwordProblems(`Aa1!${'é'.repeat(35)}`)).toEqual(['at most 72 bytes']);
});
