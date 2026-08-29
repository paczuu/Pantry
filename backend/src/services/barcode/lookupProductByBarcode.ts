import { prisma } from '../../config/prisma.js';
import { openFactsProvider } from './providers/openFacts.js';
import {
  BarcodeSourceConfig,
  DEFAULT_BARCODE_SOURCES,
  StandardProductInfo,
  getSourceKey,
} from './types.js';

const toStandardProduct = (product: {
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  capacity: string | null;
  imageUrl: string | null;
  nutriScore: string | null;
  source: string;
}): StandardProductInfo => ({
  barcode: product.barcode,
  name: product.name,
  brand: product.brand || undefined,
  category: product.category || 'Inne',
  capacity: product.capacity || undefined,
  imageUrl: product.imageUrl || undefined,
  nutriScore: product.nutriScore || undefined,
  source: product.source,
});

const getHouseholdSources = async (
  householdId?: string
): Promise<BarcodeSourceConfig[]> => {
  if (!householdId) {
    return DEFAULT_BARCODE_SOURCES;
  }

  const stored = await prisma.barcodeSourceSetting.findMany({
    where: {
      householdId,
      enabled: true,
    },
    orderBy: {
      priority: 'asc',
    },
  });

  if (stored.length === 0) {
    return DEFAULT_BARCODE_SOURCES;
  }

  return stored.map((source) => ({
    id: source.id,
    provider: source.provider as BarcodeSourceConfig['provider'],
    countryCode: source.countryCode,
    enabled: source.enabled,
    priority: source.priority,
  }));
};

const cacheExternalProduct = async (
  product: StandardProductInfo
): Promise<void> => {
  await prisma.productCatalog.upsert({
    where: {
      barcode_source: {
        barcode: product.barcode,
        source: product.source,
      },
    },
    update: {
      name: product.name,
      brand: product.brand || null,
      category: product.category,
      capacity: product.capacity || null,
      imageUrl: product.imageUrl || null,
      nutriScore: product.nutriScore || null,
    },
    create: {
      barcode: product.barcode,
      source: product.source,
      name: product.name,
      brand: product.brand || null,
      category: product.category,
      capacity: product.capacity || null,
      imageUrl: product.imageUrl || null,
      nutriScore: product.nutriScore || null,
    },
  });
};

export const lookupProductByBarcode = async (
  barcode: string,
  householdId?: string
): Promise<StandardProductInfo | null> => {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) return null;

  // 1. Produkt dodany ręcznie zawsze ma najwyższy priorytet.
  const customProduct = await prisma.productCatalog.findUnique({
    where: {
      barcode_source: {
        barcode: cleanBarcode,
        source: 'CUSTOM',
      },
    },
  });

  if (customProduct) {
    return toStandardProduct(customProduct);
  }

  // 2. Pobierz aktywne źródła gospodarstwa w ustawionej kolejności.
  const sources = await getHouseholdSources(householdId);

  for (const source of sources) {
    const sourceKey = getSourceKey(source);

    // 3. Najpierw cache konkretnego źródła.
    const cachedProduct = await prisma.productCatalog.findUnique({
      where: {
        barcode_source: {
          barcode: cleanBarcode,
          source: sourceKey,
        },
      },
    });

    if (cachedProduct) {
      return toStandardProduct(cachedProduct);
    }

    // 4. Dopiero potem zewnętrzny provider.
    const product = await openFactsProvider.lookup(cleanBarcode, source);
    if (!product) continue;

    try {
      await cacheExternalProduct(product);
    } catch (error) {
      console.warn(
        `Nie udało się zapisać cache dla ${sourceKey} / ${cleanBarcode}:`,
        error instanceof Error ? error.message : error
      );
    }

    return product;
  }

  return null;
};
