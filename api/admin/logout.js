const { clearSessionCookie } = require('../../lib/auth');

module.exports = (req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.status(200).json({ ok: true });
};
