const crypto = require('crypto');
const { createSessionCookie } = require('../../lib/auth');

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { password } = readBody(req);
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    res.status(500).json({ error: 'El servidor no tiene configurada ADMIN_PASSWORD.' });
    return;
  }

  if (!password || !safeEqual(password, expected)) {
    res.status(401).json({ error: 'Contraseña incorrecta.' });
    return;
  }

  res.setHeader('Set-Cookie', createSessionCookie());
  res.status(200).json({ ok: true });
};
