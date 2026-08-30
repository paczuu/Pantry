import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { logActivity } from '../services/auditService.js';
import { addDays, getExpiryWarningDays } from '../utils/expiryWarning.js';

export const getShoppingLists = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;

    const lists = await prisma.shoppingList.findMany({
      where: { householdId, isArchived: false },
      include: {
        items: {
          orderBy: [{ isChecked: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ lists });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas pobierania list zakupów.' });
  }
};

export const getShoppingListById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;

    const list = await prisma.shoppingList.findFirst({
      where: { id, householdId },
      include: {
        items: {
          orderBy: [{ isChecked: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!list) {
      res.status(404).json({ error: 'Lista zakupów nie istnieje.' });
      return;
    }

    res.json({ list });
  } catch (error) {
    res.status(500).json({ error: 'Błąd pobierania listy zakupów.' });
  }
};

export const createShoppingList = async (req: Request, res: Response): Promise<void> => {
  try {
    const householdId = req.user!.householdId!;
    const { name, icon = 'shopping-bag', color = 'emerald' } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Nazwa listy jest wymagana.' });
      return;
    }

    const newList = await prisma.shoppingList.create({
      data: {
        householdId,
        name: name.trim(),
        icon,
        color,
      },
      include: { items: true },
    });

    res.status(201).json({ list: newList, message: 'Lista zakupów została utworzona.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas tworzenia listy zakupów.' });
  }
};

export const updateShoppingList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;
    const { name, icon, color } = req.body;

    const list = await prisma.shoppingList.update({
      where: { id },
      data: {
        name: name?.trim(),
        icon,
        color,
      },
    });

    res.json({ list, message: 'Lista zaktualizowana.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas edycji listy.' });
  }
};

export const deleteShoppingList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;

    await prisma.shoppingList.deleteMany({
      where: { id, householdId },
    });

    res.json({ message: 'Lista została usunięta.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas usuwania listy.' });
  }
};

export const addShoppingItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;
    const { name, quantity = 1, capacity, category = 'Inne', barcode } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Nazwa produktu jest wymagana.' });
      return;
    }

    const list = await prisma.shoppingList.findFirst({
      where: { id, householdId },
    });

    if (!list) {
      res.status(404).json({ error: 'Lista zakupów nie istnieje.' });
      return;
    }

    const item = await prisma.shoppingItem.create({
      data: {
        shoppingListId: id,
        name: name.trim(),
        quantity: Math.max(1, parseInt(quantity) || 1),
        capacity: capacity?.trim() || null,
        category: category?.trim() || 'Inne',
        barcode: barcode?.trim() || null,
      },
    });

    res.status(201).json({ item, message: 'Dodano do listy zakupów.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas dodawania do listy.' });
  }
};

export const updateShoppingItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { name, quantity, capacity, category, isChecked, barcode } = req.body;

    const item = await prisma.shoppingItem.update({
      where: { id: itemId },
      data: {
        name: name?.trim(),
        quantity: quantity !== undefined ? Math.max(1, parseInt(quantity) || 1) : undefined,
        capacity: capacity !== undefined ? (capacity?.trim() || null) : undefined,
        category: category?.trim(),
        isChecked: isChecked !== undefined ? isChecked : undefined,
        barcode: barcode !== undefined ? (barcode?.trim() || null) : undefined,
      },
    });

    res.json({ item });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas aktualizacji pozycji na liście.' });
  }
};

export const deleteShoppingItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;

    await prisma.shoppingItem.delete({
      where: { id: itemId },
    });

    res.json({ message: 'Pozycja usunięta z listy.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas usuwania pozycji.' });
  }
};

export const clearCheckedShoppingItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.shoppingItem.deleteMany({
      where: {
        shoppingListId: id,
        isChecked: true,
      },
    });

    res.json({ message: 'Kupione pozycje zostały wyczyszczone z listy.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas czyszczenia listy.' });
  }
};

export const transferCheckedToPantry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;
    const { items: customTransferItems } = req.body;

    let itemsToTransfer = [];
    if (customTransferItems && Array.isArray(customTransferItems) && customTransferItems.length > 0) {
      itemsToTransfer = customTransferItems;
    } else {
      itemsToTransfer = await prisma.shoppingItem.findMany({
        where: { shoppingListId: id, isChecked: true },
      });
    }

    if (itemsToTransfer.length === 0) {
      res.status(400).json({ error: 'Brak zaznaczonych artykułów do przeniesienia.' });
      return;
    }

    const addedPantryItems = [];

    for (const item of itemsToTransfer) {
      const pantryItem = await prisma.pantryItem.create({
        data: {
          householdId,
          name: item.name,
          quantity: item.quantity || 1,
          capacity: item.capacity || null,
          category: item.category || 'Inne',
          barcode: item.barcode || null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          addedById: req.user!.id,
          status: 'ACTIVE',
        },
      });

      addedPantryItems.push(pantryItem);

      if (item.id) {
        await prisma.shoppingItem.deleteMany({
          where: { id: item.id },
        });
      }
    }

    await logActivity({
      householdId,
      userId: req.user!.id,
      userName: req.user!.name,
      userEmail: req.user!.email,
      action: 'PRZENIESIONO_Z_LISTY',
      entityType: 'PANTRY_ITEM',
      entityName: `${addedPantryItems.length} produktów`,
      details: `Przeniesiono ${addedPantryItems.length} kupionych artykułów z listy zakupów bezpośrednio do spiżarni.`,
    });

    res.json({
      message: `Przeniesiono pomyślnie ${addedPantryItems.length} artykułów do spiżarni!`,
      addedCount: addedPantryItems.length,
      items: addedPantryItems,
    });
  } catch (error) {
    console.error('Błąd przenoszenia do spiżarni:', error);
    res.status(500).json({ error: 'Błąd podczas przenoszenia produktów do spiżarni.' });
  }
};

export const addExpiringToShoppingList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const warningDays = await getExpiryWarningDays(householdId);
    const warningUntil = addDays(today, warningDays);

    const expiringItems = await prisma.pantryItem.findMany({
      where: {
        householdId,
        status: 'ACTIVE',
        expiryDate: { lte: warningUntil },
      },
    });

    let addedCount = 0;
    for (const item of expiringItems) {
      const exists = await prisma.shoppingItem.findFirst({
        where: { shoppingListId: id, name: item.name },
      });

      if (!exists) {
        await prisma.shoppingItem.create({
          data: {
            shoppingListId: id,
            name: item.name,
            quantity: item.quantity,
            capacity: item.capacity,
            category: item.category,
            barcode: item.barcode,
          },
        });
        addedCount++;
      }
    }

    res.json({
      message: `Dodano ${addedCount} produktów z krótkim terminem do listy zakupów.`,
      addedCount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas dodawania kończących się produktów.' });
  }
};
