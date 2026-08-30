import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { logActivity } from '../services/auditService.js';
import { addDays, getExpiryWarningDays } from '../utils/expiryWarning.js';

export const getPantryItems = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const householdId = req.user!.householdId;

    if (!householdId) {
      res.status(400).json({ error: 'Brak przypisanego gospodarstwa.' });
      return;
    }

    const {
      category,
      status = 'ACTIVE',
      search,
      filterByExpiry,
      sortBy = 'expiry_asc',
    } = req.query;

    const where: any = { householdId };

    if (status !== 'ALL') {
      where.status = status as string;
    }

    if (category && category !== 'ALL') {
      where.category = category as string;
    }

    if (search) {
      const q = (search as string).trim();

      where.OR = [
        { name: { contains: q } },
        { brand: { contains: q } },
        { barcode: { contains: q } },
        { capacity: { contains: q } },
        { notes: { contains: q } },
      ];
    }

    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const warningDays = await getExpiryWarningDays(householdId!);
    const warningUntil = addDays(today, warningDays);

    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    if (filterByExpiry === 'expired') {
      where.expiryDate = { lt: today };
    } else if (filterByExpiry === 'expiring_3_days' || filterByExpiry === 'expiring_soon') {
      where.expiryDate = {
        gte: today,
        lte: warningUntil,
      };
    } else if (filterByExpiry === 'expiring_7_days') {
      where.expiryDate = {
        gte: today,
        lte: in7Days,
      };
    } else if (filterByExpiry === 'opened') {
      where.openedDate = { not: null };
    }

    let orderBy: any = { expiryDate: 'asc' };

    if (sortBy === 'expiry_desc') {
      orderBy = { expiryDate: 'desc' };
    } else if (sortBy === 'name_asc') {
      orderBy = { name: 'asc' };
    } else if (sortBy === 'quantity_desc') {
      orderBy = { quantity: 'desc' };
    } else if (sortBy === 'created_desc') {
      orderBy = { createdAt: 'desc' };
    }

    const items = await prisma.pantryItem.findMany({
      where,
      orderBy,
    });

    res.json({ items });
  } catch (error) {
    console.error('Błąd pobierania pozycji ze spiżarni:', error);

    res.status(500).json({
      error: 'Błąd podczas pobierania produktów.',
    });
  }
};

export const getPantryItemById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;

    const item = await prisma.pantryItem.findFirst({
      where: {
        id,
        householdId,
      },
    });

    if (!item) {
      res.status(404).json({
        error: 'Produkt nie został odnaleziony.',
      });
      return;
    }

    res.json({ item });
  } catch (error) {
    console.error('Błąd pobierania produktu:', error);

    res.status(500).json({
      error: 'Błąd podczas pobierania produktu.',
    });
  }
};

