const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];
let defaultPrompt = '';

function toast(message) { const el = qs('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }
async function api(url, options = {}) { const res = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.message || data.error || 'Request failed'); return data; }

async function init() {
  try { const me = await api('/api/auth/me'); qs('#adminEmail').textContent = me.admin.email; } catch { location.href = '/login'; return; }
  bindTabs(); bindForms(); await Promise.all([loadDashboard(), loadConfig(), loadKnowledge(), loadLogs()]);
}

function bindTabs() { qsa('#tabs button').forEach((btn) => btn.addEventListener('click', () => { qsa('#tabs button').forEach((b) => b.classList.remove('active')); qsa('.tab-panel').forEach((p) => p.classList.remove('active')); btn.classList.add('active'); qs(`#${btn.dataset.tab}`).classList.add('active'); qs('#pageTitle').textContent = btn.textContent; if (btn.dataset.tab === 'logs') loadLogs(); })); }

function bindForms() {
  qs('#logoutBtn').onclick = async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/login'; };
  qs('#toggleKey').onclick = () => { const input = qs('[name="apiKey"]'); input.type = input.type === 'password' ? 'text' : 'password'; qs('#toggleKey').textContent = input.type === 'password' ? 'Show' : 'Hide'; };
  qs('#resetPrompt').onclick = () => { qs('[name="systemPrompt"]').value = defaultPrompt; };
  qs('#deleteKey').onclick = async () => { await api('/api/admin/api-key', { method: 'DELETE' }); toast('Đã xóa API key'); loadConfig(); };
  qs('#testConnection').onclick = async () => { try { await api('/api/admin/test-connection', { method: 'POST' }); toast('Kết nối AI thành công'); loadDashboard(); } catch (e) { toast(e.message); } };
  qs('#configForm').onsubmit = async (e) => { e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); await api('/api/admin/config', { method: 'POST', body: JSON.stringify(body) }); toast('Đã lưu config'); loadConfig(); loadDashboard(); };
  qs('#uploadForm').onsubmit = async (e) => { e.preventDefault(); await api('/api/admin/knowledge/upload', { method: 'POST', body: new FormData(e.target) }); toast('Đã upload'); e.target.reset(); loadKnowledge(); };
  qs('#faqForm').onsubmit = async (e) => { e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); body.active = Boolean(body.active); await api('/api/admin/knowledge/faq', { method: 'POST', body: JSON.stringify(body) }); toast('Đã lưu FAQ'); e.target.reset(); loadKnowledge(); };
  qs('#processDocs').onclick = () => training('/api/admin/training/process', 'POST'); qs('#rebuildIndex').onclick = () => training('/api/admin/training/rebuild', 'POST'); qs('#clearTraining').onclick = () => training('/api/admin/training/clear', 'DELETE');
  qs('#chatForm').onsubmit = sendChat; qs('#clearChat').onclick = () => { qs('#chatBox').innerHTML = ''; qs('#chatMeta').textContent = ''; };
  qs('#settingsForm').onsubmit = async (e) => { e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); await api('/api/admin/settings', { method: 'POST', body: JSON.stringify(body) }); toast('Đã lưu settings'); loadConfig(); loadDashboard(); };
}

async function loadDashboard() { const { dashboard } = await api('/api/admin/dashboard'); qs('#dashboard').innerHTML = `<div class="metric-grid">${[['Server status',dashboard.serverStatus],['AI status',dashboard.aiStatus],['Provider',dashboard.provider],['Model',dashboard.model],['Documents',dashboard.totalDocuments],['Chunks',dashboard.totalChunks],['Questions',dashboard.totalQuestions],['Allowed origin',dashboard.allowedOrigin]].map(([k,v])=>`<div class="metric"><small>${k}</small><strong>${v ?? '-'}</strong></div>`).join('')}</div><div class="card" style="margin-top:16px"><h2>Thông tin hệ thống</h2><p>Version: ${dashboard.version}</p><p>Last API test: ${dashboard.lastTestStatus} ${dashboard.lastTestAt || ''}</p></div>`; }

async function loadConfig() { const { config, defaultPrompt: dp } = await api('/api/admin/config'); defaultPrompt = dp; const f = qs('#configForm'); Object.entries(config).forEach(([k,v]) => { const el = f.elements[k]; if (el && k !== 'apiKey') el.value = v ?? ''; }); qs('#apiKeyMask').textContent = config.hasApiKey ? `Đã lưu: ${config.apiKeyMask}` : 'Chưa có API key'; const sf = qs('#settingsForm'); ['allowedOrigin','rateLimitWindowMs','rateLimitMax','status'].forEach((k)=>{ if (sf.elements[k]) sf.elements[k].value = config[k] ?? ''; }); }

async function loadKnowledge() { const { items } = await api('/api/admin/knowledge'); qs('#knowledgeRows').innerHTML = items.map((item) => `<tr><td>${item.title}</td><td>${item.type}</td><td>${item.size || '-'}</td><td>${new Date(item.createdAt).toLocaleString()}</td><td>${item.status}</td><td>${item.chunkCount || 0}</td><td><button class="btn small" onclick="reindexItem('${item.id}')">Re-index</button> <button class="btn small danger" onclick="deleteItem('${item.id}')">Xóa</button></td></tr>`).join('') || '<tr><td colspan="7">Chưa có dữ liệu</td></tr>'; }
window.deleteItem = async (id) => { await api(`/api/admin/knowledge/${id}`, { method: 'DELETE' }); toast('Đã xóa'); loadKnowledge(); };
window.reindexItem = async (id) => { await api(`/api/admin/knowledge/${id}/reindex`, { method: 'POST' }); toast('Đã đưa vào hàng đợi re-index'); loadKnowledge(); };

async function training(url, method) { const result = await api(url, { method }); qs('#trainingResult').textContent = JSON.stringify(result, null, 2); toast('Đã xử lý training'); loadDashboard(); loadKnowledge(); }

async function sendChat(e) { e.preventDefault(); const input = qs('#chatInput'); addMsg(input.value, 'user'); const sent = input.value; input.value = ''; const start = performance.now(); try { const data = await api('/api/chat', { method: 'POST', body: JSON.stringify({ message: sent, source: 'admin-test' }) }); addMsg(data.reply, 'bot'); qs('#chatMeta').textContent = `Latency: ${Math.round(performance.now()-start)}ms | Provider: ${data.meta.provider} | Model: ${data.meta.model} | KB: ${data.meta.usedKnowledge ? 'yes' : 'no'}`; } catch (err) { addMsg(err.message, 'bot'); } }
function addMsg(text, type) { const el = document.createElement('div'); el.className = `msg ${type === 'user' ? 'user' : ''}`; el.textContent = text; qs('#chatBox').appendChild(el); qs('#chatBox').scrollTop = qs('#chatBox').scrollHeight; }

async function loadLogs() { const { logs } = await api('/api/admin/logs'); qs('#logRows').innerHTML = logs.map((l) => `<tr><td>${new Date(l.createdAt).toLocaleString()}</td><td>${l.source}</td><td>${l.userId || '-'}</td><td>${l.message}</td><td>${l.responseStatus}</td><td>${l.latency}ms</td><td>${l.error || '-'}</td></tr>`).join('') || '<tr><td colspan="7">Chưa có logs</td></tr>'; }

init();
