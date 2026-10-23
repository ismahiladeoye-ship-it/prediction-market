// Mirrors the API's password rules so users get feedback before submitting.
export const passwordProblems = (password) => {
  const problems = [];
  if (password.length < 8) problems.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) problems.push('an uppercase letter');
  if (!/[a-z]/.test(password)) problems.push('a lowercase letter');
  if (!/[0-9]/.test(password)) problems.push('a number');
  if (!/[^A-Za-z0-9]/.test(password)) problems.push('a special character');
  if (new TextEncoder().encode(password).length > 72) problems.push('at most 72 bytes');
  return problems;
};

export const passwordHint = (password) => {
  const problems = passwordProblems(password);
  return problems.length ? `Password needs ${problems.join(', ')}.` : '';
};
