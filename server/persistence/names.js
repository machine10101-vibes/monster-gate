/** Character names match the client roster rules in src/systems/roster.js. */

export const NAME_MIN = 2;
export const NAME_MAX = 14;
export const NAME_RE = /^[A-Za-z][A-Za-z' -]*$/;

export function cleanName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim();
}

export function nameProblem(raw) {
  const name = cleanName(raw);
  if (name.length < NAME_MIN) return 'Names need at least 2 letters.';
  if (name.length > NAME_MAX) return 'Names can be 14 characters at most.';
  if (!NAME_RE.test(name)) return 'Use letters, spaces, hyphens and apostrophes only.';
  return '';
}

export function requireName(raw) {
  const name = cleanName(raw).slice(0, NAME_MAX);
  const problem = nameProblem(name);
  if (problem) {
    const err = new Error(problem);
    err.code = 'invalid';
    throw err;
  }
  return name;
}
