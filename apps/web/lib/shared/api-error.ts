/**
 * An error carrying a response status. Layer-neutral: both the Cloud HTTP
 * plumbing and Protocol verification raise it, so it lives in lib/shared rather
 * than forcing lib/protocol to depend on lib/cloud. See docs/architecture.md.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
