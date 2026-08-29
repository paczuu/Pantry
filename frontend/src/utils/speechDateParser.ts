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

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const parsePolishVoiceDate = (transcript: string): string | null => {
  const text = transcript.toLowerCase().trim().replace(/[,.]/g, ' ');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Relatywne: "jutro", "pojutrze"
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

  // Szybkie dopasowania: "za tydzień", "za miesiąc", "za rok", "za pół roku"
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

  // 4. Dokładna data z nazwą miesiąca:
  // "15 maja", "25 maja 2026", "pierwszy czerwca", "17 września"
  for (const [monthName, monthIndex] of Object.entries(POLISH_MONTHS)) {
    if (text.includes(monthName)) {
      const parts = text.split(monthName);
      const before = parts[0].trim();
      const after = parts[1].trim();

      // Znajdź dzień jako cyfrę
      const dayMatch = before.match(/(\d{1,2})/);
      let day = dayMatch ? parseInt(dayMatch[1]) : null;

      // Jeśli nie było cyfry, spróbuj znaleźć dzień zapisany słownie
      if (!day) {
        const words = before.split(/\s+/).filter(Boolean);

        for (let i = words.length - 1; i >= 0; i--) {
          if (POLISH_NUM_WORDS[words[i]] !== undefined) {
            day = POLISH_NUM_WORDS[words[i]];
            break;
          }
        }
      }

      // Rok opcjonalny
      const yearMatch = after.match(/(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1]) : today.getFullYear();

      if (day && day >= 1 && day <= 31) {
        const targetDate = new Date(year, monthIndex, day);

        // Sprawdź, czy data faktycznie istnieje, np. odrzuć 31 lutego
        if (
          targetDate.getFullYear() !== year ||
          targetDate.getMonth() !== monthIndex ||
          targetDate.getDate() !== day
        ) {
          return null;
        }

        // Jeśli nie podano roku i data już minęła, wybierz następny rok
        if (!yearMatch && targetDate < today) {
          targetDate.setFullYear(today.getFullYear() + 1);
        }

        return formatLocalDate(targetDate);
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
        targetDate.getFullYear() !== year ||
        targetDate.getMonth() !== month ||
        targetDate.getDate() !== day
      ) {
        return null;
      }

      if (!dateNumMatch[3] && targetDate < today) {
        targetDate.setFullYear(today.getFullYear() + 1);
      }

      return formatLocalDate(targetDate);
    }
  }

  return null;
};
