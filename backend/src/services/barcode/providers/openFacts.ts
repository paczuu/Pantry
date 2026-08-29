import axios from 'axios';
import {
  BarcodeProvider,
  BarcodeProviderKey,
  BarcodeSourceConfig,
  StandardProductInfo,
  getSourceKey,
} from '../types.js';

const USER_AGENT =
  process.env.BARCODE_USER_AGENT ||
  'SmartPantryPWA/1.0 (https://github.com/smart-pantry; contact@smartpantry.local)';

const PROVIDER_DOMAINS: Record<Exclude<BarcodeProviderKey, 'OPEN_FOOD_FACTS'>, string> = {
  OPEN_BEAUTY_FACTS: 'world.openbeautyfacts.org',
  OPEN_PRODUCTS_FACTS: 'world.openproductsfacts.org',
  OPEN_PET_FOOD_FACTS: 'world.openpetfoodfacts.org',
};

const getDomain = (source: BarcodeSourceConfig): string => {
  if (source.provider === 'OPEN_FOOD_FACTS') {
    const country = source.countryCode.trim().toLowerCase() || 'world';
    return `${country}.openfoodfacts.org`;
  }

  return PROVIDER_DOMAINS[source.provider];
};

const mapCategoryFromTags = (tags: string[] = [], categoriesString = ''): string => {
  const combined = `${tags.join(' ')} ${categoriesString}`.toLowerCase();

  if (
    combined.includes('dairy') ||
    combined.includes('milk') ||
    combined.includes('cheese') ||
    combined.includes('yogurt') ||
    combined.includes('nabiał') ||
    combined.includes('mleko') ||
    combined.includes('ser') ||
    combined.includes('jogurt') ||
    combined.includes('śmietana') ||
    combined.includes('masło')
  ) {
    return 'Nabiał';
  }

  if (
    combined.includes('meat') ||
    combined.includes('fish') ||
    combined.includes('poultry') ||
    combined.includes('ham') ||
    combined.includes('mięso') ||
    combined.includes('ryb') ||
    combined.includes('wędlin') ||
    combined.includes('kurczak') ||
    combined.includes('szynka') ||
    combined.includes('kiełbasa')
  ) {
    return 'Mięso i Ryby';
  }

  if (
    combined.includes('fruit') ||
    combined.includes('vegetable') ||
    combined.includes('salad') ||
    combined.includes('owoc') ||
    combined.includes('warzyw') ||
    combined.includes('pomidor') ||
    combined.includes('jabłko') ||
    combined.includes('ziemniak')
  ) {
    return 'Warzywa i Owoce';
  }

  if (
    combined.includes('beverage') ||
    combined.includes('drink') ||
    combined.includes('juice') ||
    combined.includes('water') ||
    combined.includes('tea') ||
    combined.includes('coffee') ||
    combined.includes('napój') ||
    combined.includes('sok') ||
    combined.includes('woda') ||
    combined.includes('herbata') ||
    combined.includes('kawa') ||
    combined.includes('piwo')
  ) {
    return 'Napoje';
  }

  if (
    combined.includes('pasta') ||
    combined.includes('rice') ||
    combined.includes('cereal') ||
    combined.includes('flour') ||
    combined.includes('makaron') ||
    combined.includes('ryż') ||
    combined.includes('kasza') ||
    combined.includes('mąka') ||
    combined.includes('płatki') ||
    combined.includes('strączkowe')
  ) {
    return 'Makarony i Sypkie';
  }

  if (
    combined.includes('spice') ||
    combined.includes('sauce') ||
    combined.includes('condiment') ||
    combined.includes('oil') ||
    combined.includes('przypraw') ||
    combined.includes('sos') ||
    combined.includes('olej') ||
    combined.includes('oliwa') ||
    combined.includes('ketchup') ||
    combined.includes('musztarda') ||
    combined.includes('majonez')
  ) {
    return 'Przyprawy i Sosy';
  }

  if (
    combined.includes('snack') ||
    combined.includes('sweet') ||
    combined.includes('biscuit') ||
    combined.includes('chocolate') ||
    combined.includes('chips') ||
    combined.includes('przekąsk') ||
    combined.includes('słodycz') ||
    combined.includes('ciastk') ||
    combined.includes('czekolad') ||
    combined.includes('chipsy')
  ) {
    return 'Przekąski';
  }

  if (
    combined.includes('frozen') ||
    combined.includes('ice cream') ||
    combined.includes('mrożon') ||
    combined.includes('lody')
  ) {
    return 'Mrożonki';
  }

  if (
    combined.includes('bread') ||
    combined.includes('bakery') ||
    combined.includes('pieczywo') ||
    combined.includes('chleb') ||
    combined.includes('bułk')
  ) {
    return 'Pieczywo';
  }

  if (
    combined.includes('canned') ||
    combined.includes('preserve') ||
    combined.includes('konserw') ||
    combined.includes('przetwor') ||
    combined.includes('dżem')
  ) {
    return 'Przetwory i Konserwy';
  }

  return 'Inne';
};

const getFallbackCategory = (provider: BarcodeProviderKey): string => {
  switch (provider) {
    case 'OPEN_BEAUTY_FACTS':
      return 'Kosmetyki';
    case 'OPEN_PET_FOOD_FACTS':
      return 'Karma dla zwierząt';
    case 'OPEN_PRODUCTS_FACTS':
      return 'Inne';
    default:
      return 'Inne';
  }
};

export class OpenFactsProvider implements BarcodeProvider {
  async lookup(
    barcode: string,
    source: BarcodeSourceConfig
  ): Promise<StandardProductInfo | null> {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return null;

    const domain = getDomain(source);
    const url = `https://${domain}/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
        timeout: 4500,
        maxRedirects: 3,
      });

      if (response.data?.status !== 1 || !response.data?.product) {
        return null;
      }

      const prod = response.data.product;
      const name =
        prod.product_name_pl ||
        prod.product_name ||
        prod.generic_name_pl ||
        prod.generic_name ||
        prod.brands ||
        'Produkt';

      const mappedCategory = mapCategoryFromTags(
        prod.categories_tags || [],
        prod.categories || ''
      );

      return {
        barcode: cleanBarcode,
        name: String(name).trim(),
        brand: prod.brands ? String(prod.brands).trim() : undefined,
        category:
          mappedCategory !== 'Inne'
            ? mappedCategory
            : getFallbackCategory(source.provider),
        capacity: prod.quantity ? String(prod.quantity).trim() : undefined,
        imageUrl:
          prod.image_front_small_url ||
          prod.image_url ||
          prod.image_front_url ||
          undefined,
        nutriScore:
          source.provider === 'OPEN_FOOD_FACTS' && prod.nutriscore_grade
            ? String(prod.nutriscore_grade).toUpperCase()
            : undefined,
        source: getSourceKey(source),
      };
    } catch (error) {
      console.warn(
        `Błąd providera ${getSourceKey(source)} dla EAN ${cleanBarcode}:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }
}

export const openFactsProvider = new OpenFactsProvider();
