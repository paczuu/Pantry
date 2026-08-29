# 🥫 Spiżarnia (Smart Pantry PWA)

Nowoczesna aplikacja **Progressive Web App (PWA)** z serwerem **self-hosted** do zarządzania zapasami w kuchni i spiżarni, zintegrowana z darmową bazą **Open Food Facts**, skanerem kodów kreskowych EAN, trybem szybkiego dodawania i odliczania produktów, dziennikiem zmian dla administratora, listami zakupów i notatkami.

---

## ✨ Główne Funkcje

1. **📷 Skaner Kodów EAN (html5-qrcode)**:
   - Skanowanie kodów kreskowych z kamery telefonu lub komputera (obsługa kamer przednich i tylnych, włączanie latarki/torch, sygnały dźwiękowe i wibracje).
   - Opcja ręcznego wprowadzania kodu kreskowego.
2. **🌐 Integracja z Open Food Facts**:
   - Automatyczne rozpoznawanie produktów po polsku (nazwa, marka, zdjęcie, sugerowana kategoria).
   - **Lokalny Cache SQLite**: każdy zeskanowany lub ręcznie wprowadzony produkt jest natychmiast zapisywany w lokalnej bazie.
   - Możliwość dodawania produktów bez kodu (np. domowe przetwory, warzywa z targu).
3. **⚡ Dwa Tryby Skanera**:
   - **Tryb Dodawania**: Skan kodu -> autouzupełnienie danych -> szybki wybór daty ważności (+3 dni, +1 tydz., +1 mies. itp.) -> zapis do spiżarni.
   - **Tryb Szybkiego Usuwania (Zużycia)**: Skan kodu -> wykrycie pozycji w spiżarni -> wybór ilości do odliczenia (1, 2, 5, wszystko) -> natychmiastowe odliczenie lub zużycie (z podziałem na zużyto vs wyrzucono).
4. **🛡️ System Ról i Dziennik Zmian (Tylko dla Administratora)**:
   - Role: `ADMIN` (założyciel/zarządca) i `MEMBER` (domownik).
   - **Dziennik Audytu (`ActivityLog`)**: rejestruje każdą operację (dodanie, zmiana ilości, edycja wartości np. daty ważności, usunięcie, przeniesienie z zakupów) wraz z informacją **kto** dokonał zmiany, **kiedy** i ze szczegółowym zestawieniem zmian.
   - Panel audytu zabezpieczony po stronie backendu i widoczny wyłącznie dla roli `ADMIN`.
5. **🛒 Wielokrotne Listy Zakupów**:
   - Tworzenie wielu list (np. *Biedronka*, *Lidl*, *Tygodniowe*).
   - Odznaczanie kupionych produktów w czasie rzeczywistym.
   - Przycisk **„Przenieś kupione do spiżarni”** (1-kliknięciem przenosi kupione artykuły bezpośrednio do wybranej lokalizacji w magazynie).
   - Przycisk **„+ Kończące się w spiżarni”** (automatycznie dodaje do listy artykuły przeterminowane lub z krótkim terminem).
6. **📝 Notatki i Przepisy**:
   - Przypinanie notatek na górze, tagowanie kolorami, przepisy kulinarne i listy mrożonek.
7. **🏠 Współdzielenie Gospodarstwa Domowego**:
   - Rejestracja i logowanie (JWT).
   - Unikalny **Kod Zaproszenia** dla domowników (wspólny stan spiżarni w czasie rzeczywistym).
   - Pełna personalizacja lokalizacji (Lodówka, Zamrażarka, Spiżarnia, Szuflady) i kategorii.
8. **📱 PWA & Self-Hosting**:
   - Możliwość instalacji jako aplikacja natywna na Androidzie / iOS / Windows / macOS.
   - Gotowy plik `docker-compose.yml` i `Dockerfile` (pojedynczy, lekki kontener z bazą SQLite w wolumenie `./data`).

---

## 🚀 Uruchomienie (Self-Hosting Docker)

Najprostszy sposób na uruchomienie aplikacji:

```bash
docker compose up -d
```

Aplikacja będzie dostępna pod adresem: **`http://localhost:3000`**

Baza danych SQLite zapisuje się w folderze `./data/pantry.db` na Twoim dysku.

---

## 💻 Uruchomienie Lokalne (Node.js)

### Wymagania:
- Node.js v18+ (zalecany v20/v22)
- npm

### 1. Krok: Uruchomienie Serwera Backend
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed    # opcjonalnie: wgrywa popularne polskie produkty testowe
npm run dev
```
Serwer API uruchomi się na porcie `3001`.

### 2. Krok: Uruchomienie Frontendu PWA
W nowym oknie terminala:
```bash
cd frontend
npm install
npm run dev
```
Interfejs uruchomi się na `http://localhost:5173`.

---

## 🧪 Przykładowe kody EAN do testów

- `5900820000010` – Mleko Łaciate 3.2% UHT 1L
- `5900512300107` – Masło Ekstra 200g
- `8076809513753` – Makaron Barilla Spaghetti 500g
- `5900020000629` – Ketchup Łagodny Kotlin 450g
- `5900334000452` – Majonez Kielecki 310ml
- `5900342004244` – Sok 100% Jabłko Tymbark 1L
- `5900694002613` – Czekolada Mleczna Wedel 100g
