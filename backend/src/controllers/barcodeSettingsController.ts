import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import {
  BarcodeProviderKey,
  BarcodeSourceConfig,
  DEFAULT_BARCODE_SOURCES,
  getSourceKey,
} from '../services/barcode/types.js';

const ALLOWED_PROVIDERS: BarcodeProviderKey[] = [
  'OPEN_FOOD_FACTS',
  'OPEN_BEAUTY_FACTS',
  'OPEN_PRODUCTS_FACTS',
  'OPEN_PET_FOOD_FACTS',
];

const normalizeSource = (
  source: Partial<BarcodeSourceConfig>,
  index: number
): BarcodeSourceConfig | null => {
  if (!source.provider || !ALLOWED_PROVIDERS.includes(source.provider)) {
    return null;
  }

  const countryCode =
    source.provider === 'OPEN_FOOD_FACTS'
      ? String(source.countryCode || 'world').trim().toLowerCase()
      : 'world';

  if (!/^[a-z]{2}$|^world$/.test(countryCode)) {
    return null;
  }

  return {
    provider: source.provider,
    countryCode,
    enabled: source.enabled !== false,
    priority: index + 1,
  };
};

export const getBarcodeSources = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const householdId = req.user?.householdId;

    if (!householdId) {
      res.status(400).json({ error: 'User does not belong to a household.' });
      return;
    }

    const sources = await prisma.barcodeSourceSetting.findMany({
      where: { householdId },
      orderBy: { priority: 'asc' },
    });

    if (sources.length === 0) {
      res.json({
        sources: DEFAULT_BARCODE_SOURCES,
        usingDefaults: true,
      });
      return;
    }

    res.json({
      sources,
      usingDefaults: false,
    });
  } catch (error) {
    console.error('Error fetching EAN sources:', error);
    res.status(500).json({ error: 'Failed to fetch EAN sources.' });
  }
};

export const updateBarcodeSources = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const householdId = req.user?.householdId;

    if (!householdId) {
      res.status(400).json({ error: 'User does not belong to a household.' });
      return;
    }

    const incomingSources = Array.isArray(req.body?.sources)
      ? req.body.sources
      : null;

    if (!incomingSources) {
      res.status(400).json({ error: 'The "sources" field must be an array.' });
      return;
    }

    const normalized: BarcodeSourceConfig[] = incomingSources
      .map((source: Partial<BarcodeSourceConfig>, index: number) =>
        normalizeSource(source, index)
      )
      .filter((source: BarcodeSourceConfig | null): source is BarcodeSourceConfig =>
        source !== null
      );

    if (normalized.length !== incomingSources.length) {
      res.status(400).json({ error: 'One or more EAN sources have an invalid configuration.' });
      return;
    }

    const duplicateKeys = new Set<string>();
    for (const source of normalized) {
      const key = `${source.provider}:${source.countryCode}`;
      if (duplicateKeys.has(key)) {
        res.status(400).json({ error: `Source ${key} appears more than once.` });
        return;
      }
      duplicateKeys.add(key);
    }

    await prisma.$transaction(async (tx) => {
      await tx.barcodeSourceSetting.deleteMany({
        where: { householdId },
      });

      await tx.barcodeSourceSetting.createMany({
        data: normalized.map((source) => ({
          householdId,
          sourceKey: getSourceKey(source),
          provider: source.provider,
          countryCode: source.countryCode,
          enabled: source.enabled,
          priority: source.priority,
        })),
      });
    });

    const sources = await prisma.barcodeSourceSetting.findMany({
      where: { householdId },
      orderBy: { priority: 'asc' },
    });

    res.json({
      sources,
      message: 'EAN source configuration saved.',
    });
  } catch (error) {
    console.error('Error saving EAN sources:', error);
    res.status(500).json({ error: 'Failed to save EAN sources.' });
  }
};

export const resetBarcodeSources = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const householdId = req.user?.householdId;

    if (!householdId) {
      res.status(400).json({ error: 'User does not belong to a household.' });
      return;
    }

    await prisma.barcodeSourceSetting.deleteMany({
      where: { householdId },
    });

    res.json({
      sources: DEFAULT_BARCODE_SOURCES,
      usingDefaults: true,
      message: 'Default EAN sources restored.',
    });
  } catch (error) {
    console.error('Error resetting EAN sources:', error);
    res.status(500).json({ error: 'Failed to restore default EAN sources.' });
  }
};
