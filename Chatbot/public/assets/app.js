const $ = (id) => document.getElementById(id);

async function loadStatus() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    $('serverStatus').textContent = data.status === 'ok' ? 'Online' : 'Offline';
    $('provider').textContent = data.provider || '-';
    $('model').textContent = data.model || '-';
    $('version').textContent = data.version || '-';
  } catch {
    $('serverStatus').textContent = 'Offline';
  }
}

$('checkApi')?.addEventListener('click', loadStatus);
loadStatus();
