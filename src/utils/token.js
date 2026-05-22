const crypto = require('crypto');

const TOKEN_SECRET = process.env.JWT_SECRET || 'food-order-dev-secret';

const base64url = (input) => {
  return Buffer.from(JSON.stringify(input))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const sign = (content) => {
  return crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(content)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const createToken = (payload) => {
  // token 分三段：header.payload.signature
  const header = base64url({
    alg: 'HS256',
    typ: 'JWT',
  });

  const body = base64url({
    ...payload,

    // 7 天过期
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  const signature = sign(`${header}.${body}`);

  return `${header}.${body}.${signature}`;
};

const parseBase64urlJson = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '='
  );

  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
};

const verifyToken = (token) => {
  if (!token) {
    return null;
  }

  const parts = token.split('.');

  if (parts.length !== 3) {
    return null;
  }

  const [header, body, signature] = parts;
  const expectedSignature = sign(`${header}.${body}`);

  if (signature !== expectedSignature) {
    return null;
  }

  const payload = parseBase64urlJson(body);

  if (payload.exp && Date.now() > payload.exp) {
    return null;
  }

  return payload;
};

module.exports = {
  createToken,
  verifyToken,
};