export const addPantryItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const householdId = req.user!.householdId;

    if (!householdId) {
      res.status(400).json({
        error: 'Brak przypisanego gospodarstwa.',
      });
      return;
    }

    const {
      barcode,
      name,
      brand,
      category = 'Inne',
      quantity = 1,
      capacity,
      expiryDate,
      openedDate,
      notes,
      imageUrl,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        error: 'Nazwa produktu jest wymagana.',
      });
      return;
    }

    const cleanBarcode =
      barcode && String(barcode).trim()
        ? String(barcode).trim()
        : null;

    const parsedQty = Math.max(
      1,
      parseInt(String(quantity), 10) || 1
    );

    const targetExpiry = expiryDate
      ? new Date(expiryDate)
      : null;

    // Sprawdź czy produkt już istnieje w spiżarni
    // i można zwiększyć jego ilość.
    let existingItem = null;

    if (cleanBarcode) {
      existingItem = await prisma.pantryItem.findFirst({
        where: {
          householdId,
          status: 'ACTIVE',
          barcode: cleanBarcode,
          expiryDate: targetExpiry,
        },
      });
    } else {
      existingItem = await prisma.pantryItem.findFirst({
        where: {
          householdId,
          status: 'ACTIVE',
          name: {
            equals: name.trim(),
          },
          category: category.trim() || 'Inne',
          expiryDate: targetExpiry,
        },
      });
    }

    if (existingItem) {
      const updatedItem = await prisma.pantryItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          quantity: existingItem.quantity + parsedQty,
          capacity:
            capacity?.trim() ||
            existingItem.capacity,
          brand:
            brand?.trim() ||
            existingItem.brand,
          imageUrl:
            imageUrl ||
            existingItem.imageUrl,
        },
      });

      const capText = updatedItem.capacity
        ? ` [${updatedItem.capacity}]`
        : '';

      await logActivity({
        householdId,
        userId: req.user!.id,
        userName: req.user!.name,
        userEmail: req.user!.email,
        action: 'ZWIĘKSZONO_ILOSC',
        entityType: 'PANTRY_ITEM',
        entityName: updatedItem.name,
        details:
          `Zwiększono ilość istniejącego produktu ` +
          `"${updatedItem.name}"${capText} o ${parsedQty} szt. ` +
          `(aktualnie w spiżarni: ${updatedItem.quantity} szt.).`,
      });

      res.status(200).json({
        item: updatedItem,
        isMerged: true,
        message:
          `Zwiększono ilość "${updatedItem.name}" ` +
          `o ${parsedQty} szt. ` +
          `(łącznie: ${updatedItem.quantity} szt.)`,
      });

      return;
    }

    const newItem = await prisma.pantryItem.create({
      data: {
        householdId,
        barcode: cleanBarcode,
        name: name.trim(),
        brand: brand?.trim() || null,
        category: category.trim() || 'Inne',
        quantity: parsedQty,
        capacity: capacity?.trim() || null,
        expiryDate: targetExpiry,
        openedDate: openedDate
          ? new Date(openedDate)
          : null,
        notes: notes?.trim() || null,
        imageUrl: imageUrl || null,
        addedById: req.user!.id,
        status: 'ACTIVE',
      },
    });

    // Produkt dodany ręcznie do spiżarni zapisujemy
    // jako CUSTOM w ProductCatalog.
    if (cleanBarcode) {
      try {
        const catalogData = {
          name: name.trim(),
          brand: brand?.trim() || null,
          category: category.trim() || 'Inne',
          capacity: capacity?.trim() || null,
          imageUrl: imageUrl || null,
        };

        const existing = await prisma.productCatalog.findFirst({
          where: {
            barcode: cleanBarcode,
            source: 'CUSTOM',
          },
        });

        if (existing) {
          await prisma.productCatalog.update({
            where: { id: existing.id },
            data: catalogData,
          });
        } else {
          await prisma.productCatalog.create({
            data: {
              barcode: cleanBarcode,
              source: 'CUSTOM',
              ...catalogData,
            },
          });
        }
      } catch (error) {
        console.error(
          'Nie udało się zapisać produktu CUSTOM do ProductCatalog:',
          error
        );
      }
    }

    const expiryText = expiryDate
      ? ` (Ważność: ${new Date(
          expiryDate
        ).toLocaleDateString('pl-PL')})`
      : '';

    const capText = capacity
      ? ` [${capacity}]`
      : '';

    await logActivity({
      householdId,
      userId: req.user!.id,
      userName: req.user!.name,
      userEmail: req.user!.email,
      action: 'DODANO_PRODUKT',
      entityType: 'PANTRY_ITEM',
      entityName: newItem.name,
      details: {
        message:
          `Dodano ${newItem.quantity} szt.` +
          `${capText}${expiryText}.`,
        item: {
          id: newItem.id,
          name: newItem.name,
          brand: newItem.brand,
          quantity: newItem.quantity,
          capacity: newItem.capacity,
          category: newItem.category,
          barcode: newItem.barcode,
          expiryDate: newItem.expiryDate,
        },
      },
    });

    res.status(201).json({
      item: newItem,
      message: 'Produkt został dodany do spiżarni.',
    });
  } catch (error) {
    console.error('Błąd dodawania produktu:', error);

    res.status(500).json({
      error: 'Błąd podczas dodawania produktu.',
    });
  }
};

