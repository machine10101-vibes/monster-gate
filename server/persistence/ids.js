const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUserId(value) {
  return UUID_RE.test(String(value || '').trim());
}

export function requireUserId(userId) {
  const id = String(userId || '').trim();
  if (!UUID_RE.test(id)) {
    const err = new Error('userId must be an auth.users UUID.');
    err.code = 'invalid';
    throw err;
  }
  return id.toLowerCase();
}
