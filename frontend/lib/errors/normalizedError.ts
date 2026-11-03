import { NormalizedApiError, ThingApiError } from '@/types/api/errors';

/**
 * Normalizes HTTP response errors into a unified ThingApiError.
 */
export async function normalizeHttpError(res: Response, correlationId?: string): Promise<ThingApiError> {
  let errorData: any = null;
  try {
    errorData = await res.json();
  } catch {
    errorData = null;
  }

  const statusCode = res.status;
  const requestId = correlationId || res.headers.get('x-request-id') || errorData?.request_id || errorData?.error?.request_id;

  let code = errorData?.error?.code || errorData?.code;
  let message = errorData?.error?.message || errorData?.detail || errorData?.message;
  let detail = errorData?.error?.detail || errorData?.detail;
  let remediation: string | undefined;

  if (statusCode === 401) {
    code = code || 'UNAUTHENTICATED';
    message = message || 'Session is invalid or expired. Please sign in again.';
    remediation = 'Obtain a fresh bearer token via /api/v1/auth/token';
  } else if (statusCode === 403) {
    code = code || 'PERMISSION_DENIED';
    message = message || 'You do not have permission to perform this action.';
    remediation = 'Verify role assignments and RBAC policies in Governance';
  } else if (statusCode === 404) {
    code = code || 'NOT_FOUND';
    message = message || 'The requested resource was not found on the server.';
    remediation = 'Check that the entity ID exists in the database';
  } else if (statusCode >= 500) {
    code = code || 'INTERNAL_SERVER_ERROR';
    message = message || 'The backend encountered an internal error.';
    remediation = 'Check server logs with the correlated Request ID';
  } else {
    code = code || `HTTP_${statusCode}`;
    message = message || `Request failed with status ${statusCode}`;
  }

  const normalized: NormalizedApiError = {
    code,
    message: typeof message === 'string' ? message : JSON.stringify(message),
    detail,
    request_id: requestId,
    status_code: statusCode,
    remediation,
  };

  return new ThingApiError(normalized);
}

/**
 * Normalizes client/network exceptions.
 */
export function normalizeNetworkError(err: any, correlationId?: string): ThingApiError {
  if (err instanceof ThingApiError) {
    return err;
  }

  let message = err?.message || 'Unable to connect to backend server. Verify that the server is running.';
  if (
    message === 'signal is aborted without reason' ||
    message.toLowerCase().includes('aborted') ||
    err?.name === 'AbortError'
  ) {
    message = 'Request connection timed out or was interrupted. Please check network connectivity and try again.';
  }

  return new ThingApiError({
    code: 'NETWORK_ERROR',
    message,
    request_id: correlationId,
    status_code: 0,
    remediation: 'Ensure backend server is running on http://127.0.0.1:8000',
  });
}

