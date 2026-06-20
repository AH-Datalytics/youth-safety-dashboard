/**
 * Resilient Socrata JSON fetch with retry + backoff.
 *
 * The Dallas Open Data portal intermittently drops connections mid-response.
 * Critically, undici's fetch resolves the Response as soon as headers arrive,
 * then throws `TypeError: terminated` (cause: socket closed) when the body is
 * consumed via .json(). So the retry MUST wrap the body read, not just fetch().
 */

export interface SocrataFetchOptions {
  /** Label for log lines, e.g. "incidents-etl". */
  label: string;
  /** Max attempts before giving up. Default 5. */
  attempts?: number;
  /** Per-attempt timeout in ms (covers headers + body). Default 120s. */
  timeoutMs?: number;
}

/**
 * Fetch a Socrata JSON endpoint and parse the body, retrying on transient
 * network failures (dropped connections, timeouts, 5xx, 429).
 */
export async function fetchSocrataJSON<T = unknown>(
  url: string,
  opts: SocrataFetchOptions,
): Promise<T> {
  const attempts = opts.attempts ?? 5;
  const timeoutMs = opts.timeoutMs ?? 120_000;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (attempt > 1) {
      const backoff = Math.min(2000 * 2 ** (attempt - 2), 30_000);
      console.log(
        `[${opts.label}] Retry ${attempt - 1}/${attempts - 1} after ${backoff}ms${lastErr ? ` (${lastErr})` : ""}...`,
      );
      await new Promise((r) => setTimeout(r, backoff));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        // 4xx other than 429 won't fix themselves — fail fast.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          throw new Error(`Socrata ${res.status}: ${res.statusText}`);
        }
        lastErr = `HTTP ${res.status} ${res.statusText}`;
        continue;
      }
      // Body read is where "terminated" is thrown — inside the retry loop.
      return (await res.json()) as T;
    } catch (err) {
      // Abort-on-timeout, dropped connections, and 5xx are retryable; a thrown
      // 4xx is not — surface it immediately.
      if (err instanceof Error && /Socrata 4\d\d/.test(err.message)) throw err;
      lastErr = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`Socrata fetch failed after ${attempts} attempts: ${lastErr}`);
}
