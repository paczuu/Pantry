import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { lookupProductByBarcode } from '../services/barcode/lookupProductByBarcode.js';

export const getProductByBarcode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { barcode } = req.params;

    if (!barcode) {
      res.status(400).json({ error: 'Provide a barcode.' });
      return;
    }

    const cleanBarcode = barcode.trim();

    const product = await lookupProductByBarcode(
      cleanBarcode,
      req.user?.householdId ?? undefined
    );

    let inPantryItems: any[] = [];

    if (req.user?.householdId) {
      inPantryItems = await prisma.pantryItem.findMany({
        where: {
          householdId: req.user.householdId,
          barcode: cleanBarcode,
          status: 'ACTIVE',
        },
        orderBy: {
          expiryDate: 'asc',
        },
      });
    }

    const totalInPantry = inPantryItems.reduce(
      (acc, item) => acc + item.quantity,
      0
    );

    if (!product) {
      res.json({
        found: false,
        barcode: cleanBarcode,
        inPantryItems,
        totalInPantry,
      });
      return;
    }

    res.json({
      found: true,
      barcode: cleanBarcode,
      product,
      inPantryItems,
      totalInPantry,
    });
  } catch (error) {
    console.error('Barcode EAN lookup error:', error);

    res
      .status(500)
      .json({
        error: 'Failed to look up barcode.',
      });
  }
};

export const searchCatalog = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const query = ((req.query.q as string) || '').trim();

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
      orderBy: [
        {
          updatedAt: 'desc',
        },
      ],
      take: 100,
    });

    // The same EAN may be cached from multiple sources.
    // In the catalog we show one record per EAN.
    // CUSTOM takes precedence over cache from external providers.
    const deduplicated = new Map<string, (typeof products)[number]>();

    for (const product of products) {
      const current = deduplicated.get(product.barcode);

      if (!current || product.source === 'CUSTOM') {
        deduplicated.set(product.barcode, product);
      }

      if (deduplicated.size >= 20) {
        break;
      }
    }

    res.json({
      products: Array.from(deduplicated.values()).slice(0, 20),
    });
  } catch (error) {
    console.error('Error searching the catalog:', error);

    res
      .status(500)
      .json({
        error: 'Error searching the catalog.',
      });
  }
};

export const saveCustomProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      barcode,
      name,
      brand,
      category,
      capacity,
      imageUrl,
      nutriScore,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        error: 'Product name is required.',
      });
      return;
    }

    if (barcode && barcode.trim()) {
      const cleanBarcode = barcode.trim();
      const catalogData = {
        name: name.trim(),
        brand: brand?.trim() || null,
        category: category || 'Other',
        capacity: capacity?.trim() || null,
        imageUrl: imageUrl || null,
        nutriScore: nutriScore || null,
      };

      const existing = await prisma.productCatalog.findFirst({
        where: {
          barcode: cleanBarcode,
          source: 'CUSTOM',
        },
      });

      const product = existing
        ? await prisma.productCatalog.update({
            where: { id: existing.id },
            data: catalogData,
          })
        : await prisma.productCatalog.create({
            data: {
              barcode: cleanBarcode,
              source: 'CUSTOM',
              ...catalogData,
            },
          });

      res.json({
        product,
      });

      return;
    }

    res.json({
      message:
        'Product without a barcode does not require entry in the EAN catalog.',
    });
  } catch (error) {
    console.error(
      'Error saving the custom product:',
      error
    );

    res
      .status(500)
      .json({
        error: 'Error saving the custom product.',
      });
  }
};