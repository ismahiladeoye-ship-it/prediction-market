// Mirrors the API's password rules so users get feedback before submitting.
// `label` is shown as a checklist on the sign-up page; `problem` completes
// "Password needs …".
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', problem: 'at least 8 characters', test: (p) => p.length >= 8 },
  { label: 'A capital letter (A–Z)', problem: 'a capital letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'A lowercase letter (a–z)', problem: 'a lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'A number (0–9)', problem: 'a number', test: (p) => /[0-9]/.test(p) },
  { label: 'A symbol, e.g. ! ? # @ £', problem: 'a symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const passwordProblems = (password) => {
  const problems = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.problem);
  // UTF-8 byte length (bcrypt on the server reads at most 72 bytes).
  if (encodeURIComponent(password).replace(/%[0-9A-F]{2}/g, '_').length > 72) problems.push('at most 72 bytes');
  return problems;
};

export const passwordHint = (password) => {
  const problems = passwordProblems(password);
  return problems.length ? `Password needs ${problems.join(', ')}.` : '';
};
