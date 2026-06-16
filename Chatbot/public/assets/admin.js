const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];
let defaultPrompt = '';

function toast(message) { const el = qs('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }
async function api(url, options = {}) { const res = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.message || data.error || 'Request failed'); return data; }

async function init() {
  try { const me = await api('/api/auth/me'); qs('#adminEmail').textContent = me.admin.email; } catch { location.href = `/login?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`; return; }
  bindTabs(); bindForms(); await Promise.all([loadDashboard(), loadConfig(), loadKnowledge(), loadLogs()]);
  activateInitialTab();
}

function bindTabs() { qsa('#tabs button').forEach((btn) => btn.addEventListener('click', () => activateTab(btn.dataset.tab, true))); }

function activateInitialTab() {
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab') || location.hash.replace('#', '') || 'dashboard';
  activateTab(tab, false);
}

function activateTab(tab, updateUrl) {
  const btn = qs(`#tabs button[data-tab="${tab}"]`) || qs('#tabs button[data-tab="dashboard"]');
  const target = qs(`#${btn.dataset.tab}`);
  qsa('#tabs button').forEach((item) => item.classList.remove('active'));
  qsa('.tab-panel').forEach((panel) => panel.classList.remove('active'));
  btn.classList.add('active');
  target.classList.add('active');
  qs('#pageTitle').textContent = btn.textContent;
  if (btn.dataset.tab === 'logs') loadLogs();
  if (updateUrl) history.replaceState(null, '', `/admin?tab=${btn.dataset.tab}`);
}

function bindForms() {
  qs('#logoutBtn').onclick = async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/login'; };
  qs('#toggleKey').onclick = () => { const input = qs('[name="apiKey"]'); input.type = input.type === 'password' ? 'text' : 'password'; qs('#toggleKey').textContent = input.type === 'password' ? 'Show' : 'Hide'; };
  qs('#resetPrompt').onclick = () => { qs('[name="systemPrompt"]').value = defaultPrompt; };
  qs('#deleteKey').onclick = async () => { await api('/api/admin/api-key', { method: 'DELETE' }); toast('Đã xóa API key'); loadConfig(); };
  qs('#testConnection').onclick = () => runAiUsageCheck();
  qs('#configForm').onsubmit = async (e) => { e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); await api('/api/admin/config', { method: 'POST', body: JSON.stringify(body) }); toast('Đã lưu config'); loadConfig(); loadDashboard(); };
  qs('#uploadForm').onsubmit = async (e) => { e.preventDefault(); await api('/api/admin/knowledge/upload', { method: 'POST', body: new FormData(e.target) }); toast('Đã upload'); e.target.reset(); loadKnowledge(); };
  qs('#faqForm').onsubmit = async (e) => { e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); body.active = Boolean(body.active); await api('/api/admin/knowledge/faq', { method: 'POST', body: JSON.stringify(body) }); toast('Đã lưu FAQ'); e.target.reset(); loadKnowledge(); };
  qs('#processDocs').onclick = () => training('/api/admin/training/process', 'POST'); qs('#rebuildIndex').onclick = () => training('/api/admin/training/rebuild', 'POST'); qs('#clearTraining').onclick = () => training('/api/admin/training/clear', 'DELETE');
  qs('#chatForm').onsubmit = sendChat; qs('#clearChat').onclick = () => { qs('#chatBox').innerHTML = ''; qs('#chatMeta').textContent = ''; };
  qs('#settingsForm').onsubmit = async (e) => { e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); await api('/api/admin/settings', { method: 'POST', body: JSON.stringify(body) }); toast('Đã lưu settings'); loadConfig(); loadDashboard(); };
}

