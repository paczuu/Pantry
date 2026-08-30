import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { clampExpiryWarningDays } from '../utils/expiryWarning.js';

export const getHouseholdSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      select: { id: true, name: true, expiryWarningDays: true },
    });

    res.json({ settings: household });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas pobierania ustawień gospodarstwa.' });
  }
};

export const updateHouseholdSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;
    const { expiryWarningDays } = req.body;

    const household = await prisma.household.update({
      where: { id: householdId },
      data: {
        expiryWarningDays:
          expiryWarningDays !== undefined
            ? clampExpiryWarningDays(expiryWarningDays)
            : undefined,
      },
      select: { id: true, name: true, expiryWarningDays: true },
    });

    res.json({ settings: household, message: 'Zapisano ustawienia gospodarstwa.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas zapisywania ustawień gospodarstwa.' });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;
    const categories = await prisma.categorySetting.findMany({
      where: { householdId },
      orderBy: { order: 'asc' },
    });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas pobierania kategorii.' });
  }
};

export const addCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;
    const { name, icon = 'tag', color = 'emerald' } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Nazwa kategorii jest wymagana.' });
      return;
    }

    const count = await prisma.categorySetting.count({ where: { householdId } });

    const category = await prisma.categorySetting.create({
      data: {
        householdId,
        name: name.trim(),
        icon,
        color,
        order: count + 1,
      },
    });

    res.status(201).json({ category });
  } catch (error) {
    res.status(500).json({ error: 'Błąd lub kategoria o tej nazwie już istnieje.' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;

    await prisma.categorySetting.deleteMany({
      where: { id, householdId },
    });

    res.json({ message: 'Kategoria usunięta.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas usuwania kategorii.' });
  }
};

export const exportHouseholdBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        pantryItems: true,
        shoppingLists: { include: { items: true } },
        notes: true,
        recipes: true,
        customCategories: true,
      },
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=pantry-backup-${new Date().toISOString().split('T')[0]}.json`);
    res.json(household);
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas generowania kopii zapasowej.' });
  }
};
