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

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Dairy: [
    // EN
    'dairy', 'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'cottage',
    'curd', 'margarine', 'kefir', 'sour cream', 'whey', 'ghee', 'mozzarella',
    'cheddar', 'parmesan', 'brie', 'camembert', 'ricotta', 'mascarpone',
    // PL
    'nabiał', 'nabial', 'mleko', 'mleka', 'ser', 'sery', 'sernik', 'jogurt',
    'jogurty', 'masło', 'maslo', 'śmietana', 'smietana', 'śmietanka', 'smietanka',
    'twaróg', 'twarog', 'twarożek', 'twarozek', 'kefir', 'kefiry', 'maślanka',
    'maslanka', 'margaryna', 'mleczko', 'serwatka', 'gorgonzola'
  ],

  Meat: [
    // EN
    'meat', 'meats', 'fish', 'fishes', 'poultry', 'pork', 'beef', 'chicken',
    'turkey', 'duck', 'bacon', 'sausage', 'sausages', 'ham', 'salami', 'seafood',
    'salmon', 'tuna', 'cod', 'shrimp', 'prawn', 'steak', 'minced', 'veal', 'lamb',
    // PL
    'mięso', 'mieso', 'męso', 'ryba', 'ryby', 'ryb', 'drób', 'drob', 'wieprzowina',
    'wołowina', 'wolowina', 'kurczak', 'kurczaka', 'indyk', 'kaczka', 'boczek',
    'kiełbasa', 'kielbasa', 'kiełbaski', 'kielbaski', 'szynka', 'szynki', 'parówki',
    'parowki', 'kabanos', 'kabanosy', 'łosoś', 'losos', 'tuńczyk', 'tunczyk',
    'dorsz', 'krewetki', 'owoce morza', 'mielone', 'schab', 'pierś', 'piers'
  ],

  FruitsVegetables: [
    // EN
    'fruit', 'fruits', 'vegetable', 'vegetables', 'salad', 'salads', 'tomato',
    'tomatoes', 'potato', 'potatoes', 'apple', 'apples', 'banana', 'bananas',
    'orange', 'oranges', 'berry', 'berries', 'lemon', 'onion', 'garlic', 'carrot',
    'cucumber', 'pepper', 'avocado', 'mushroom', 'mushrooms', 'spinach', 'berry',
    // PL
    'owoc', 'owoce', 'owoców', 'warzywo', 'warzywa', 'warzyw', 'sałata', 'salata',
    'sałatka', 'salatka', 'pomidor', 'pomidory', 'ziemniak', 'ziemniaki', 'jabłko',
    'jablko', 'jabłka', 'jablka', 'banan', 'banany', 'pomarańcza', 'pomarancza',
    'cytryna', 'cebula', 'czosnek', 'marchew', 'marchewka', 'ogórek', 'ogorek',
    'papryka', 'awokado', 'pieczarki', 'grzyby', 'szpinak', 'truskawki', 'maliny'
  ],

  Beverages: [
    // EN
    'beverage', 'beverages', 'drink', 'drinks', 'juice', 'juices', 'water',
    'waters', 'tea', 'teas', 'coffee', 'coffees', 'beer', 'beers', 'wine',
    'soda', 'cola', 'cider', 'energy drink', 'isotonic', 'lemonade',
    // PL
    'napój', 'napoj', 'napoje', 'napojów', 'sok', 'soki', 'soków', 'woda',
    'wody', 'herbata', 'herbaty', 'kawa, kawy', 'piwo', 'piwa', 'wino',
    'wina', 'oranżada', 'oranzada', 'kompot', 'cola', 'energetyk', 'izotonik',
    'cytrynada', 'lemoniada'
  ],

  DryGrains: [
    // EN
    'pasta', 'pastas', 'rice', 'cereal', 'cereals', 'flour', 'grain', 'grains',
    'oat', 'oats', 'oatmeal', 'noodle', 'noodles', 'groats', 'couscous',
    'quinoa', 'barley', 'semolina', 'lentils', 'chickpeas', 'beans',
    // PL
    'makaron', 'makarony', 'ryż', 'ryz', 'płatki', 'platki', 'mąka', 'maka',
    'kasza', 'kasze', 'owsianka', 'musli', 'müsli', 'kuskus', 'soczewica',
    'ciecierzyca', 'groch', 'fasola', 'otręby', 'otreby', 'sypkie'
  ],

  SpicesSauces: [
    // EN
    'spice', 'spices', 'sauce', 'sauces', 'condiment', 'condiments', 'oil',
    'oils', 'dressing', 'ketchup', 'mustard', 'mayonnaise', 'mayo', 'vinegar',
    'pepper', 'salt', 'herb', 'herbs', 'curry', 'soy sauce', 'olive oil',
    // PL
    'przyprawa', 'przyprawy', 'przypraw', 'sos', 'sosy', 'sosów', 'olej',
    'oleje', 'oliwa', 'dresing', 'dressing', 'ketchup', 'keczap', 'musztarda',
    'majonez', 'ocet', 'pieprz', 'sól', 'sol', 'zioła', 'ziola', 'bazylia',
    'oregano', 'curry', 'sos sojowy', 'przecier'
  ],

  Sweets: [
    // EN
    'chocolate', 'chocolates', 'sweet', 'sweets', 'candy', 'candies',
    'praline', 'pralines', 'caramel', 'marshmallow', 'lollipop', 'gummy',
    'gummies', 'bonbon', 'cocoa', 'wafer', 'wafers',
    // PL
    'czekolada', 'czekolady', 'słodycze', 'slodycze', 'słodycz', 'slodycz',
    'cukierek', 'cukierki', 'cukierków', 'praliny', 'pralinostwo', 'karamel',
    'pianki', 'lizak', 'lizaki', 'żelki', 'zelki', 'kakao', 'batonik', 'batony',
    'wafel', 'wafelek', 'wafle'
  ],

  Snacks: [
    // EN
    'snack', 'snacks', 'biscuit', 'biscuits', 'cookie', 'cookies', 'chip',
    'chips', 'crisp', 'crisps', 'cracker', 'crackers', 'popcorn', 'pretzel',
    'pretzels', 'nuts', 'peanut', 'peanuts', 'almond', 'almonds',
    // PL
    'przekąska', 'przekaska', 'przekąski', 'przekaski', 'ciastko', 'ciastka',
    'ciasteczka', 'herbatniki', 'chipsy', 'chrupki', 'krakersy', 'popcorn',
    'paluszki', 'precle', 'orzechy', 'orzeszki', 'migdały', 'migdaly', 'płatki'
  ],

  Bakery: [
    // EN
    'bread', 'breads', 'bakery', 'bun', 'buns', 'roll', 'rolls', 'baguette',
    'croissant', 'toast', 'tortilla', 'bagel', 'pita', 'doughnut', 'donut',
    // PL
    'pieczywo', 'chleb', 'chleby', 'bułka', 'bulka', 'bułki', 'bulki',
    'bagietka', 'rogai', 'rogalik', 'rogaliki', 'toast', 'tosty', 'tortilla',
    'pączek', 'paczek', 'drożdżówka', 'drozdzowka', 'kajzerka', 'kajzerki'
  ],

  FrozenFoods: [
    // EN
    'frozen', 'ice cream', 'icecreams', 'sorbet', 'gelato', 'deep frozen',
    // PL
    'mrożonka', 'mrozonka', 'mrożonki', 'mrozonki', 'mrożony', 'mrozony',
    'mrożone', 'mrozone', 'lody', 'lód', 'lod', 'sorbet', 'frytki'
  ],

  CannedPreserves: [
    // EN
    'canned', 'can', 'cans', 'preserve', 'preserves', 'jam', 'jams',
    'marmalade', 'pickle', 'pickles', 'compote', 'jar', 'jars', 'tinned',
    // PL
    'konserwa', 'konserwy', 'przetwory', 'przetwór', 'przetwor', 'dżem',
    'dzem', 'dżemy', 'dzemy', 'marmolada', 'konfitura', 'ogórki kiszone',
    'kiszona', 'kiszone', 'pasteryzowane', 'słoik', 'sloik', 'słoiki', 'kompot'
  ]
};

const mapCategoryFromTags = (tags: string[] = [], categoriesString = ''): string => {
  const combined = `${tags.join(' ')} ${categoriesString}`.toLowerCase();

  // Przeglądamy po kolei kategorie z zdefiniowanej tablicy
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => combined.includes(keyword))) {
      return category;
    }
  }

  return 'Other';
};

const getFallbackCategory = (provider: BarcodeProviderKey): string => {
  switch (provider) {
    case 'OPEN_BEAUTY_FACTS':
      return 'Beauty';
    case 'OPEN_PET_FOOD_FACTS':
      return 'Pet food';
    case 'OPEN_PRODUCTS_FACTS':
      return 'Other';
    default:
      return 'Other';
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
        'Product';

      const mappedCategory = mapCategoryFromTags(
        prod.categories_tags || [],
        prod.categories || ''
      );

      return {
        barcode: cleanBarcode,
        name: String(name).trim(),
        brand: prod.brands ? String(prod.brands).trim() : undefined,
        category:
          mappedCategory !== 'Other'
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
        `Error provider ${getSourceKey(source)} for EAN ${cleanBarcode}:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }
}

export const openFactsProvider = new OpenFactsProvider();
