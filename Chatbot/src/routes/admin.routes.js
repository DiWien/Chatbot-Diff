import express from 'express';
import { SYSTEM_VERSION } from '../config/env.js';
import { requireAdmin } from '../middleware/auth.js';
import { DEFAULT_PROMPT, clearApiKey, getConfig, getSafeConfig, saveConfig, updateAdminCredentials, updateAiConfig } from '../storage/config.store.js';
import { listKnowledge } from '../storage/knowledge.store.js';
import { listLogs } from '../storage/logs.store.js';
import { testAIConnection } from '../services/ai.service.js';
import { clearTrainingData, getTrainingStats, processDocuments, rebuildIndex } from '../services/training.service.js';
import { asyncHandler, ok } from '../utils/response.js';

const router = express.Router();
router.use(requireAdmin);

router.get('/dashboard', (req, res) => {
  const safe = getSafeConfig();
  const config = getConfig();
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
});

router.get('/config', (req, res) => ok(res, { config: getSafeConfig(), defaultPrompt: DEFAULT_PROMPT }));

router.post('/config', asyncHandler(async (req, res) => {
  updateAiConfig(req.body || {});
  ok(res, { config: getSafeConfig() });
}));

router.post('/test-connection', asyncHandler(async (req, res) => {
  const result = await testAIConnection();
  ok(res, result);
}));

router.delete('/api-key', (req, res) => {
  clearApiKey();
  ok(res, { config: getSafeConfig() });
});

router.post('/training/process', (req, res) => ok(res, processDocuments()));
router.post('/training/rebuild', (req, res) => ok(res, rebuildIndex()));
router.delete('/training/clear', (req, res) => ok(res, clearTrainingData()));

router.get('/logs', (req, res) => ok(res, { logs: listLogs() }));

router.post('/settings', asyncHandler(async (req, res) => {
  const { adminEmail, adminPassword, allowedOrigin, status, rateLimitWindowMs, rateLimitMax } = req.body || {};
  if (adminEmail || adminPassword) await updateAdminCredentials(adminEmail, adminPassword);
  const config = getConfig();
  config.security.allowedOrigin = allowedOrigin || config.security.allowedOrigin;
  config.security.rateLimitWindowMs = Number(rateLimitWindowMs || config.security.rateLimitWindowMs);
  config.security.rateLimitMax = Number(rateLimitMax || config.security.rateLimitMax);
  config.ai.status = status || config.ai.status;
  saveConfig(config);
  ok(res, { config: getSafeConfig() });
}));

router.get('/export', (req, res) => {
  const config = getConfig();
  const { apiKeyEncrypted, ...aiSafe } = config.ai;
  res.json({ ...config, ai: { ...aiSafe, apiKeyEncrypted: '[hidden]' } });
});

router.post('/import', (req, res) => {
  const incoming = req.body || {};
  const current = getConfig();
  saveConfig({ ...current, ...incoming, ai: { ...current.ai, ...(incoming.ai || {}), apiKeyEncrypted: current.ai.apiKeyEncrypted } });
  ok(res, { config: getSafeConfig() });
});

export default router;
