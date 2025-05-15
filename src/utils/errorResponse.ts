export class ErrorResponse extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;

    // This is for capturing the stack trace properly
    Error.captureStackTrace(this, this.constructor);
  }
}