export const updatePantryItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;

    const existing = await prisma.pantryItem.findFirst({
      where: {
        id,
        householdId,
      },
    });

    if (!existing) {
      res.status(404).json({
        error: 'Produkt nie został odnaleziony.',
      });
      return;
    }

    const {
      name,
      brand,
      category,
      quantity,
      capacity,
      expiryDate,
      openedDate,
      notes,
      imageUrl,
      status,
    } = req.body;

    const parsedQty =
      quantity !== undefined
        ? Math.max(
            0,
            parseInt(String(quantity), 10) || 0
          )
        : existing.quantity;

    const changes: string[] = [];

    if (name && name !== existing.name) {
      changes.push(
        `nazwę z "${existing.name}" na "${name}"`
      );
    }

    if (parsedQty !== existing.quantity) {
      changes.push(
        `ilość z ${existing.quantity} na ${parsedQty} szt.`
      );
    }

    if (
      capacity !== undefined &&
      capacity !== existing.capacity
    ) {
      changes.push(
        `pojemność/gramaturę na "${capacity || 'brak'}"`
      );
    }

    if (
      category &&
      category !== existing.category
    ) {
      changes.push(
        `kategorię z "${existing.category}" na "${category}"`
      );
    }

    if (expiryDate !== undefined) {
      const oldExp = existing.expiryDate
        ? existing.expiryDate
            .toISOString()
            .split('T')[0]
        : 'brak';

      const newExp = expiryDate
        ? new Date(expiryDate)
            .toISOString()
            .split('T')[0]
        : 'brak';

      if (oldExp !== newExp) {
        changes.push(
          `datę ważności z ${oldExp} na ${newExp}`
        );
      }
    }

    if (openedDate !== undefined) {
      const oldOp = existing.openedDate
        ? existing.openedDate
            .toISOString()
            .split('T')[0]
        : 'brak';

      const newOp = openedDate
        ? new Date(openedDate)
            .toISOString()
            .split('T')[0]
        : 'brak';

      if (oldOp !== newOp) {
        changes.push(
          `datę otwarcia z ${oldOp} na ${newOp}`
        );
      }
    }

    if (
      status &&
      status !== existing.status
    ) {
      changes.push(
        `status z ${existing.status} na ${status}`
      );
    }

    const updated = await prisma.pantryItem.update({
      where: {
        id,
      },
      data: {
        name: name
          ? name.trim()
          : existing.name,

        brand:
          brand !== undefined
            ? brand?.trim() || null
            : existing.brand,

        category:
          category !== undefined
            ? category.trim()
            : existing.category,

        quantity: parsedQty,

        capacity:
          capacity !== undefined
            ? capacity?.trim() || null
            : existing.capacity,

        expiryDate:
          expiryDate !== undefined
            ? expiryDate
              ? new Date(expiryDate)
              : null
            : existing.expiryDate,

        openedDate:
          openedDate !== undefined
            ? openedDate
              ? new Date(openedDate)
              : null
            : existing.openedDate,

        notes:
          notes !== undefined
            ? notes?.trim() || null
            : existing.notes,

        imageUrl:
          imageUrl !== undefined
            ? imageUrl
            : existing.imageUrl,

        status:
          status ||
          (parsedQty <= 0
            ? 'CONSUMED'
            : existing.status),
      },
    });

    if (changes.length > 0) {
      await logActivity({
        householdId,
        userId: req.user!.id,
        userName: req.user!.name,
        userEmail: req.user!.email,
        action: 'ZMIENIONO_WARTOSCI',
        entityType: 'PANTRY_ITEM',
        entityName: updated.name,
        details: {
          message:
            `Zaktualizowano ${changes.join(', ')}.`,
          previous: existing,
          current: updated,
        },
      });
    }

    res.json({
      item: updated,
      message: 'Produkt zaktualizowany.',
    });
  } catch (error) {
    console.error('Błąd edycji produktu:', error);

    res.status(500).json({
      error: 'Błąd podczas aktualizacji produktu.',
    });
  }
};

