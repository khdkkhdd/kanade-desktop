import { customAlphabet } from 'nanoid';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './constants.js';

const nanoid = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);

export function generateRoomCode(): string {
  return nanoid();
}

const ROOM_CODE_RE = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export function isValidRoomCode(s: unknown): s is string {
  return typeof s === 'string' && ROOM_CODE_RE.test(s);
}
