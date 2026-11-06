const { isAdmin } = require('../../lib/auth');

module.exports = (req, res) => {
  res.status(200).json({ authenticated: isAdmin(req) });
};
