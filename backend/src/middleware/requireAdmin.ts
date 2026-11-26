import { Request, Response, NextFunction } from 'express';
import { apiError } from '../utils/messages.js';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ ...apiError('UNAUTHORIZED') });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ ...apiError('ADMIN_REQUIRED') });
    return;
  }

  next();
};
