import { publicEnv } from '~/shared/config';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const baseUrl = publicEnv.NEXT_PUBLIC_PRODUCTS_API_URL.replace(/\/$/, '');

interface ApiErrorBody {
  message?: string;
  code?: string;
  details?: unknown;
}

const isApiErrorBody = (value: unknown): value is ApiErrorBody =>
  typeof value === 'object' && value !== null;

/**
 * Thin wrapper over `fetch` for the Products API.
 *  - Prepends the base URL.
 *  - Sets JSON content-type by default.
 *  - On non-2xx, parses the JSON error body and throws ApiError.
 */
export const httpRequest = async (path: string, init?: RequestInit): Promise<Response> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // ignore JSON parse errors — fall back to status text
    }
    const message = isApiErrorBody(body) && body.message ? body.message : response.statusText;
    const code = isApiErrorBody(body) ? body.code : undefined;
    const details = isApiErrorBody(body) ? body.details : undefined;
    throw new ApiError(response.status, code, message, details);
  }

  return response;
};
