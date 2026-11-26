import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { apiError } from '../utils/messages.js';

export const requireSystemAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ ...apiError('UNAUTHORIZED') });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isSystemAdmin: true },
    });

    if (!user?.isSystemAdmin) {
      res.status(403).json({ ...apiError('SYSADMIN_REQUIRED') });
      return;
    }

    next();
  } catch (error) {
    console.error('System administrator verification error:', error);
    res.status(500).json({ ...apiError('PRIVILEGE_CHECK_FAILED') });
  }
};