async function loadDashboard() { const { dashboard } = await api('/api/admin/dashboard'); const usage = dashboard.lastUsage || {}; const logs = dashboard.logs || []; qs('#dashboard').innerHTML = `<div class="dash-hero"><div><p class="eyebrow">Diff Coach Operations</p><h2>AI Control Dashboard</h2><p>Giám sát chatbot, quota AI, token usage, knowledge base và lỗi gần nhất trong một màn hình.</p></div><div class="dash-status ${dashboard.aiStatus === 'active' ? 'ok' : 'warn'}"><span></span>${dashboard.aiStatus === 'active' ? 'Active' : 'Inactive'}</div></div><div class="metric-grid dash-metrics">${[['Server',dashboard.serverStatus,'Online status'],['Provider',dashboard.provider,'AI engine'],['Model',dashboard.model,'Active model'],['Questions',dashboard.totalQuestions,'Total handled'],['Documents',dashboard.totalDocuments,'Knowledge items'],['Chunks',dashboard.totalChunks,'RAG chunks'],['Last tokens',usage.totalTokens ? `${usage.totalTokens}` : '-','Input/output usage'],['API test',dashboard.lastTestStatus,'Connection status']].map(([k,v,h])=>`<div class="metric pro"><small>${k}</small><strong>${v ?? '-'}</strong><span>${h}</span></div>`).join('')}</div><div class="dashboard-grid"><section class="card ops-card"><div class="card-head"><div><p class="eyebrow">Quota & Tokens</p><h2>AI Usage Check</h2></div><button class="btn primary" type="button" id="dashboardTestConnection">Check now</button></div><div class="usage-strip"><div><small>Input</small><strong>${usage.inputTokens || 0}</strong></div><div><small>Output</small><strong>${usage.outputTokens || 0}</strong></div><div><small>Total</small><strong>${usage.totalTokens || 0}</strong></div></div><pre id="dashboardUsageCheck">Chưa kiểm tra trong phiên này.</pre></section><section class="card ops-card"><p class="eyebrow">System</p><h2>Runtime Health</h2><div class="info-list"><p><span>Version</span><strong>${dashboard.version}</strong></p><p><span>Allowed origin</span><strong>${dashboard.allowedOrigin || '-'}</strong></p><p><span>Last API test</span><strong>${dashboard.lastTestStatus} ${dashboard.lastTestAt || ''}</strong></p></div></section></div><section class="card recent-card"><div class="card-head"><div><p class="eyebrow">Recent Activity</p><h2>Latest Chat Logs</h2></div><button class="btn" type="button" onclick="activateTab('logs', true)">View all logs</button></div><div class="recent-list">${logs.length ? logs.map((log)=>`<div class="recent-item"><div><strong>${log.message || '-'}</strong><p>${log.source || '-'} | ${new Date(log.createdAt).toLocaleString()}</p></div><span class="log-badge ${log.responseStatus === 'success' ? 'ok' : 'err'}">${log.responseStatus}</span></div>`).join('') : '<p class="muted">Chưa có logs.</p>'}</div></section>`; qs('#dashboardTestConnection').onclick = () => runAiUsageCheck(); }

async function loadConfig() { const { config, defaultPrompt: dp } = await api('/api/admin/config'); defaultPrompt = dp; const f = qs('#configForm'); Object.entries(config).forEach(([k,v]) => { const el = f.elements[k]; if (el && k !== 'apiKey') el.value = v ?? ''; }); qs('#apiKeyMask').textContent = config.hasApiKey ? `Đã lưu: ${config.apiKeyMask}` : 'Chưa có API key'; const sf = qs('#settingsForm'); ['allowedOrigin','rateLimitWindowMs','rateLimitMax','status'].forEach((k)=>{ if (sf.elements[k]) sf.elements[k].value = config[k] ?? ''; }); }

