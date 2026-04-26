const PASSWORD = process.env.HERMES_WEBUI_PASSWORD || '';

export function authRequired() {
  return PASSWORD.length > 0;
}

export function checkPassword(req) {
  if (!authRequired()) return true;
  const header = req.get('x-uthers-hand-password') || '';
  if (header && header === PASSWORD) return true;
  const url = new URL(req.originalUrl, 'http://x');
  const queryToken = url.searchParams.get('token') || '';
  return queryToken === PASSWORD;
}

export function authMiddleware(req, res, next) {
  if (req.path === '/api/auth/status') return next();
  if (checkPassword(req)) return next();
  res.status(401).json({ error: 'unauthorized' });
}
