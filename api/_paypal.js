// Shared PayPal helpers for the /shop checkout (Vercel Node serverless functions).
// Env vars (set in Vercel → Project → Settings → Environment Variables):
//   PAYPAL_CLIENT_ID      REST app client ID
//   PAYPAL_CLIENT_SECRET  REST app secret (server only — never exposed)
//   PAYPAL_ENV            "live" or "sandbox" (default: sandbox)

const ENV = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';
const BASE = ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
const MAX_TOTAL = 50000;   // hard ceiling per order
const MAX_ITEMS = 12;

async function getAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('PayPal credentials are not configured');
  const res = await fetch(BASE + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error('PayPal auth failed (' + res.status + ')');
  return (await res.json()).access_token;
}

async function paypal(path, body) {
  const token = await getAccessToken();
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function clean(str, max) {
  return String(str == null ? '' : str).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function toCents(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

function money(cents) {
  return (cents / 100).toFixed(2);
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

function invoiceId() {
  const d = new Date();
  const ymd = d.getUTCFullYear().toString().slice(2) +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return 'SWL-' + ymd + '-' + rand;
}

module.exports = {
  ENV, CURRENCIES, MAX_TOTAL, MAX_ITEMS,
  paypal, clean, toCents, money, readBody, invoiceId
};