async function loadKnowledge() { const { items } = await api('/api/admin/knowledge'); qs('#knowledgeRows').innerHTML = items.map((item) => `<tr><td>${item.title}</td><td>${item.type}</td><td>${item.size || '-'}</td><td>${new Date(item.createdAt).toLocaleString()}</td><td>${item.status}</td><td>${item.chunkCount || 0}</td><td><button class="btn small" onclick="reindexItem('${item.id}')">Re-index</button> <button class="btn small danger" onclick="deleteItem('${item.id}')">Xóa</button></td></tr>`).join('') || '<tr><td colspan="7">Chưa có dữ liệu</td></tr>'; }
window.deleteItem = async (id) => { await api(`/api/admin/knowledge/${id}`, { method: 'DELETE' }); toast('Đã xóa'); loadKnowledge(); };
window.reindexItem = async (id) => { await api(`/api/admin/knowledge/${id}/reindex`, { method: 'POST' }); toast('Đã đưa vào hàng đợi re-index'); loadKnowledge(); };

async function training(url, method) { const result = await api(url, { method }); qs('#trainingResult').textContent = JSON.stringify(result, null, 2); toast('Đã xử lý training'); loadDashboard(); loadKnowledge(); }

async function sendChat(e) { e.preventDefault(); const input = qs('#chatInput'); const sent = input.value.trim(); if (!sent) return; addMsg(sent, 'user'); input.value = ''; const start = performance.now(); try { const data = await api('/api/chat', { method: 'POST', body: JSON.stringify({ message: sent, source: 'admin-test' }) }); addMsg(data.reply || 'Không có phản hồi.', 'bot'); const meta = data.meta || {}; const usage = meta.usage || {}; qs('#chatMeta').textContent = `Latency: ${meta.latency ?? Math.round(performance.now()-start)}ms | Provider: ${meta.provider || '-'} | Model: ${meta.model || '-'} | KB: ${meta.usedKnowledge ? 'yes' : 'no'} | Tokens: ${usage.totalTokens ?? 0} (${usage.inputTokens ?? 0} in / ${usage.outputTokens ?? 0} out)`; } catch (err) { addMsg(err.message || 'Không gửi được tin nhắn test.', 'bot'); qs('#chatMeta').textContent = `Failed after ${Math.round(performance.now()-start)}ms`; } }
function addMsg(text, type) { const el = document.createElement('div'); el.className = `msg ${type === 'user' ? 'user' : ''}`; el.textContent = text; qs('#chatBox').appendChild(el); qs('#chatBox').scrollTop = qs('#chatBox').scrollHeight; }

async function runAiUsageCheck() { try { const body = Object.fromEntries(new FormData(qs('#configForm'))); const result = await api('/api/admin/test-connection', { method: 'POST', body: JSON.stringify(body) }); renderUsageCheck(result); toast('Kết nối AI thành công'); loadDashboard(); } catch (e) { renderUsageCheck({ status: 'failed', quota: 'unavailable', error: e.message }); toast(e.message); } }
function renderUsageCheck(result) { const usage = result.usage || {}; const payload = JSON.stringify({ status: result.status, quota: result.quota || (result.status === 'success' ? 'available' : 'unavailable'), inputTokens: usage.inputTokens || 0, outputTokens: usage.outputTokens || 0, totalTokens: usage.totalTokens || 0, error: result.error || '', detail: result.detail || '' }, null, 2); const configUsage = qs('#usageCheck'); const dashboardUsage = qs('#dashboardUsageCheck'); if (configUsage) configUsage.textContent = payload; if (dashboardUsage) dashboardUsage.textContent = payload; }

async function loadLogs() { const { logs } = await api('/api/admin/logs'); qs('#logRows').innerHTML = logs.map((l) => { const usage = l.tokens || {}; return `<tr><td>${new Date(l.createdAt).toLocaleString()}</td><td>${l.source}</td><td>${l.userId || '-'}</td><td>${l.message}</td><td>${l.responseStatus}</td><td>${l.latency}ms</td><td>${usage.totalTokens || 0} (${usage.inputTokens || 0}/${usage.outputTokens || 0})</td><td>${l.error || '-'}</td><td>${l.errorDetail || '-'}</td></tr>`; }).join('') || '<tr><td colspan="9">Chưa có logs</td></tr>'; }

init();
