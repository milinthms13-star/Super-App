const crypto = require('crypto');

const NIL = '00000000-0000-0000-0000-000000000000';

const generateUuid = () => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const validate = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const parse = (value) => {
  if (!validate(value)) {
    throw new TypeError('Invalid UUID');
  }
  return Uint8Array.from(Buffer.from(value.replace(/-/g, ''), 'hex'));
};

const stringify = (bytes) => {
  if (!bytes || bytes.length !== 16) {
    throw new TypeError('Stringify expects 16-byte array');
  }
  const hex = Buffer.from(bytes).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const version = (value) => {
  if (!validate(value)) {
    throw new TypeError('Invalid UUID');
  }
  return Number(value[14], 16);
};

const v4 = generateUuid;
const v1 = generateUuid;
const v3 = generateUuid;
const v5 = generateUuid;
const v6 = generateUuid;
const v7 = generateUuid;

module.exports = {
  NIL,
  MAX: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  v1,
  v3,
  v4,
  v5,
  v6,
  v7,
  parse,
  stringify,
  validate,
  version,
  default: {
    NIL,
    v1,
    v3,
    v4,
    v5,
    v6,
    v7,
    parse,
    stringify,
    validate,
    version,
  },
};

