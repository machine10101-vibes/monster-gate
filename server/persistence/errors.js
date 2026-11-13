/** Typed failures the world server can switch on. */

export class PersistenceError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'PersistenceError';
    this.code = code;
    Object.assign(this, extra);
  }
}

export function invalid(message, extra) {
  return new PersistenceError('invalid', message, extra);
}

export function notFound(userId) {
  return new PersistenceError('not_found', 'No character for this account.', { userId });
}

export function conflict(character) {
  return new PersistenceError('conflict', 'Character version conflict.', { character });
}

export function nameTaken(name) {
  return new PersistenceError('name_taken', 'That hunter name is already taken.', { name });
}

export function alreadyImported(character) {
  return new PersistenceError('already_imported', 'A local save was already imported for this account.', { character });
}
