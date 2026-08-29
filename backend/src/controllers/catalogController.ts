import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { lookupProductByBarcode } from '../services/openFoodFacts.js';

export const getProductByBarcode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { barcode } = req.params;
    if (!barcode) {
      res.status(400).json({ error: 'Podaj kod kreskowy.' });
      return;
    }

    const product = await lookupProductByBarcode(barcode);

    let inPantryItems: any[] = [];
    if (req.user?.householdId) {
      inPantryItems = await prisma.pantryItem.findMany({
        where: {
          householdId: req.user.householdId,
          barcode: barcode.trim(),
          status: 'ACTIVE',
        },
        orderBy: { expiryDate: 'asc' },
      });
    }

    if (!product) {
      res.json({
        found: false,
        barcode: barcode.trim(),
        inPantryItems,
        totalInPantry: inPantryItems.reduce((acc, item) => acc + item.quantity, 0),
      });
      return;
    }

    res.json({
      found: true,
      product,
      inPantryItems,
      totalInPantry: inPantryItems.reduce((acc, item) => acc + item.quantity, 0),
    });
  } catch (error) {
    console.error('Błąd wyszukiwania kodu EAN:', error);
    res.status(500).json({ error: 'Błąd podczas wyszukiwania kodu kreskowego.' });
  }
};

export const searchCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query) {
      res.json({ products: [] });
      return;
    }

    const products = await prisma.productCatalog.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { brand: { contains: query } },
          { barcode: { contains: query } },
          { category: { contains: query } },
          { capacity: { contains: query } },
        ],
      },
      take: 20,
    });

    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas wyszukiwania w katalogu.' });
  }
};

export const saveCustomProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { barcode, name, brand, category, capacity, imageUrl } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Nazwa produktu jest wymagana.' });
      return;
    }

    if (barcode && barcode.trim()) {
      const existing = await prisma.productCatalog.upsert({
        where: { barcode: barcode.trim() },
        update: {
          name: name.trim(),
          brand: brand?.trim() || null,
          category: category || 'Inne',
          capacity: capacity?.trim() || null,
          imageUrl: imageUrl || null,
        },
        create: {
          barcode: barcode.trim(),
          name: name.trim(),
          brand: brand?.trim() || null,
          category: category || 'Inne',
          capacity: capacity?.trim() || null,
          imageUrl: imageUrl || null,
          source: 'CUSTOM',
        },
      });

      res.json({ product: existing });
      return;
    }

    res.json({ message: 'Produkt bez kodu kreskowego nie wymaga wpisu w katalogu EAN.' });
  } catch (error) {
    res.status(500).json({ error: 'Błąd podczas zapisywania produktu w katalogu.' });
  }
};
