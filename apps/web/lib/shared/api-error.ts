/**
 * An error carrying a response status. Layer-neutral: both the Cloud HTTP
 * plumbing and Protocol verification raise it, so it lives in lib/shared rather
 * than forcing lib/protocol to depend on lib/cloud. See docs/architecture.md.
 */
/**
 * Machine-readable context for a rejection, when the English `message` is not
 * enough for the caller to act.
 *
 * A limit the server refused to lower, for instance, is useless to a user
 * without the floor it refused to go under — and the floor cannot be baked into
 * the message, because the browser renders it in the user's own language. Keep
 * it to plain values a UI can format; it crosses the wire as JSON.
 */
export type ApiErrorDetails = Record<string, string | number | boolean>;

export class ApiError extends Error {
  readonly status: number;
  readonly details?: ApiErrorDetails;

  constructor(status: number, message: string, details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}
