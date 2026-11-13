/** Typed failures the world server can switch on. */

export const PersistErrorCodes = {
  INVALID: 'invalid',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  NAME_TAKEN: 'name_taken',
  ALREADY_IMPORTED: 'already_imported',
  UNAVAILABLE: 'unavailable',
};

export const NAME_TAKEN_MESSAGE = 'That hunter name is already taken.';

export class PersistenceError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'PersistenceError';
    this.code = code;
    Object.assign(this, extra);
  }
}

export function invalid(message, extra) {
  return new PersistenceError(PersistErrorCodes.INVALID, message, extra);
}

export function notFound(userId) {
  return new PersistenceError(PersistErrorCodes.NOT_FOUND, 'No character for this account.', { userId });
}

export function conflict(character) {
  return new PersistenceError(PersistErrorCodes.CONFLICT, 'Character version conflict.', { character });
}

export function nameTaken(name) {
  return new PersistenceError(PersistErrorCodes.NAME_TAKEN, NAME_TAKEN_MESSAGE, { name });
}

export function alreadyImported(character) {
  return new PersistenceError(PersistErrorCodes.ALREADY_IMPORTED, 'A local save was already imported for this account.', { character });
}

export function unavailable(message, extra) {
  return new PersistenceError(PersistErrorCodes.UNAVAILABLE, message, extra);
}
