import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const requireSystemAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isSystemAdmin: true },
    });

    if (!user?.isSystemAdmin) {
      res.status(403).json({ error: 'This operation requires system administrator privileges.' });
      return;
    }

    next();
  } catch (error) {
    console.error('System administrator verification error:', error);
    res.status(500).json({ error: 'Failed to verify privileges.' });
  }
};
