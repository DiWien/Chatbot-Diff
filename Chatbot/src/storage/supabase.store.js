import { env } from '../config/env.js';

const CONFIG_ID = 'default';

export function hasSupabaseStorage() {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function readSupabaseConfig() {
  if (!hasSupabaseStorage()) return null;
  const url = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${env.SUPABASE_CONFIG_TABLE}?id=eq.${CONFIG_ID}&select=config`;
  const response = await fetch(url, { headers: getHeaders() });
  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Supabase config read failed: ${response.status} ${body.slice(0, 180)}`);
  }
  const rows = await response.json();
  return rows?.[0]?.config || null;
}

export async function writeSupabaseConfig(config) {
  if (!hasSupabaseStorage()) return config;
  const url = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${env.SUPABASE_CONFIG_TABLE}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...getHeaders(), Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ id: CONFIG_ID, config, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Supabase config write failed: ${response.status} ${body.slice(0, 180)}`);
  }
  return config;
}

function getHeaders() {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}