export const consumePantryItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId = req.user!.householdId!;

    const {
      amount = 1,
      isWasted = false,
    } = req.body;

    const existing = await prisma.pantryItem.findFirst({
      where: {
        id,
        householdId,
      },
    });

    if (!existing) {
      res.status(404).json({
        error: 'Produkt nie został odnaleziony.',
      });
      return;
    }

    const consumeAmount = Math.min(
      existing.quantity,
      Math.max(
        1,
        parseInt(String(amount), 10) || 1
      )
    );

    const remaining =
      existing.quantity - consumeAmount;

    let updated;

    if (remaining <= 0) {
      updated = await prisma.pantryItem.update({
        where: {
          id,
        },
        data: {
          quantity: 0,
          status: isWasted
            ? 'WASTED'
            : 'CONSUMED',
        },
      });

      await logActivity({
        householdId,
        userId: req.user!.id,
        userName: req.user!.name,
        userEmail: req.user!.email,
        action: isWasted
          ? 'WYRZUCONO_PRODUKT'
          : 'ZUŻYTO_PRODUKT',
        entityType: 'PANTRY_ITEM',
        entityName: existing.name,
        details: isWasted
          ? `Wyrzucono cały produkt "${existing.name}" (${consumeAmount} szt.).`
          : `Zużyto cały produkt "${existing.name}" (${consumeAmount} szt.).`,
      });
    } else {
      updated = await prisma.pantryItem.update({
        where: {
          id,
        },
        data: {
          quantity: remaining,
        },
      });

      await logActivity({
        householdId,
        userId: req.user!.id,
        userName: req.user!.name,
        userEmail: req.user!.email,
        action: 'ZMNIEJSZONO_ILOSC',
        entityType: 'PANTRY_ITEM',
        entityName: existing.name,
        details:
          `Zużyto ${consumeAmount} szt. ` +
          `Pozostało ${remaining} szt.`,
      });
    }

    res.json({
      item: updated,
      consumedAmount: consumeAmount,
      remainingAmount: Math.max(
        0,
        remaining
      ),
      message:
        remaining <= 0
          ? 'Produkt całkowicie zużyty.'
          : `Zmniejszono ilość o ${consumeAmount} szt.`,
    });
  } catch (error) {
    console.error(
      'Błąd zużywania produktu:',
      error
    );

    res.status(500).json({
      error:
        'Błąd podczas usuwania/zużywania produktu.',
    });
  }
};

export const barcodeQuickRemove = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const householdId =
      req.user!.householdId!;

    const {
      barcode,
      amount = 1,
      itemId,
      isWasted = false,
    } = req.body;

    if (!barcode && !itemId) {
      res.status(400).json({
        error:
          'Wymagany kod kreskowy lub identyfikator produktu.',
      });
      return;
    }

    if (itemId) {
      const item =
        await prisma.pantryItem.findFirst({
          where: {
            id: itemId,
            householdId,
            status: 'ACTIVE',
          },
        });

      if (!item) {
        res.status(404).json({
          error:
            'Produkt nie został odnaleziony w spiżarni.',
        });
        return;
      }

      const consumeQty = Math.min(
        item.quantity,
        Math.max(
          1,
          parseInt(String(amount), 10) || 1
        )
      );

      const remaining =
        item.quantity - consumeQty;

      const updated =
        await prisma.pantryItem.update({
          where: {
            id: itemId,
          },
          data: {
            quantity: Math.max(
              0,
              remaining
            ),
            status:
              remaining <= 0
                ? isWasted
                  ? 'WASTED'
                  : 'CONSUMED'
                : 'ACTIVE',
          },
        });

      await logActivity({
        householdId,
        userId: req.user!.id,
        userName: req.user!.name,
        userEmail: req.user!.email,
        action:
          remaining <= 0
            ? isWasted
              ? 'WYRZUCONO_PRODUKT'
              : 'ZUŻYTO_PRODUKT'
            : 'ZMNIEJSZONO_ILOSC',
        entityType: 'PANTRY_ITEM',
        entityName: item.name,
        details:
          `Szybkie usunięcie przez skaner EAN: ` +
          `zużyto ${consumeQty} szt. ` +
          `Pozostało ${Math.max(0, remaining)} szt.`,
      });

      res.json({
        success: true,
        item: updated,
        consumed: consumeQty,
        remaining: Math.max(
          0,
          remaining
        ),
        message:
          `Usunięto ${consumeQty} szt. ` +
          `(${item.name}).`,
      });

      return;
    }

    const cleanBarcode =
      String(barcode).trim();

    const matchingItems =
      await prisma.pantryItem.findMany({
        where: {
          householdId,
          barcode: cleanBarcode,
          status: 'ACTIVE',
        },
        orderBy: [
          {
            expiryDate: 'asc',
          },
          {
            createdAt: 'asc',
          },
        ],
      });

    if (matchingItems.length === 0) {
      res.status(404).json({
        error:
          'Nie znaleziono aktywnych produktów o tym kodzie kreskowym w spiżarni.',
        barcode: cleanBarcode,
      });
      return;
    }

    const requestedAmount = Math.max(
      1,
      parseInt(String(amount), 10) || 1
    );

    let remainingToConsume =
      requestedAmount;

    const affectedItems: Array<{
      id: string;
      name: string;
      consumed: number;
      remaining: number;
    }> = [];

    for (const item of matchingItems) {
      if (remainingToConsume <= 0) {
        break;
      }

      const take = Math.min(
        item.quantity,
        remainingToConsume
      );

      const newQty =
        item.quantity - take;

      remainingToConsume -= take;

      await prisma.pantryItem.update({
        where: {
          id: item.id,
        },
        data: {
          quantity: Math.max(
            0,
            newQty
          ),
          status:
            newQty <= 0
              ? isWasted
                ? 'WASTED'
                : 'CONSUMED'
              : 'ACTIVE',
        },
      });

      affectedItems.push({
        id: item.id,
        name: item.name,
        consumed: take,
        remaining: Math.max(
          0,
          newQty
        ),
      });

      await logActivity({
        householdId,
        userId: req.user!.id,
        userName: req.user!.name,
        userEmail: req.user!.email,
        action:
          newQty <= 0
            ? isWasted
              ? 'WYRZUCONO_PRODUKT'
              : 'ZUŻYTO_PRODUKT'
            : 'ZMNIEJSZONO_ILOSC',
        entityType: 'PANTRY_ITEM',
        entityName: item.name,
        details:
          `Szybkie skanowanie EAN: ` +
          `zużyto ${take} szt. ` +
          `Pozostało: ${Math.max(0, newQty)} szt.`,
      });
    }

    const consumedTotal =
      requestedAmount -
      remainingToConsume;

    res.json({
      success: true,
      affectedItems,
      consumed: consumedTotal,
      remainingRequested:
        remainingToConsume,
      message:
        `Usunięto łącznie ${consumedTotal} szt. ` +
        `produktu "${matchingItems[0].name}".`,
    });
  } catch (error) {
    console.error(
      'Błąd szybkiego usuwania kodem kreskowym:',
      error
    );

    res.status(500).json({
      error:
        'Błąd podczas szybkiego usuwania.',
    });
  }
};

