import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { clampExpiryWarningDays } from '../utils/expiryWarning.js';

class BackupValidationError extends Error {}

const isRecord = (value: unknown): value is Record<string, any> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getString = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' ? value : fallback;
};

const getNullableString = (value: unknown): string | null => {
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const getBoolean = (value: unknown, fallback = false): boolean => {
  return typeof value === 'boolean' ? value : fallback;
};

const getInteger = (value: unknown, fallback: number, min?: number, max?: number): number => {
  let result = typeof value === 'number' && Number.isInteger(value) ? value : fallback;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
};

const getDate = (value: unknown, fallback = new Date()): Date => {
  if (typeof value !== 'string' && !(value instanceof Date)) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const getNullableDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getBackupArray = (backup: Record<string, any>, key: string): Record<string, any>[] => {
  const value = backup[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new BackupValidationError(`Nieprawidłowe pole "${key}" w kopii zapasowej.`);
  if (!value.every(isRecord)) throw new BackupValidationError(`Nieprawidłowe dane w polu "${key}" kopii zapasowej.`);
  return value;
};

const requireName = (item: Record<string, any>, section: string): string => {
  const name = getString(item.name).trim();
  if (!name) throw new BackupValidationError(`Brak nazwy w sekcji "${section}" kopii zapasowej.`);
  return name;
};

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
    const { expiryWarningDays, name } = req.body;
    const data: { expiryWarningDays?: number; name?: string } = {};

    if (expiryWarningDays !== undefined) {
      data.expiryWarningDays = clampExpiryWarningDays(expiryWarningDays);
    }

    if (name !== undefined) {
      if (req.user!.role !== 'ADMIN') {
        res.status(403).json({ error: 'Tylko administrator może zmienić nazwę gospodarstwa.' });
        return;
      }
      const trimmed = String(name).trim();
      if (!trimmed) {
        res.status(400).json({ error: 'Nazwa gospodarstwa nie może być pusta.' });
        return;
      }
      data.name = trimmed;
    }

    const household = await prisma.household.update({
      where: { id: householdId },
      data,
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

export const restoreHouseholdBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;
    let backup: unknown = req.body;

    if (typeof backup === 'string') {
      try {
        backup = JSON.parse(backup);
      } catch {
        res.status(400).json({ error: 'Wybrany plik nie zawiera poprawnego JSON.' });
        return;
      }
    }

    if (!isRecord(backup)) {
      res.status(400).json({ error: 'Nieprawidłowy format kopii zapasowej.' });
      return;
    }

    const pantryItems = getBackupArray(backup, 'pantryItems');
    const shoppingLists = getBackupArray(backup, 'shoppingLists');
    const notes = getBackupArray(backup, 'notes');
    const recipes = getBackupArray(backup, 'recipes');
    const customCategories = getBackupArray(backup, 'customCategories');

    if (
      pantryItems.length > 20000 ||
      shoppingLists.length > 1000 ||
      notes.length > 10000 ||
      recipes.length > 5000 ||
      customCategories.length > 1000
    ) {
      res.status(400).json({ error: 'Kopia zapasowa zawiera zbyt dużo rekordów.' });
      return;
    }

    const categoryNames = new Set<string>();
    for (const category of customCategories) {
      const name = requireName(category, 'customCategories');
      const key = name.toLocaleLowerCase('pl');
      if (categoryNames.has(key)) {
        throw new BackupValidationError(`Kopia zawiera zduplikowaną kategorię "${name}".`);
      }
      categoryNames.add(key);
    }

    let shoppingItemCount = 0;
    for (const list of shoppingLists) {
      requireName(list, 'shoppingLists');
      if (list.items !== undefined && !Array.isArray(list.items)) {
        throw new BackupValidationError('Nieprawidłowa lista produktów w kopii zapasowej.');
      }
      const items = Array.isArray(list.items) ? list.items : [];
      shoppingItemCount += items.length;
      if (shoppingItemCount > 50000) {
        throw new BackupValidationError('Kopia zapasowa zawiera zbyt dużo pozycji list zakupów.');
      }
      for (const item of items) {
        if (!isRecord(item)) throw new BackupValidationError('Nieprawidłowa pozycja listy zakupów.');
        requireName(item, 'shoppingLists.items');
      }
    }

    for (const item of pantryItems) requireName(item, 'pantryItems');
    for (const note of notes) {
      if (!getString(note.title).trim()) throw new BackupValidationError('Brak tytułu notatki w kopii zapasowej.');
    }
    for (const recipe of recipes) requireName(recipe, 'recipes');

    await prisma.$transaction(async (tx) => {
      await tx.pantryItem.deleteMany({ where: { householdId } });
      await tx.shoppingList.deleteMany({ where: { householdId } });
      await tx.note.deleteMany({ where: { householdId } });
      await tx.recipe.deleteMany({ where: { householdId } });
      await tx.categorySetting.deleteMany({ where: { householdId } });

      for (const category of customCategories) {
        await tx.categorySetting.create({
          data: {
            householdId,
            name: requireName(category, 'customCategories'),
            icon: getString(category.icon, 'tag'),
            color: getString(category.color, 'gray'),
            order: getInteger(category.order, 0, 0),
          },
        });
      }

      for (const item of pantryItems) {
        await tx.pantryItem.create({
          data: {
            householdId,
            barcode: getNullableString(item.barcode),
            name: requireName(item, 'pantryItems'),
            brand: getNullableString(item.brand),
            category: getString(item.category, 'Inne'),
            quantity: getInteger(item.quantity, 1, 1),
            capacity: getNullableString(item.capacity),
            expiryDate: getNullableDate(item.expiryDate),
            openedDate: getNullableDate(item.openedDate),
            notes: getNullableString(item.notes),
            imageUrl: getNullableString(item.imageUrl),
            status: getString(item.status, 'ACTIVE'),
            addedById: getNullableString(item.addedById),
            createdAt: getDate(item.createdAt),
            updatedAt: getDate(item.updatedAt),
          },
        });
      }

      for (const list of shoppingLists) {
        const createdList = await tx.shoppingList.create({
          data: {
            householdId,
            name: requireName(list, 'shoppingLists'),
            icon: getString(list.icon, 'shopping-bag'),
            color: getString(list.color, 'emerald'),
            isArchived: getBoolean(list.isArchived, false),
            createdAt: getDate(list.createdAt),
            updatedAt: getDate(list.updatedAt),
          },
        });

        const items = Array.isArray(list.items) ? list.items : [];
        for (const rawItem of items) {
          const item = rawItem as Record<string, any>;
          await tx.shoppingItem.create({
            data: {
              shoppingListId: createdList.id,
              name: requireName(item, 'shoppingLists.items'),
              quantity: getInteger(item.quantity, 1, 1),
              capacity: getNullableString(item.capacity),
              category: getString(item.category, 'Inne'),
              barcode: getNullableString(item.barcode),
              isChecked: getBoolean(item.isChecked, false),
              createdAt: getDate(item.createdAt),
              updatedAt: getDate(item.updatedAt),
            },
          });
        }
      }

      for (const note of notes) {
        await tx.note.create({
          data: {
            householdId,
            title: getString(note.title).trim(),
            content: getString(note.content),
            isChecklist: getBoolean(note.isChecklist, false),
            checklistData: getNullableString(note.checklistData),
            color: getString(note.color, 'default'),
            isPinned: getBoolean(note.isPinned, false),
            category: getString(note.category, 'Ogólne'),
            createdById: getNullableString(note.createdById),
            createdAt: getDate(note.createdAt),
            updatedAt: getDate(note.updatedAt),
          },
        });
      }

      for (const recipe of recipes) {
        await tx.recipe.create({
          data: {
            householdId,
            name: requireName(recipe, 'recipes'),
            instructions: getString(recipe.instructions),
            ingredients: getString(recipe.ingredients, '[]'),
            notes: getNullableString(recipe.notes),
            imageUrl: getNullableString(recipe.imageUrl),
            rating: getInteger(recipe.rating, 5, 1, 10),
            createdById: getNullableString(recipe.createdById),
            createdAt: getDate(recipe.createdAt),
            updatedAt: getDate(recipe.updatedAt),
          },
        });
      }
    }, { maxWait: 5000, timeout: 30000 });

    res.json({
      message: 'Kopia zapasowa została przywrócona.',
      restored: {
        pantryItems: pantryItems.length,
        shoppingLists: shoppingLists.length,
        shoppingItems: shoppingItemCount,
        notes: notes.length,
        recipes: recipes.length,
        categories: customCategories.length,
      },
    });
  } catch (error) {
    if (error instanceof BackupValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Błąd przywracania kopii zapasowej:', error);
    res.status(500).json({ error: 'Błąd podczas przywracania kopii zapasowej. Nie zmieniono danych.' });
  }
};
