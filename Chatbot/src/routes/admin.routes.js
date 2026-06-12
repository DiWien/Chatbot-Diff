import express from 'express';
import { SYSTEM_VERSION } from '../config/env.js';
import { requireAdmin } from '../middleware/auth.js';
import { DEFAULT_PROMPT, clearApiKey, getConfig, getSafeConfig, saveConfig, updateAdminCredentials, updateAiConfig } from '../storage/config.store.js';
import { listKnowledge } from '../storage/knowledge.store.js';
import { listLogs } from '../storage/logs.store.js';
import { publicReplyForError, safeErrorCode, testAIConnection } from '../services/ai.service.js';
import { clearTrainingData, getTrainingStats, processDocuments, rebuildIndex } from '../services/training.service.js';
import { asyncHandler, ok } from '../utils/response.js';

const router = express.Router();
router.use(requireAdmin);

router.get('/dashboard', asyncHandler(async (req, res) => {
  const safe = await getSafeConfig();
  const config = await getConfig();
  const docs = listKnowledge();
  const training = getTrainingStats();
  ok(res, {
    dashboard: {
      serverStatus: 'online',
      aiStatus: safe.status,
      provider: safe.provider,
      model: safe.model,
      totalDocuments: docs.length,
      totalChunks: training.totalChunks,
      totalQuestions: config.stats?.totalQuestions || 0,
      lastTestAt: safe.lastTestAt,
      lastTestStatus: safe.lastTestStatus,
      allowedOrigin: safe.allowedOrigin,
      version: SYSTEM_VERSION,
      logs: listLogs().slice(0, 10),
    },
  });
}));

router.get('/config', asyncHandler(async (req, res) => ok(res, { config: await getSafeConfig(), defaultPrompt: DEFAULT_PROMPT })));

router.post('/config', asyncHandler(async (req, res) => {
  await updateAiConfig(req.body || {});
  ok(res, { config: await getSafeConfig() });
}));

router.post('/test-connection', async (req, res) => {
  try {
    const result = await testAIConnection(req.body || {});
    return ok(res, result);
  } catch (error) {
    const code = safeErrorCode(error);
    const status = code === 'AI_AUTH_ERROR' ? 400 : code === 'AI_QUOTA_ERROR' ? 429 : 502;
    return res.status(status).json({
      success: false,
      error: code,
      message: publicReplyForError(code),
    });
  }
});

router.delete('/api-key', (req, res) => {
  clearApiKey().then(async () => ok(res, { config: await getSafeConfig() }));
});

router.post('/training/process', (req, res) => ok(res, processDocuments()));
router.post('/training/rebuild', (req, res) => ok(res, rebuildIndex()));
router.delete('/training/clear', (req, res) => ok(res, clearTrainingData()));

router.get('/logs', (req, res) => ok(res, { logs: listLogs() }));

router.post('/settings', asyncHandler(async (req, res) => {
  const { adminEmail, adminPassword, allowedOrigin, status, rateLimitWindowMs, rateLimitMax } = req.body || {};
  if (adminEmail || adminPassword) await updateAdminCredentials(adminEmail, adminPassword);
  const config = await getConfig();
  config.security.allowedOrigin = allowedOrigin || config.security.allowedOrigin;
  config.security.rateLimitWindowMs = Number(rateLimitWindowMs || config.security.rateLimitWindowMs);
  config.security.rateLimitMax = Number(rateLimitMax || config.security.rateLimitMax);
  config.ai.status = status || config.ai.status;
  await saveConfig(config);
  ok(res, { config: await getSafeConfig() });
}));

router.get('/export', asyncHandler(async (req, res) => {
  const config = await getConfig();
  const { apiKeyEncrypted, ...aiSafe } = config.ai;
  res.json({ ...config, ai: { ...aiSafe, apiKeyEncrypted: '[hidden]' } });
}));

router.post('/import', asyncHandler(async (req, res) => {
  const incoming = req.body || {};
  const current = await getConfig();
  await saveConfig({ ...current, ...incoming, ai: { ...current.ai, ...(incoming.ai || {}), apiKeyEncrypted: current.ai.apiKeyEncrypted } });
  ok(res, { config: await getSafeConfig() });
}));

export default router;
