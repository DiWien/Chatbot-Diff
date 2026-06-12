export function ok(res, data = {}) {
  return res.json({ success: true, ...data });
}

export function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ success: false, error: code, message, ...extra });
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function truncate(value = '', max = 180) {
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}
