/**
 * Resilient paged fetch for ArcGIS Feature Service / Map Service layers.
 *
 * Fort Worth retired its Socrata portal; data.fortworthtexas.gov is now an
 * ArcGIS Hub site backed by Feature Services. Those layers cap `maxRecordCount`
 * at 1,000 and ignore a larger `resultRecordCount`, so bulk extraction means
 * many small `resultOffset` pages rather than a few large ones.
 *
 * Pages are fetched with bounded concurrency: ~576k records at 1,000/page is
 * ~576 requests. Prefer `fetchArcGISEach` for large layers — accumulating that
 * many row objects before aggregating is enough to exhaust a default Node heap.
 */

export interface ArcGISFetchOptions {
  /** Label for log lines, e.g. "incidents-etl". */
  label: string;
  /** Layer query URL, e.g. ".../FeatureServer/0" (no trailing /query). */
  layerUrl: string;
  /** Fields to return. Defaults to all. */
  outFields?: string[];
  /** SQL where clause. Defaults to "1=1". */
  where?: string;
  /**
   * Field to sort by. Defaults to the layer's object-id field, which is
   * indexed and unique — the only ordering that pages cheaply. Sorting on an
   * unindexed attribute makes the service re-sort the whole result set per
   * page (measured at 14s vs 4s on Fort Worth's crime layer).
   */
  orderByFields?: string;
  /** Max attempts per page before giving up. Default 5. */
  attempts?: number;
  /** Per-attempt timeout in ms. Default 120s. */
  timeoutMs?: number;
  /** Pages in flight at once. Default 8. */
  concurrency?: number;
  /** Safety ceiling on total records. */
  maxRecords?: number;
}

interface ArcGISQueryResponse<T> {
  features?: { attributes: T }[];
  exceededTransferLimit?: boolean;
  error?: { code: number; message: string; details?: string[] };
}

/** Fetch one page with retry/backoff. Returns the attribute rows. */
async function fetchPage<T>(
  opts: ArcGISFetchOptions,
  offset: number,
  pageSize: number,
): Promise<T[]> {
  const attempts = opts.attempts ?? 5;
  const timeoutMs = opts.timeoutMs ?? 120_000;

  const params = new URLSearchParams({
    where: opts.where ?? "1=1",
    outFields: (opts.outFields ?? ["*"]).join(","),
    returnGeometry: "false",
    resultOffset: String(offset),
    resultRecordCount: String(pageSize),
    f: "json",
  });
  if (opts.orderByFields) params.set("orderByFields", opts.orderByFields);

  const url = `${opts.layerUrl}/query?${params.toString()}`;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (attempt > 1) {
      const backoff = Math.min(2000 * 2 ** (attempt - 2), 30_000);
      await new Promise((r) => setTimeout(r, backoff));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          throw new Error(`ArcGIS ${res.status}: ${res.statusText}`);
        }
        lastErr = `HTTP ${res.status} ${res.statusText}`;
        continue;
      }
      const body = (await res.json()) as ArcGISQueryResponse<T>;
      // ArcGIS reports errors in a 200 body rather than an HTTP status.
      if (body.error) throw new Error(`ArcGIS error ${body.error.code}: ${body.error.message}`);
      return (body.features ?? []).map((f) => f.attributes);
    } catch (err) {
      if (err instanceof Error && /^ArcGIS (4\d\d|error)/.test(err.message)) throw err;
      lastErr = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`ArcGIS page at offset ${offset} failed after ${attempts} attempts: ${lastErr}`);
}

/** Return the number of records matching the query. */
export async function fetchArcGISCount(opts: ArcGISFetchOptions): Promise<number> {
  const params = new URLSearchParams({
    where: opts.where ?? "1=1",
    returnCountOnly: "true",
    f: "json",
  });
  const res = await fetch(`${opts.layerUrl}/query?${params.toString()}`);
  if (!res.ok) throw new Error(`ArcGIS count ${res.status}: ${res.statusText}`);
  const body = (await res.json()) as { count?: number; error?: { message: string } };
  if (body.error) throw new Error(`ArcGIS count error: ${body.error.message}`);
  return body.count ?? 0;
}

/** Read the layer's page-size ceiling and object-id field name. */
async function fetchLayerMeta(
  layerUrl: string,
): Promise<{ pageSize: number; oidField: string }> {
  const fallback = { pageSize: 1000, oidField: "ObjectId" };
  try {
    const res = await fetch(`${layerUrl}?f=json`);
    if (!res.ok) return fallback;
    const body = (await res.json()) as {
      maxRecordCount?: number;
      objectIdField?: string;
      fields?: { name: string; type: string }[];
    };
    const oidField =
      body.objectIdField ??
      body.fields?.find((f) => f.type === "esriFieldTypeOID")?.name ??
      fallback.oidField;
    return {
      pageSize: Math.min(body.maxRecordCount ?? fallback.pageSize, 2000),
      oidField,
    };
  } catch {
    return fallback;
  }
}

/**
 * Page through every matching record, handing each batch to `onRows` instead of
 * accumulating it. Returns the number of records seen.
 *
 * The total is resolved up front via returnCountOnly so pages can be issued in
 * parallel rather than walking until an empty response. `onRows` is called from
 * several in-flight workers, but JS runs it to completion on a single thread —
 * so a synchronous handler needs no locking. Keep it synchronous.
 */
export async function fetchArcGISEach<T = Record<string, unknown>>(
  opts: ArcGISFetchOptions,
  onRows: (rows: T[]) => void,
): Promise<number> {
  const concurrency = opts.concurrency ?? 8;
  const { pageSize, oidField } = await fetchLayerMeta(opts.layerUrl);
  const orderByFields = opts.orderByFields ?? `${oidField} ASC`;
  const total = await fetchArcGISCount(opts);
  const cap = opts.maxRecords ?? Number.POSITIVE_INFINITY;
  const target = Math.min(total, cap);
  const pageCount = Math.ceil(target / pageSize);

  console.log(
    `[${opts.label}] ArcGIS: ${total.toLocaleString()} matching records, ` +
      `${pageCount.toLocaleString()} pages of ${pageSize} ` +
      `(concurrency ${concurrency}, ordered by ${orderByFields})`,
  );

  let nextPage = 0;
  let done = 0;
  let seen = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const page = nextPage++;
      if (page >= pageCount) return;
      const batch = await fetchPage<T>({ ...opts, orderByFields }, page * pageSize, pageSize);
      seen += batch.length;
      onRows(batch);
      done++;
      if (done % 50 === 0 || done === pageCount) {
        console.log(
          `[${opts.label}]   ${done}/${pageCount} pages — ${seen.toLocaleString()} records`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, pageCount) }, worker));

  console.log(`[${opts.label}] ArcGIS: fetched ${seen.toLocaleString()} records`);
  return seen;
}

/**
 * Collect every matching record into an array.
 *
 * Only safe for small layers — a few hundred thousand row objects held at once
 * will exhaust a default Node heap. Use `fetchArcGISEach` for bulk extraction.
 */
export async function fetchArcGISAll<T = Record<string, unknown>>(
  opts: ArcGISFetchOptions,
): Promise<T[]> {
  const rows: T[] = [];
  await fetchArcGISEach<T>(opts, (batch) => {
    rows.push(...batch);
  });
  return rows;
}