export const deletePantryItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const householdId =
      req.user!.householdId!;

    const existing =
      await prisma.pantryItem.findFirst({
        where: {
          id,
          householdId,
        },
      });

    if (!existing) {
      res.status(404).json({
        error:
          'Produkt nie został odnaleziony.',
      });
      return;
    }

    await prisma.pantryItem.delete({
      where: {
        id,
      },
    });

    await logActivity({
      householdId,
      userId: req.user!.id,
      userName: req.user!.name,
      userEmail: req.user!.email,
      action: 'USUNIĘTO_PRODUKT',
      entityType: 'PANTRY_ITEM',
      entityName: existing.name,
      details:
        `Całkowicie usunięto produkt ` +
        `"${existing.name}" ` +
        `(${existing.quantity} szt.) ze spiżarni.`,
    });

    res.json({
      message:
        'Produkt został usunięty ze spiżarni.',
    });
  } catch (error) {
    console.error(
      'Błąd usuwania produktu:',
      error
    );

    res.status(500).json({
      error:
        'Błąd podczas usuwania produktu.',
    });
  }
};

export const getPantryStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const householdId =
      req.user!.householdId!;

    const activeItems =
      await prisma.pantryItem.findMany({
        where: {
          householdId,
          status: 'ACTIVE',
        },
      });

    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const warningDays = await getExpiryWarningDays(householdId);
    const warningUntil = addDays(today, warningDays);

    const in7Days = new Date(today);
    in7Days.setDate(
      in7Days.getDate() + 7
    );

    let expiredCount = 0;
    let expiring3DaysCount = 0;
    let expiring7DaysCount = 0;
    let openedCount = 0;

    const categoryCounts: Record<
      string,
      number
    > = {};

    for (const item of activeItems) {
      categoryCounts[item.category] =
        (categoryCounts[item.category] || 0) +
        1;

      if (item.openedDate) {
        openedCount++;
      }

      if (item.expiryDate) {
        const exp = new Date(
          item.expiryDate
        );

        if (exp < today) {
          expiredCount++;
        } else if (exp <= warningUntil) {
          expiring3DaysCount++;
        } else if (exp <= in7Days) {
          expiring7DaysCount++;
        }
      }
    }

    res.json({
      totalActive: activeItems.length,
      expiredCount,
      expiring3DaysCount,
      expiring7DaysCount,
      expiryWarningDays: warningDays,
      openedCount,
      categoryCounts,
    });
  } catch (error) {
    console.error(
      'Błąd obliczania statystyk:',
      error
    );

    res.status(500).json({
      error:
        'Błąd podczas obliczania statystyk.',
    });
  }
};