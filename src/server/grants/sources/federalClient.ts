import { setTimeout as wait } from 'node:timers/promises';

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 500;
const DEFAULT_TIMEOUT_MS = 12_000;

type FetchOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
};

export async function postJsonWithRetry<T>(url: string, body: unknown, opts: FetchOptions = {}): Promise<T> {
  return postWithRetry<T>(
    url,
    JSON.stringify(body),
    {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
    }
  );
}

export async function postFormWithRetry<T>(url: string, formBody: string, opts: FetchOptions = {}): Promise<T> {
  return postWithRetry<T>(
    url,
    formBody,
    {
      ...opts,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(opts.headers ?? {}) },
    }
  );
}

async function postWithRetry<T>(url: string, body: string, opts: FetchOptions): Promise<T> {
  let attempt = 0;
  const maxRetries = opts.maxRetries ?? MAX_RETRIES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        body,
        headers: opts.headers,
        signal: controller.signal,
      });
      if (res.ok) {
        return (await res.json()) as T;
      }
      const retryAfter = res.headers.get('retry-after');
      const retryable = res.status >= 500 || res.status === 429;
      if (!retryable || attempt >= maxRetries) {
        throw new Error(`Request failed (${res.status} ${res.statusText})`);
      }
      const backoff = computeBackoff(attempt, retryAfter);
      await wait(backoff);
      attempt++;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (attempt >= maxRetries) throw err;
        const backoff = computeBackoff(attempt);
        await wait(backoff);
        attempt++;
        continue;
      }
      if (attempt >= maxRetries) throw err;
      const backoff = computeBackoff(attempt);
      await wait(backoff);
      attempt++;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function computeBackoff(attempt: number, retryAfter?: string | null): number {
  const base = BASE_BACKOFF_MS * 2 ** attempt;
  const jitter = Math.random() * BASE_BACKOFF_MS;
  const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 0;
  return Math.max(base + jitter, retryAfterMs || 0);
}

export function parseFederalDateMMDDYYYY(value: string | null | undefined): Date | null {
  if (!value) return null;
  const str = String(value).trim();
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = str.match(mmddyyyy);
  if (match) {
    const [, m, d, y] = match;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const isoDate = new Date(str);
  return Number.isNaN(isoDate.getTime()) ? null : isoDate;
}

export function normalizeOppStatusToGrantStatus(
  oppStatus: string | undefined,
  closeDate: Date | null,
  now = new Date()
): { status: 'OPEN' | 'CLOSED' | 'UNKNOWN'; closedAt: Date | null } {
  const norm = oppStatus?.toLowerCase() ?? '';
  const closedByDate = !!closeDate && closeDate.getTime() < now.getTime();
  if (['closed', 'archived'].includes(norm) || closedByDate) {
    return { status: 'CLOSED', closedAt: closeDate ?? now };
  }
  if (['posted', 'forecasted'].includes(norm)) {
    return { status: 'OPEN', closedAt: null };
  }
  return { status: 'UNKNOWN', closedAt: null };
}
