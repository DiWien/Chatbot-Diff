import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAdminToken(admin) {
  return jwt.sign({ sub: admin.email, role: 'admin' }, env.JWT_SECRET, { expiresIn: '7d' });
}

export function requireAdmin(req, res, next) {
  const token = req.cookies?.diff_admin_token;

  if (!token) {
    return res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Bạn chưa đăng nhập.' });
  }

  try {
    req.admin = jwt.verify(token, env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'INVALID_TOKEN', message: 'Phiên đăng nhập không hợp lệ.' });
  }
}

export function setAuthCookie(res, token) {
  res.cookie('diff_admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production' || env.VERCEL,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie('diff_admin_token', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production' || env.VERCEL,
  });
}
