import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCT, STORES } from './stores.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATUS_FILE = path.join(__dirname, 'status.json');
const REMOTE_STATUS_URL = process.env.REMOTE_STATUS_URL || '';

const headers = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9,es-CO;q=0.8,es;q=0.7',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'cache-control': 'no-cache',
};

function normalize(value = '') {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function includesAny(text, terms = []) {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function signatureMatches(text, groups) {
  return groups.every((group) => includesAny(text, group));
}

function productContext(text) {
  const anchors = ['40th anniversary edition', '40th anniversary', 'legend of zelda'];
  let idx = -1;
  for (const anchor of anchors) {
    idx = text.indexOf(anchor);
    if (idx >= 0) break;
  }
  if (idx < 0) return text.slice(0, 7000);
  return text.slice(Math.max(0, idx - 2500), Math.min(text.length, idx + 5000));
}

function extractPrice(text, currency) {
  const patterns = currency === 'USD'
    ? [/\$\s?([0-9]{2,4}(?:\.[0-9]{2})?)/g, /usd\$?\s?([0-9]{2,4}(?:\.[0-9]{2})?)/g]
    : [/\$\s?([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})?)/g, /cop\s?\$?\s?([0-9]{4,9})/g];

  const candidates = [];
  for (const regex of patterns) {
    for (const match of text.matchAll(regex)) {
      const raw = match[1];
      const numeric = currency === 'USD'
        ? Number(raw.replace(/,/g, ''))
        : Number(raw.replace(/\./g, '').replace(/,/g, '.'));
      if (Number.isFinite(numeric)) candidates.push(numeric);
    }
  }

  if (!candidates.length) return null;
  if (currency === 'USD') {
    const plausible = candidates.filter((n) => n >= 400 && n <= 800);
    return plausible[0] ?? candidates[0];
  }
  const plausible = candidates.filter((n) => n >= 1_500_000 && n <= 6_000_000);
  return plausible[0] ?? candidates[0];
}

export function classifyHtml(store, html, httpStatus = 200) {
  const text = normalize(html);

  if (httpStatus === 403 || httpStatus === 429 || includesAny(text, store.blockedTerms)) {
    return { status: 'BLOCKED', confidence: 'high', reason: `Bloqueo/CAPTCHA detectado (HTTP ${httpStatus}).`, price: null };
  }

  if (!signatureMatches(text, store.signatureGroups)) {
    return { status: 'NOT_FOUND', confidence: 'high', reason: 'No se encontró una coincidencia suficientemente fuerte con el producto exacto.', price: null };
  }

  const context = productContext(text);
  const price = extractPrice(context, store.priceCurrency);

  // Negative states ALWAYS win to avoid GameStop-style false positives.
  if (includesAny(context, store.negative.COMING_SOON)) {
    return { status: 'COMING_SOON', confidence: 'high', reason: 'La ficha existe, pero indica Coming Soon/Próximamente.', price };
  }

  if (includesAny(context, store.negative.OUT_OF_STOCK)) {
    return { status: 'OUT_OF_STOCK', confidence: 'high', reason: 'La ficha existe, pero indica agotado/no disponible.', price };
  }

  if (includesAny(context, store.positive.PREORDER)) {
    return { status: 'PREORDER', confidence: 'medium', reason: 'Se detectó una acción explícita de preventa/reserva sin estados negativos.', price };
  }

  if (includesAny(context, store.positive.AVAILABLE)) {
    return { status: 'AVAILABLE', confidence: 'medium', reason: 'Se detectó una acción explícita de compra sin estados negativos.', price };
  }

  return { status: 'LISTED', confidence: 'medium', reason: 'Producto localizado, pero la página no permite confirmar compra/preventa.', price };
}

async function fetchWithTimeout(url, timeoutMs = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });
    const html = await response.text();
    return { response, html };
  } finally {
    clearTimeout(timer);
  }
}

