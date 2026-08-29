export type BarcodeProviderKey =
  | 'OPEN_FOOD_FACTS'
  | 'OPEN_BEAUTY_FACTS'
  | 'OPEN_PRODUCTS_FACTS'
  | 'OPEN_PET_FOOD_FACTS';

export interface BarcodeSourceConfig {
  id?: string;
  provider: BarcodeProviderKey;
  countryCode: string;
  enabled: boolean;
  priority: number;
}

export interface StandardProductInfo {
  barcode: string;
  name: string;
  brand?: string;
  category: string;
  capacity?: string;
  imageUrl?: string;
  nutriScore?: string;
  source: string;
}

export interface BarcodeProvider {
  lookup(barcode: string, source: BarcodeSourceConfig): Promise<StandardProductInfo | null>;
}

export const DEFAULT_BARCODE_SOURCES: BarcodeSourceConfig[] = [
  {
    provider: 'OPEN_FOOD_FACTS',
    countryCode: 'pl',
    enabled: true,
    priority: 1,
  },
  {
    provider: 'OPEN_FOOD_FACTS',
    countryCode: 'world',
    enabled: true,
    priority: 2,
  },
];

export const getSourceKey = (source: Pick<BarcodeSourceConfig, 'provider' | 'countryCode'>): string =>
  `${source.provider}:${source.countryCode.toLowerCase()}`;
