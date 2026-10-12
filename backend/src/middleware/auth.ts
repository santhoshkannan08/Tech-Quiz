import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../utils/errors.js';

export type AdminRequest = Request & { adminId?: string };

export function requireAdmin(req: AdminRequest, _res: Response, next: NextFunction): void {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new HttpError(401, 'Administrator authentication required'));
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { adminId?: string };
    if (!payload.adminId) throw new Error('Invalid token');
    req.adminId = payload.adminId;
    next();
  } catch {
    next(new HttpError(401, 'Invalid administrator session'));
  }
}

export function requireAttemptToken(req: Request, _res: Response, next: NextFunction): void {
  const token = req.header('x-attempt-token');
  if (!token) return next(new HttpError(401, 'Attempt token required'));
  next();
}
