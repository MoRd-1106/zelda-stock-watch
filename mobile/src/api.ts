import { STATUS_URL } from './config';
import type { StockPayload } from './types';

export async function loadStock(): Promise<StockPayload> {
  if (!STATUS_URL || STATUS_URL.includes('TU_USUARIO')) {
    throw new Error('Configura EXPO_PUBLIC_STATUS_URL en mobile/.env');
  }

  const separator = STATUS_URL.includes('?') ? '&' : '?';
  const response = await fetch(`${STATUS_URL}${separator}t=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache' },
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer el estado (${response.status}).`);
  }

  return response.json();
}
