const POLISH_MONTHS: Record<string, number> = {
  stycznia: 0,
  styczeń: 0,
  styczen: 0,
  lutego: 1,
  luty: 1,
  marca: 2,
  marzec: 2,
  kwietnia: 3,
  kwiecień: 3,
  kwiecien: 3,
  maja: 4,
  maj: 4,
  czerwca: 5,
  czerwiec: 5,
  lipca: 6,
  lipiec: 6,
  sierpnia: 7,
  sierpień: 7,
  sierpien: 7,
  września: 8,
  wrzesień: 8,
  wrzesien: 8,
  października: 9,
  październik: 9,
  pazdziernika: 9,
  pazdziernik: 9,
  listopada: 10,
  listopad: 10,
  grudnia: 11,
  grudzień: 11,
  grudzien: 11,
};

const ENGLISH_MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const POLISH_NUM_WORDS: Record<string, number> = {
  jeden: 1,
  pierwszy: 1,
  pierwszego: 1,
  dwa: 2,
  drugi: 2,
  drugiego: 2,
  trzy: 3,
  trzeci: 3,
  trzeciego: 3,
  cztery: 4,
  czwarty: 4,
  czwartego: 4,
  pięć: 5,
  piec: 5,
  piąty: 5,
  piatego: 5,
  sześć: 6,
  szesc: 6,
  szósty: 6,
  szostego: 6,
  siedem: 7,
  siódmy: 7,
  siodmego: 7,
  osiem: 8,
  ósmy: 8,
  osmego: 8,
  dziewięć: 9,
  dziewiec: 9,
  dziewiąty: 9,
  dziesięć: 10,
  dziesiec: 10,
  dziesiąty: 10,
  jedenaście: 11,
  jedenascie: 11,
  dwanaście: 12,
  dwanascie: 12,
  trzynaście: 13,
  trzynascie: 13,
  czternaście: 14,
  czternascie: 14,
  piętnaście: 15,
  pietnascie: 15,
  szesnaście: 16,
  szesnascie: 16,
  siedemnaście: 17,
  siedemnascie: 17,
  osiemnaście: 18,
  osiemnascie: 18,
  dziewiętnaście: 19,
  dziewietnascie: 19,
  dwadzieścia: 20,
  dwadziescia: 20,
  trzydzieści: 30,
  trzydziesci: 30,
  pół: 0.5,
  pol: 0.5,
};

