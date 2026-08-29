import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import {
  BarcodeProviderKey,
  BarcodeSourceConfig,
  DEFAULT_BARCODE_SOURCES,
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
      res.status(400).json({ error: 'Użytkownik nie należy do gospodarstwa.' });
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
    console.error('Błąd pobierania źródeł EAN:', error);
    res.status(500).json({ error: 'Nie udało się pobrać źródeł EAN.' });
  }
};

export const updateBarcodeSources = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const householdId = req.user?.householdId;

    if (!householdId) {
      res.status(400).json({ error: 'Użytkownik nie należy do gospodarstwa.' });
      return;
    }

    const incomingSources = Array.isArray(req.body?.sources)
      ? req.body.sources
      : null;

    if (!incomingSources) {
      res.status(400).json({ error: 'Pole "sources" musi być tablicą.' });
      return;
    }

    const normalized = incomingSources
      .map((source: Partial<BarcodeSourceConfig>, index: number) =>
        normalizeSource(source, index)
      )
      .filter((source: BarcodeSourceConfig | null): source is BarcodeSourceConfig =>
        source !== null
      );

    if (normalized.length !== incomingSources.length) {
      res.status(400).json({ error: 'Jedno lub więcej źródeł EAN ma nieprawidłową konfigurację.' });
      return;
    }

    const duplicateKeys = new Set<string>();
    for (const source of normalized) {
      const key = `${source.provider}:${source.countryCode}`;
      if (duplicateKeys.has(key)) {
        res.status(400).json({ error: `Źródło ${key} występuje więcej niż raz.` });
        return;
      }
      duplicateKeys.add(key);
    }

    await prisma.$transaction(async (tx) => {
      await tx.barcodeSourceSetting.deleteMany({
        where: { householdId },
      });

      for (const source of normalized) {
        await tx.barcodeSourceSetting.create({
          data: {
            householdId,
            provider: source.provider,
            countryCode: source.countryCode,
            enabled: source.enabled,
            priority: source.priority,
          },
        });
      }
    });

    const sources = await prisma.barcodeSourceSetting.findMany({
      where: { householdId },
      orderBy: { priority: 'asc' },
    });

    res.json({
      sources,
      message: 'Zapisano konfigurację źródeł EAN.',
    });
  } catch (error) {
    console.error('Błąd zapisywania źródeł EAN:', error);
    res.status(500).json({ error: 'Nie udało się zapisać źródeł EAN.' });
  }
};

export const resetBarcodeSources = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const householdId = req.user?.householdId;

    if (!householdId) {
      res.status(400).json({ error: 'Użytkownik nie należy do gospodarstwa.' });
      return;
    }

    await prisma.barcodeSourceSetting.deleteMany({
      where: { householdId },
    });

    res.json({
      sources: DEFAULT_BARCODE_SOURCES,
      usingDefaults: true,
      message: 'Przywrócono domyślne źródła EAN.',
    });
  } catch (error) {
    console.error('Błąd resetowania źródeł EAN:', error);
    res.status(500).json({ error: 'Nie udało się przywrócić domyślnych źródeł EAN.' });
  }
};