async function readPreviousStatus() {
  if (REMOTE_STATUS_URL) {
    try {
      const res = await fetch(REMOTE_STATUS_URL, { headers: { 'cache-control': 'no-cache' } });
      if (res.ok) return await res.json();
    } catch (error) {
      console.warn('No se pudo leer estado remoto previo:', error.message);
    }
  }

  try {
    return JSON.parse(await fs.readFile(STATUS_FILE, 'utf8'));
  } catch {
    return { product: PRODUCT, stores: [] };
  }
}

async function checkStore(store) {
  const checkedAt = new Date().toISOString();
  try {
    const { response, html } = await fetchWithTimeout(store.url);
    const result = classifyHtml(store, html, response.status);
    return {
      id: store.id,
      retailer: store.name,
      country: store.country,
      url: response.url || store.url,
      sourceUrl: store.url,
      currency: store.priceCurrency,
      expectedPrice: store.expectedPrice,
      checkedAt,
      httpStatus: response.status,
      ...result,
    };
  } catch (error) {
    return {
      id: store.id,
      retailer: store.name,
      country: store.country,
      url: store.url,
      sourceUrl: store.url,
      currency: store.priceCurrency,
      expectedPrice: store.expectedPrice,
      checkedAt,
      httpStatus: null,
      status: 'ERROR',
      confidence: 'low',
      reason: error.name === 'AbortError' ? 'Tiempo de espera agotado.' : error.message,
      price: null,
    };
  }
}

function oldStoreMap(previous) {
  return new Map((previous?.stores || []).map((item) => [item.id, item]));
}

function becameBuyable(oldItem, newItem) {
  const buyable = new Set(['AVAILABLE', 'PREORDER']);
  return buyable.has(newItem.status) && (!oldItem || !buyable.has(oldItem.status) || oldItem.status !== newItem.status);
}

function formatPrice(item) {
  if (item.price == null) return 'Precio no confirmado';
  try {
    return new Intl.NumberFormat(item.country === 'Colombia' ? 'es-CO' : 'en-US', {
      style: 'currency',
      currency: item.currency,
      maximumFractionDigits: item.currency === 'COP' ? 0 : 2,
    }).format(item.price);
  } catch {
    return `${item.currency} ${item.price}`;
  }
}

async function sendTelegram(item) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const text = [
    '🚨 ZELDA SWITCH 2 DISPONIBLE',
    `🌎 ${item.country}`,
    `🏪 ${item.retailer}`,
    `✅ ${item.status}`,
    `💰 ${formatPrice(item)}`,
    `🔗 ${item.url}`,
  ].join('\n');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
  });
  if (!res.ok) console.warn('Telegram respondió', res.status, await res.text());
}

async function sendExpoPush(item) {
  const pushToken = process.env.EXPO_PUSH_TOKEN;
  if (!pushToken) return;

  const body = `${item.retailer} · ${formatPrice(item)} · ${item.status}`;
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'accept-encoding': 'gzip, deflate',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      to: pushToken,
      sound: 'default',
      title: '🚨 Zelda Switch 2 disponible',
      body,
      data: { url: item.url, storeId: item.id },
      priority: 'high',
    }),
  });
  if (!res.ok) console.warn('Expo Push respondió', res.status, await res.text());
}

async function main() {
  const previous = await readPreviousStatus();
  const previousMap = oldStoreMap(previous);

  const stores = [];
  // Sequential checks are gentler with retailers and easier to diagnose.
  for (const store of STORES) {
    console.log(`Revisando ${store.name}...`);
    const result = await checkStore(store);
    console.log(`  -> ${result.status}: ${result.reason}`);
    stores.push(result);
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  const now = new Date().toISOString();
  const alerts = stores.filter((item) => becameBuyable(previousMap.get(item.id), item));

  const output = {
    schemaVersion: 1,
    product: PRODUCT,
    generatedAt: now,
    alertCount: alerts.length,
    stores,
  };

  await fs.writeFile(STATUS_FILE, JSON.stringify(output, null, 2) + '\n', 'utf8');

  for (const alert of alerts) {
    console.log(`ALERTA: ${alert.retailer} ${alert.status}`);
    await Promise.allSettled([sendTelegram(alert), sendExpoPush(alert)]);
  }

  console.log(`Estado guardado en ${STATUS_FILE}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