const ENGLISH_NUM_WORDS: Record<string, number> = {
  one: 1,
  first: 1,
  '1st': 1,
  two: 2,
  second: 2,
  '2nd': 2,
  three: 3,
  third: 3,
  '3rd': 3,
  four: 4,
  fourth: 4,
  '4th': 4,
  five: 5,
  fifth: 5,
  '5th': 5,
  six: 6,
  sixth: 6,
  '6th': 6,
  seven: 7,
  seventh: 7,
  '7th': 7,
  eight: 8,
  eighth: 8,
  '8th': 8,
  nine: 9,
  ninth: 9,
  '9th': 9,
  ten: 10,
  tenth: 10,
  '10th': 10,
  eleven: 11,
  eleventh: 11,
  twelve: 12,
  twelfth: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  half: 0.5,
};

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const parseVoiceDate = (transcript: string, lang: 'pl' | 'en' = 'pl'): string | null => {
  const text = transcript.toLowerCase().trim().replace(/[,.]/g, ' ');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (lang === 'en') {
    // English parsing
    // 1. Relative: "today", "tomorrow", "day after tomorrow"
    if (text.includes('day after tomorrow')) {
      const d = new Date(today);
      d.setDate(d.getDate() + 2);
      return formatLocalDate(d);
    }
    if (text.includes('tomorrow')) {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return formatLocalDate(d);
    }
    if (text.includes('today')) {
      return formatLocalDate(today);
    }

    // 2. "in X days / weeks / months / years" or "next week / next month / next year"
    if (text.includes('next week')) {
      const d = new Date(today);
      d.setDate(d.getDate() + 7);
      return formatLocalDate(d);
    }
    if (text.includes('next month')) {
      const d = new Date(today);
      d.setMonth(d.getMonth() + 1);
      return formatLocalDate(d);
    }
    if (text.includes('next year')) {
      const d = new Date(today);
      d.setFullYear(d.getFullYear() + 1);
      return formatLocalDate(d);
    }
    if (text.includes('in half a year') || text.includes('half year') || text.includes('6 months')) {
      const d = new Date(today);
      d.setMonth(d.getMonth() + 6);
      return formatLocalDate(d);
    }

    const inRegex = /in\s+([0-9a-z\s]+)\s+(days?|weeks?|months?|years?)/i;
    const inMatch = text.match(inRegex);
    if (inMatch) {
      const numStr = inMatch[1].trim();
      const unit = inMatch[2].trim();
      let num = parseInt(numStr);
      if (isNaN(num)) {
        num = ENGLISH_NUM_WORDS[numStr] || 1;
      }
      const d = new Date(today);
      if (unit.startsWith('day')) {
        d.setDate(d.getDate() + num);
        return formatLocalDate(d);
      }
      if (unit.startsWith('week')) {
        d.setDate(d.getDate() + num * 7);
        return formatLocalDate(d);
      }
      if (unit.startsWith('month')) {
        d.setMonth(d.getMonth() + num);
        return formatLocalDate(d);
      }
      if (unit.startsWith('year')) {
        d.setFullYear(d.getFullYear() + num);
        return formatLocalDate(d);
      }
    }

    // 3. "end of month", "end of year"
    if (text.includes('end of month') || text.includes('end of the month')) {
      const d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return formatLocalDate(d);
    }
    if (text.includes('end of year') || text.includes('end of the year')) {
      const d = new Date(today.getFullYear(), 11, 31);
      return formatLocalDate(d);
    }

    // 4. Exact date with English month: "May 15", "15th May", "January 20, 2027"
    for (const [monthName, monthIndex] of Object.entries(ENGLISH_MONTHS)) {
      if (text.includes(monthName)) {
        const parts = text.split(monthName);
        const before = parts[0].trim();
        const after = parts[1].trim();

        const dayMatch = (before + ' ' + after).match(/(\d{1,2})(?:st|nd|rd|th)?/);
        let day = dayMatch ? parseInt(dayMatch[1]) : null;

        if (!day) {
          const allWords = (before + ' ' + after).split(/\s+/).filter(Boolean);
          for (const w of allWords) {
            if (ENGLISH_NUM_WORDS[w] !== undefined) {
              day = ENGLISH_NUM_WORDS[w];
              break;
            }
          }
        }

        const yearMatch = (before + ' ' + after).match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1]) : today.getFullYear();

        if (day && day >= 1 && day <= 31) {
          const targetDate = new Date(year, monthIndex, day);
          if (
            targetDate.getFullYear() === year &&
            targetDate.getMonth() === monthIndex &&
            targetDate.getDate() === day
          ) {
            if (!yearMatch && targetDate < today) {
              targetDate.setFullYear(today.getFullYear() + 1);
            }
            return formatLocalDate(targetDate);
          }
        }
      }
    }
  }

  // Polish parsing
  if (text.includes('pojutrze')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return formatLocalDate(d);
  }

  if (text.includes('jutro')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return formatLocalDate(d);
  }

  if (text.includes('dzisiaj') || text.includes('dzis')) {
    return formatLocalDate(today);
  }

  // 2. "za X dni / tygodni / miesięcy / lat"
  const zaRegex = /za\s+([0-9a-ząćęłńóśźż\s]+)\s+(dni|dzień|dzien|tydzień|tydzien|tygodnie|tygodni|miesiąc|miesiac|miesiące|miesiace|miesięcy|miesiecy|rok|lata|lat|pół\s+roku|pol\s+roku)/i;
  const zaMatch = text.match(zaRegex);

  if (zaMatch) {
    const numStr = zaMatch[1].trim();
    const unit = zaMatch[2].trim();

    let num = parseInt(numStr);

    if (isNaN(num)) {
      num = POLISH_NUM_WORDS[numStr] || 1;
    }

    const d = new Date(today);

    if (unit.startsWith('dn') || unit.startsWith('dz')) {
      d.setDate(d.getDate() + num);
      return formatLocalDate(d);
    }

    if (unit.startsWith('tyg')) {
      d.setDate(d.getDate() + num * 7);
      return formatLocalDate(d);
    }

    if (unit.startsWith('mies')) {
      d.setMonth(d.getMonth() + num);
      return formatLocalDate(d);
    }

    if (unit.includes('pół') || unit.includes('pol')) {
      d.setMonth(d.getMonth() + 6);
      return formatLocalDate(d);
    }

    if (unit.startsWith('rok') || unit.startsWith('lat')) {
      d.setFullYear(d.getFullYear() + num);
      return formatLocalDate(d);
    }
  }

  if (text.includes('za tydzień') || text.includes('za tydzien')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return formatLocalDate(d);
  }

  if (text.includes('za dwa tygodnie')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 14);
    return formatLocalDate(d);
  }

  if (text.includes('za miesiąc') || text.includes('za miesiac')) {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 1);
    return formatLocalDate(d);
  }

  if (text.includes('za pół roku') || text.includes('za pol roku')) {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 6);
    return formatLocalDate(d);
  }

  if (text.includes('za rok')) {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() + 1);
    return formatLocalDate(d);
  }

  // 3. Koniec miesiąca / roku
  if (
    text.includes('koniec miesiąca') ||
    text.includes('koniec miesiaca') ||
    text.includes('do końca miesiąca') ||
    text.includes('do konca miesiaca')
  ) {
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return formatLocalDate(d);
  }

  if (
    text.includes('koniec roku') ||
    text.includes('do końca roku') ||
    text.includes('do konca roku')
  ) {
    const d = new Date(today.getFullYear(), 11, 31);
    return formatLocalDate(d);
  }

  // 4. Dokładna data z nazwą miesiąca
  for (const [monthName, monthIndex] of Object.entries(POLISH_MONTHS)) {
    if (text.includes(monthName)) {
      const parts = text.split(monthName);
      const before = parts[0].trim();
      const after = parts[1].trim();

      const dayMatch = before.match(/(\d{1,2})/);
      let day = dayMatch ? parseInt(dayMatch[1]) : null;

      if (!day) {
        const words = before.split(/\s+/).filter(Boolean);
        for (let i = words.length - 1; i >= 0; i--) {
          if (POLISH_NUM_WORDS[words[i]] !== undefined) {
            day = POLISH_NUM_WORDS[words[i]];
            break;
          }
        }
      }

      const yearMatch = after.match(/(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1]) : today.getFullYear();

      if (day && day >= 1 && day <= 31) {
        const targetDate = new Date(year, monthIndex, day);
        if (
          targetDate.getFullYear() === year &&
          targetDate.getMonth() === monthIndex &&
          targetDate.getDate() === day
        ) {
          if (!yearMatch && targetDate < today) {
            targetDate.setFullYear(today.getFullYear() + 1);
          }
          return formatLocalDate(targetDate);
        }
      }
    }
  }

  // 5. Format numeryczny: "15 05 2026", "15.05", "15 05"
  const dateNumMatch = text.match(/(\d{1,2})\s+(\d{1,2})(?:\s+(\d{2,4}))?/);

  if (dateNumMatch) {
    const day = parseInt(dateNumMatch[1]);
    const month = parseInt(dateNumMatch[2]) - 1;

    let year = dateNumMatch[3] ? parseInt(dateNumMatch[3]) : today.getFullYear();

    if (year < 100) {
      year += 2000;
    }

    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      const targetDate = new Date(year, month, day);

      if (
        targetDate.getFullYear() === year &&
        targetDate.getMonth() === month &&
        targetDate.getDate() === day
      ) {
        if (!dateNumMatch[3] && targetDate < today) {
          targetDate.setFullYear(today.getFullYear() + 1);
        }
        return formatLocalDate(targetDate);
      }
    }
  }

  return null;
};

export const parsePolishVoiceDate = (transcript: string) => parseVoiceDate(transcript, 'pl');
