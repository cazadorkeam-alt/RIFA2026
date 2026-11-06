const crypto = require('crypto');

const COOKIE_NAME = 'admin_session';
const SESSION_HOURS = 12;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('Falta la variable de entorno SESSION_SECRET');
  }
  return secret;
}

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
  return `${data}.${hmac}`;
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [data, hmac] = token.split('.');
  const expected = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');

  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function createSessionCookie() {
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const token = sign({ role: 'admin', exp });
  const maxAge = SESSION_HOURS * 60 * 60;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function isAdmin(req) {
  const cookies = parseCookies(req.headers.cookie);
  const payload = verify(cookies[COOKIE_NAME]);
  return !!payload;
}

module.exports = {
  createSessionCookie,
  clearSessionCookie,
  isAdmin,
};
