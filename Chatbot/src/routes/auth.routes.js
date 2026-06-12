import express from 'express';
import bcrypt from 'bcryptjs';
import { clearAuthCookie, requireAdmin, setAuthCookie, signAdminToken } from '../middleware/auth.js';
import { getConfig } from '../storage/config.store.js';
import { asyncHandler, fail, ok } from '../utils/response.js';

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const config = getConfig();
  const login = String(email || '').trim().toLowerCase();
  const validEmail = login === String(config.admin.email || '').toLowerCase() || login === String(config.admin.username || 'admin').toLowerCase();
  const validPassword = password && await bcrypt.compare(password, config.admin.passwordHash);
  if (!validEmail || !validPassword) return fail(res, 401, 'INVALID_LOGIN', 'Email hoặc mật khẩu không đúng.');
  setAuthCookie(res, signAdminToken({ email: config.admin.email }));
  return ok(res, { admin: { email: config.admin.email, username: config.admin.username || 'admin' } });
}));

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  return ok(res);
});

router.get('/me', requireAdmin, (req, res) => {
  const config = getConfig();
  return ok(res, { admin: { email: req.admin.sub, username: config.admin?.username || 'admin' } });
});

export default router;
