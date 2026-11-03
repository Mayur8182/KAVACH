/**
 * Thing API Error Model
 * Normalizes backend error responses into actionable, debuggable client errors.
 */

export interface NormalizedApiError {
  code: string;
  message: string;
  detail?: string | Record<string, any>;
  request_id?: string;
  status_code: number;
  remediation?: string;
}

export class ThingApiError extends Error {
  public readonly code: string;
  public readonly detail?: string | Record<string, any>;
  public readonly request_id?: string;
  public readonly status_code: number;
  public readonly remediation?: string;

  constructor(error: NormalizedApiError) {
    super(error.message);
    this.name = 'ThingApiError';
    this.code = error.code;
    this.detail = error.detail;
    this.request_id = error.request_id;
    this.status_code = error.status_code;
    this.remediation = error.remediation;
  }
}
