import { Request, Response, NextFunction } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Brak autoryzacji.' });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Brak uprawnień administratora. Dostęp tylko dla roli ADMIN.' });
    return;
  }

  next();
};
