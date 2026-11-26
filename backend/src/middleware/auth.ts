import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { apiError } from '../utils/messages.js';
import { JWT_SECRET } from '../utils/jwtSecret.js';


export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  householdId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ ...apiError('AUTH_TOKEN_MISSING') });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    // Fetch fresh user data from DB to ensure current role and householdId
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true, role: true, householdId: true }
    });

    if (!dbUser) {
      res.status(401).json({ ...apiError('USER_NOT_EXIST') });
      return;
    }

    req.user = dbUser;
    next();
  } catch (err) {
    res.status(403).json({ ...apiError('AUTH_TOKEN_INVALID') });
    return;
  }
};
