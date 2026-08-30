import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const requireSystemAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Brak autoryzacji.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isSystemAdmin: true },
    });

    if (!user?.isSystemAdmin) {
      res.status(403).json({ error: 'Ta operacja wymaga uprawnień administratora systemu.' });
      return;
    }

    next();
  } catch (error) {
    console.error('Błąd weryfikacji administratora systemu:', error);
    res.status(500).json({ error: 'Nie udało się zweryfikować uprawnień.' });
  }
};
