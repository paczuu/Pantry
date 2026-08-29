import axios from 'axios';
import { prisma } from '../config/prisma.js';

export interface StandardProductInfo {
  barcode: string;
  name: string;
  brand?: string;
  category: string;
  capacity?: string; // np. "500g", "1L", "250ml"
  imageUrl?: string;
  nutriScore?: string;
  source: 'LOCAL' | 'OFF' | 'CUSTOM' | 'NOT_FOUND';
}

const mapCategoryFromTags = (tags: string[] = [], categoriesString = ''): string => {
  const combined = (tags.join(' ') + ' ' + categoriesString).toLowerCase();

  if (combined.includes('dairy') || combined.includes('milk') || combined.includes('cheese') || combined.includes('yogurt') || combined.includes('nabiał') || combined.includes('mleko') || combined.includes('ser') || combined.includes('jogurt') || combined.includes('śmietana') || combined.includes('masło')) {
    return 'Nabiał';
  }
  if (combined.includes('meat') || combined.includes('fish') || combined.includes('poultry') || combined.includes('ham') || combined.includes('mięso') || combined.includes('ryb') || combined.includes('wędlin') || combined.includes('kurczak') || combined.includes('szynka') || combined.includes('kiełbasa')) {
    return 'Mięso i Ryby';
  }
  if (combined.includes('fruit') || combined.includes('vegetable') || combined.includes('salad') || combined.includes('owoc') || combined.includes('warzyw') || combined.includes('pomidor') || combined.includes('jabłko') || combined.includes('ziemniak')) {
    return 'Warzywa i Owoce';
  }
  if (combined.includes('beverage') || combined.includes('drink') || combined.includes('juice') || combined.includes('water') || combined.includes('tea') || combined.includes('coffee') || combined.includes('napój') || combined.includes('sok') || combined.includes('woda') || combined.includes('herbata') || combined.includes('kawa') || combined.includes('piwo')) {
    return 'Napoje';
  }
  if (combined.includes('pasta') || combined.includes('rice') || combined.includes('cereal') || combined.includes('flour') || combined.includes('makaron') || combined.includes('ryż') || combined.includes('kasza') || combined.includes('mąka') || combined.includes('płatki') || combined.includes('strączkowe')) {
    return 'Makarony i Sypkie';
  }
  if (combined.includes('spice') || combined.includes('sauce') || combined.includes('condiment') || combined.includes('oil') || combined.includes('przypraw') || combined.includes('sos') || combined.includes('olej') || combined.includes('oliwa') || combined.includes('ketchup') || combined.includes('musztarda') || combined.includes('majonez')) {
    return 'Przyprawy i Sosy';
  }
  if (combined.includes('snack') || combined.includes('sweet') || combined.includes('biscuit') || combined.includes('chocolate') || combined.includes('chips') || combined.includes('przekąsk') || combined.includes('słodycz') || combined.includes('ciastk') || combined.includes('czekolad') || combined.includes('chipsy')) {
    return 'Przekąski';
  }
  if (combined.includes('frozen') || combined.includes('ice cream') || combined.includes('mrożon') || combined.includes('lody')) {
    return 'Mrożonki';
  }
  if (combined.includes('bread') || combined.includes('bakery') || combined.includes('pieczywo') || combined.includes('chleb') || combined.includes('bułk')) {
    return 'Pieczywo';
  }
  if (combined.includes('canned') || combined.includes('preserve') || combined.includes('konserw') || combined.includes('przetwor') || combined.includes('dżem')) {
    return 'Przetwory i Konserwy';
  }

  return 'Inne';
};

export const lookupProductByBarcode = async (barcode: string): Promise<StandardProductInfo | null> => {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) return null;

  // 1. Sprawdź lokalny katalog SQLite
  const localProduct = await prisma.productCatalog.findUnique({
    where: { barcode: cleanBarcode },
  });

  if (localProduct) {
    return {
      barcode: localProduct.barcode,
      name: localProduct.name,
      brand: localProduct.brand || undefined,
      category: localProduct.category || 'Inne',
      capacity: localProduct.capacity || undefined,
      imageUrl: localProduct.imageUrl || undefined,
      nutriScore: localProduct.nutriScore || undefined,
      source: 'LOCAL',
    };
  }

  // 2. Pobierz z Open Food Facts (PL mirror, fallback to World)
  try {
    const userAgent = 'SmartPantryPWA/1.0 (https://github.com/smart-pantry; contact@smartpantry.local)';
    const endpoints = [
      `https://pl.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`,
      `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`,
    ];

    for (const url of endpoints) {
      try {
        const response = await axios.get(url, {
          headers: { 'User-Agent': userAgent },
          timeout: 4500,
        });

        if (response.data && response.data.status === 1 && response.data.product) {
          const prod = response.data.product;
          const name =
            prod.product_name_pl ||
            prod.product_name ||
            prod.generic_name_pl ||
            prod.generic_name ||
            prod.brands ||
            'Produkt';

          const brand = prod.brands || undefined;
          const category = mapCategoryFromTags(prod.categories_tags || [], prod.categories || '');
          const capacity = prod.quantity ? String(prod.quantity).trim() : undefined;
          const imageUrl = prod.image_front_small_url || prod.image_url || prod.image_front_url || undefined;
          const nutriScore = prod.nutriscore_grade ? prod.nutriscore_grade.toUpperCase() : undefined;

          // Zapisz do bazy lokalnej (Cache) dla błyskawicznych kolejnych zapytań
          try {
            await prisma.productCatalog.create({
              data: {
                barcode: cleanBarcode,
                name: name.trim(),
                brand: brand ? brand.trim() : null,
                category,
                capacity: capacity || null,
                imageUrl: imageUrl || null,
                nutriScore: nutriScore || null,
                source: 'OFF',
              },
            });
          } catch (e) {
            // ignoruj
          }

          return {
            barcode: cleanBarcode,
            name: name.trim(),
            brand: brand ? brand.trim() : undefined,
            category,
            capacity,
            imageUrl,
            nutriScore,
            source: 'OFF',
          };
        }
      } catch (err) {
        continue;
      }
    }
  } catch (error) {
    console.error('Błąd podczas zapytania do OpenFoodFacts:', error);
  }

  return null;
};
