import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', details: error.issues });
    return;
  }
  const status = error instanceof HttpError ? error.status : 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : error.message });
};
