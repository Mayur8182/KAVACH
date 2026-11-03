/**
 * Thing Design System — Common API & Request State Types
 * Strictly models real client states without inventing fake data.
 */

export type RequestState =
  | 'IDLE'
  | 'LOADING'
  | 'SUCCESS'
  | 'EMPTY'
  | 'ERROR'
  | 'NOT_CONFIGURED'
  | 'NOT_CONNECTED'
  | 'PERMISSION_DENIED'
  | 'AUTHENTICATION_FAILED'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiMetadata {
  request_id?: string;
  correlation_id?: string;
  timestamp?: string;
  duration_ms?: number;
}
