const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'token';

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'غير مسجّل دخول' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'جلسة غير صالحة' });
  }
}

module.exports = { signToken, setAuthCookie, clearAuthCookie, requireAuth };
