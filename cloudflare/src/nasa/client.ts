import type { EarthdataClientRequest, EarthdataSuccessResponse } from "./types.ts";

const DEFAULT_TIMEOUT_MS = 20_000;
const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export class EarthdataClientError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "EarthdataClientError";
    this.status = status;
  }
}

function isTransientStatus(status: number) {
  return TRANSIENT_STATUSES.has(status);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function buildHeaders(token: string) {
  return {
    accept: "application/json",
    authorization: `Bearer ${token}`,
    "user-agent": "PCS-Backend/0.1 NASA-Earthdata-Gateway"
  };
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return {
    content_type: contentType || "text/plain",
    body: text.slice(0, 50_000),
    truncated: text.length > 50_000
  };
}

async function fetchOnce(request: EarthdataClientRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    return await fetch(request.url, {
      headers: buildHeaders(request.token),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchEarthdata(
  request: EarthdataClientRequest
): Promise<EarthdataSuccessResponse> {
  const started = Date.now();
  let lastStatus = 502;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchOnce(request);
      lastStatus = response.status;

      if (!response.ok) {
        if (attempt === 0 && isTransientStatus(response.status)) {
          continue;
        }
        throw new EarthdataClientError("NASA Earthdata request failed", response.status);
      }

      return {
        success: true,
        source: "NASA Earthdata",
        dataset: request.dataset,
        request_url: request.url,
        status: response.status,
        response_time_ms: Date.now() - started,
        timestamp: new Date().toISOString(),
        data: await parseResponse(response)
      };
    } catch (error) {
      if (attempt === 0 && (isAbortError(error) || !(error instanceof EarthdataClientError))) {
        continue;
      }

      if (error instanceof EarthdataClientError) {
        throw error;
      }

      const message = isAbortError(error)
        ? "NASA Earthdata request timed out"
        : "NASA Earthdata request failed";
      throw new EarthdataClientError(message, isAbortError(error) ? 504 : lastStatus);
    }
  }

  throw new EarthdataClientError("NASA Earthdata request failed", lastStatus);
}
