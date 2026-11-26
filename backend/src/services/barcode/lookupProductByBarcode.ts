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
  category: product.category || 'Other',
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

  // 1. A manually added product always has the highest priority.
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

  // 2. Active sources of the household, in priority order.
  const sources = await getHouseholdSources(householdId);
  const sourceKeys = sources.map(getSourceKey);

  // 3. One query for the cache of every source; the highest-priority cached source wins.
  const cached = await prisma.productCatalog.findMany({
    where: { barcode: cleanBarcode, source: { in: sourceKeys } },
  });

  for (const key of sourceKeys) {
    const hit = cached.find((product) => product.source === key);
    if (hit) return toStandardProduct(hit);
  }

  // 4. Ask all external providers at once (so a miss costs one round trip, not one per source),
  //    then take the answer of the highest-priority source that knows the product.
  const lookups = sources.map((source) =>
    openFactsProvider.lookup(cleanBarcode, source).catch(() => null)
  );

  for (let index = 0; index < lookups.length; index++) {
    const product = await lookups[index];
    if (!product) continue;

    try {
      await cacheExternalProduct(product);
    } catch (error) {
      console.warn(
        `Error caching for ${sourceKeys[index]} / ${cleanBarcode}:`,
        error instanceof Error ? error.message : error
      );
    }

    return product;
  }

  return null;
};
