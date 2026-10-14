# 🌾 BarleyTxT — Nowoczesny Portal Paczek Zasobów i Studio Edycji Tekstur Minecraft

BarleyTxT to kompleksowa platforma webowa dla społeczności Minecraft, łącząca katalog paczek zasobów (Texture Packs), zaawansowany podgląd 3D modeli i pancerzy w czasie rzeczywistym oraz **wbudowany edytor tekstur (Pixel Art Studio)** pozwalający na modyfikację i eksport paczek pod dowolną wersję Minecrafta bezpośrednio w przeglądarce.

---

## 🚀 Główne Możliwości i Funkcje

### 1. 🎨 Edytor Tekstur Pixel Art (`/editor`)
Dostępny dla każdego użytkownika zaawansowany edytor pikselowy w przeglądarce:
- **Wgrywanie własnych paczek `.zip`**: Przeciągnij i upuść (Drag & Drop) lub załaduj z dysku dowolną paczkę zasobów Minecraft.
- **Gotowa paczka demonstracyjna**: Możliwość przetestowania edytora jednym kliknięciem bez posiadania własnego pliku.
- **Kategoryzacja i filtry**: Podział na Bloki, Przedmioty, Zbroje, Elytry, HUD / GUI, cząsteczki i CustomModelData (CMD).
- **Kompletny zestaw narzędzi Pixel Art**:
  - **Ołówek (B)** z regulacją rozmiaru pędzla (1px, 2px, 3px, 4px).
  - **Gumka (E)** czyszcząca do przezroczystości kanału alpha.
  - **Wypełnianie / Wiadro z farbą (G)**: 4-kierunkowy flood fill (algorytm BFS w kolejce, bezpieczny dla pamięci).
  - **Globalna zamiana koloru (R)**: Zastępowanie wybranego odcienia w całej teksturze bez względu na ciągłość.
  - **Kształty geometryczne**: Linia (L), Prostokąt (U), Okrąg (C) — tryb obrysu lub pełnego wypełnienia (algorytmy Bresenhama).
  - **Dodge & Burn (D / S)**: Narzędzia do rozjaśniania i przyciemniania pikseli, kluczowe przy cieniowaniu tekstur.
  - **Dithering (Szachownica)**: Pędzel 50% stipple do klasycznego pixel artu.
  - **Kroplomierz (I)**: Błyskawiczne pobieranie próbek koloru z płótna.
  - **Przesuwanie widoku (Hand / Pan)**: Płynny panning spacją lub środkowym przyciskiem myszy.
  - **Zoom 4x - 64x**: Płynne skalowanie kółkiem myszy z siatką pikseli i szachownicą przezroczystości.
- **Palety barw**:
  - Automatyczna ekstrakcja unikalnych kolorów z aktualnie edytowanej tekstury.
  - Gotowe palety inspirowane Minecraftem (Diament, Netheryt, Złoto, Żelazo, Redstone, Szmaragd, Lapis Lazuli, Drewno, Kamień).
  - Własna paleta użytkownika zapisywana w pamięci lokalnej (`localStorage`).
  - Przełącznik koloru głównego i dodatkowego (skrót `X`).
- **Pełna historia operacji**:
  - Nieograniczona historia operacji Undo / Redo (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`).
- **Transformacje**:
  - Odbicie lustrzane poziome (Flip H) i pionowe (Flip V).
  - Obrót o 90° w prawo.
  - Odwrócenie barw (Invert RGB).
  - Czyszczenie płótna i przywracanie stanu oryginalnego.
- **Import i eksport pojedynczych plików**:
  - Zastępowanie tekstury zewnętrznym plikiem PNG.
  - Pobieranie pojedynczej wyedytowanej tekstury jako PNG.
- **Eksport i konwersja całej paczki zasobów**:
  - Automatyczna przebudowa struktury paczki pod wybraną wersję Minecraft (`1.8.9`, `1.12.2`, `1.16.5`, `1.18.2`, `1.19.4`, `1.20`, `1.20.4`, `1.21+`).
  - Prawidłowe generowanie pliku `pack.mcmeta` z odpowiednim `pack_format`.
  - Zamiana folderów `items/` <-> `item/` oraz `blocks/` <-> `block/` w zależności od generacji gry.
  - Możliwość ustawienia własnej nazwy, opisu i ikony `pack.png`.

---

### 2. 🧊 Moduł Przeglądu i Silnik Renderowania 3D
- Skanowanie paczki ZIP w pamięci przeglądarki (`JSZip`, `@xmcl/resourcepack`).
- Renderowanie modeli bloków i itemów 3D w technologii WebGL (`block-model-renderer`, `three`).
- Podgląd zbroi i skórek 3D (`skinview3d`) z pełną animacją i możliwością inspekcji.
- Dynamiczne renderowanie 3D skinów partnerów w karuzeli na stronie głównej z buforowaniem i studyjnym oświetleniem.
- Wykrywanie wariantów CustomModelData, plików `.mcmeta` dla tekstur animowanych i warstw pancerza.

---

### 3. 📦 Katalog Paczek i Narzędzia (`/catalog`, `/converter`, `/create`)
- Katalog najpopularniejszych paczek PvP, Default Edit, Overlay, UHC, Bedwars.
- Konwerter wersji paczek tekstur online.
- Generator unikalnych linków do pobierania ze statystykami.
- Wielojęzyczność z szybkim przełącznikiem w navbarze (**POL**, **ENG**, **DEU**).

---

### 4. 🔒 Panel Administratora
Moduł zarządzania platformą zoptymalizowany pod kątem bezpieczeństwa (dostęp do panelu wymaga autoryzacji kluczem administratora). Panel pozwala na wgrywanie nowych paczek, podgląd 3D modeli, edycję katalogu, pobieranie kopii zapasowych JSON oraz analizę statystyk.

---

## 🛠️ Stos Technologiczny

| Warstwa | Zastosowana technologia |
|---|---|
| **Frontend Core** | React 18, React DOM |
| **Bundler & Tooling** | Vite 5 |
| **Styling** | Vanilla CSS (modułowe arkusze stylów w `src/styles/` i `assets/css/`) |
| **Manipulacja Archiwami** | `jszip`, `@xmcl/resourcepack`, `pack-format` |
| **Renderowanie 3D** | `three.js`, `block-model-renderer`, `skinview3d` |
| **Ikony & UI** | `lucide-react`, `canvas-confetti` |
| **Backend API** | Node.js Express, Socket.IO, Multer, MongoDB (opcjonalnie) |

---

## 📦 Struktura Projektu

```text
websiteBarleytxt/
├── backend/                        # Serwer backendowy Express (API, konwersja, auth)
│   ├── utils/                      # Konwerter paczek, mapowania wersji
│   └── server.js                   # Główny plik serwera Node.js (port 3000)
├── public/                         # Zasoby statyczne serwowane w niezmienionej postaci
├── src/
│   ├── components/
│   │   ├── admin/review/           # Moduł inspekcji i przeglądu 3D paczek
│   │   ├── editor/                 # Edytor pikselowy (Canvas, palety, modal eksportu)
│   │   ├── Navbar.jsx              # Pasek nawigacyjny (przełącznik POL / ENG / DEU)
│   │   ├── Footer.jsx              # Stopka serwisu
│   │   ├── PartnersSection.jsx     # Karuzela partnerów
│   │   ├── SkinCanvas.jsx          # Renderer 3D skinów Minecraft w karuzeli
│   │   ├── PackCard.jsx            # Karta paczki tekstur
│   │   └── ToastContainer.jsx      # Powiadomienia aplikacji
│   ├── pages/
│   │   ├── HomePage.jsx            # Strona główna
│   │   ├── CatalogPage.jsx         # Katalog tekstur
│   │   ├── TextureEditorPage.jsx   # Pixel Art Studio
│   │   ├── ConverterPage.jsx       # Konwerter wersji
│   │   ├── CreateLinkPage.jsx      # Kreator linków do pobierania
│   │   ├── UnlockPage.jsx          # Odblokowywanie linków
│   │   └── AdminPage.jsx           # Panel zarządzania i uploader paczek
│   ├── context/                    # Stan globalny (Auth, Język, Paczki, Toast)
│   ├── services/                   # Logika renderowania WebGL, edytora i skanera
│   ├── styles/                     # Arkusze stylów CSS
│   ├── translations.js             # Baza tłumaczeń (PL, EN, DE)
│   ├── App.jsx                     # Główny routing aplikacji (SPA)
│   └── main.jsx                    # Punkt wejściowy React
├── texturepacks.json               # Baza danych paczek tekstur (lokalna/fallback)
├── package.json
└── vite.config.js
```

---

## ⚙️ Wymagania Wstępne i Środowisko

- **Node.js**: Wersja **18.x** lub **20.x** LTS (zalecana)
- **NPM**: Wersja **9.x** lub nowsza
- **Git**

---

## 💻 Instalacja i Uruchomienie Lokalne (Development)

### Krok 1: Klonowanie repozytorium i instalacja zależności
```bash
git clone https://github.com/twoj-login/websiteBarleytxt.git
cd websiteBarleytxt
npm install
```

### Krok 2: Konfiguracja zmiennych środowiskowych (opcjonalnie)
Utwórz plik `.env` w głównym folderze projektu:
```env
PORT=3000
ADMIN_KEY=twoje_bezpieczne_haslo_admina
# MONGO_URI=mongodb+srv://user:haslo@cluster.mongodb.net/barleytxt (opcjonalnie - domyślnie używa JSON)
```
> *Uwaga: Jeśli nie utworzysz pliku `.env`, backend automatycznie użyje domyślnego klucza zapasowego oraz lokalnego pliku `texturepacks.json`.*

### Krok 3: Uruchomienie aplikacji

Możesz uruchomić oba procesy w osobnych terminalach:

**Terminal 1 — Frontend (Vite Dev Server):**
```bash
npm run dev
```
Aplikacja jest dostępna pod adresem: **`http://localhost:5173/`**  
*(Vite automatycznie przekazuje zapytania API na port 3000)*

**Terminal 2 — Backend API (Node.js Express):**
```bash
npm run server
```
Backend nasłuchuje na porcie: **`http://localhost:3000/`**

---

## 🚀 Wdrożenie Produkcyjne (Deploy)

Aplikacja składa się z **frontendu React (SPA)** oraz **backendu Node.js (Express API)**.

### Krok 1: Zbudowanie frontendu
W głównym katalogu uruchom komendę:
```bash
npm run build
```
Vite skompiluje zoptymalizowaną paczkę produkcyjną do folderu **`dist/`**.

### Krok 2: Obsługa grafik paczek tekstur (`/assets/img/texturepacks/`)
Wszystkie miniaturki i ikony paczek zdefiniowane w `texturepacks.json` odwołują się do ścieżki `/assets/img/texturepacks/...`.
- **Dopasowanie grafik:** Wszystkie kafelki w serwisie używają reguły `object-fit: cover` oraz automatycznego fallbacku `onError` na grafikę domyślną, dzięki czemu nowe i stare obrazki dopasowują się automatycznie bez zniekształceń.
- **Kopiowanie do buildu:** Aby zbudowany folder `dist/` serwował dotychczasowe grafiki paczek:
  ```bash
  # Skopiuj katalog ze screenami paczek do katalogu produkcyjnego dist:
  cp -r assets/img/texturepacks dist/assets/img/
  ```
- **Zalecane na serwerze (VPS):** W konfiguracji Nginx warto podpiąć stały alias na dysku (np. `/var/www/websiteBarleytxt/assets/img/texturepacks/`), dzięki czemu kolejne kompilacje (`npm run build`) nigdy nie nadpiszą ani nie usuną wgranych grafik.

---

### Opcja A: Wdrożenie na serwerze VPS (Linux / Ubuntu z Nginx + PM2) — Rekomendowane

Jest to kompletna konfiguracja, w której Nginx serwuje pliki frontendu i działa jako Reverse Proxy dla API.

#### 1. Uruchomienie backendu w tle za pomocą PM2
Zainstaluj PM2 globalnie (jeśli jeszcze nie posiadasz):
```bash
npm install -g pm2
```
Uruchom serwer backendu:
```bash
pm2 start backend/server.js --name "barley-api"
pm2 save
pm2 startup
```

#### 2. Konfiguracja Nginx (`/etc/nginx/sites-available/barleytxt`)
Utwórz lub zmodyfikuj konfigurację Nginx dla swojej domeny:

```nginx
server {
    listen 80;
    server_name barleytxt.pl www.barleytxt.pl;

    # Katalog ze zbudowanym frontendem Vite
    root /var/www/websiteBarleytxt/dist;
    index index.html;

    # Limit wielkości przesyłanych paczek zip w panelu admina i konwerterze
    client_max_body_size 250M;

    # Kompresja Gzip dla szybkiego ładowania
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # 1. Przekazywanie zapytań API i funkcji serwerowych do backendu Node.js
    location ~ ^/(api|convert|total-downloads|stats|view|download|online|socket.io) {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 2. Stały folder dla grafik paczek (trwałe przechowywanie poza dist)
    location /assets/img/texturepacks/ {
        alias /var/www/websiteBarleytxt/assets/img/texturepacks/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri =404;
    }

    # 3. Pozostałe zasoby statyczne (cache w przeglądarce)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri =404;
    }

    # 4. Routing React SPA - wszystkie pozostałe ścieżki kieruj do index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Włącz stronę i przeładuj Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/barleytxt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. Zabezpieczenie certyfikatem SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d barleytxt.pl -d www.barleytxt.pl
```

---

### Opcja B: Wdrożenie Frontendu na Vercel / Netlify / Cloudflare Pages

Jeśli hostujesz sam frontend statycznie, pamiętaj o regule przepisywania routingu SPA (aby odświeżenie podstron takich jak `/editor` czy `/converter` nie zwracało błędu 404).

#### Vercel (`vercel.json`):
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://twoje-api.barleytxt.pl/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### Netlify (`public/_redirects`):
```text
/api/*  https://twoje-api.barleytxt.pl/api/:splat  200
/*      /index.html                               200
```

---

## 🔐 Zmienne Środowiskowe i Bezpieczeństwo

Klucz dostępu do funkcji administracyjnych backendu definiuje się w pliku `.env`:
```env
ADMIN_KEY=twoj_bezpieczny_klucz_administratora
```
*(Wszelkie zmiany zmiennych środowiskowych wchodzą w życie po zrestartowaniu backendu, np. `pm2 restart barley-api`)*.

---

## ⌨️ Skróty Klawiszowe w Edytorze Tekstur

| Klawisz | Akcja |
|---|---|
| `B` | Pędzel / Ołówek (Pencil) |
| `E` | Gumka (Eraser) |
| `G` | Wiadro / Wypełnianie (Bucket) |
| `I` | Kroplomierz (Eyedropper) |
| `L` | Linia (Line) |
| `U` | Prostokąt (Rectangle) |
| `C` | Okrąg (Circle) |
| `D` | Rozjaśnianie (Dodge) |
| `S` | Przyciemnianie (Burn) |
| `R` | Globalna zamiana koloru (Color Replace) |
| `X` | Zamiana koloru głównego z dodatkowym |
| `H` | Odbicie lustrzane w poziomie (Flip H) |
| `V` | Odbicie lustrzane w pionie (Flip V) |
| `Ctrl + Z` | Cofnij operację (Undo) |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Ponów operację (Redo) |
| `Spacja + Przeciągnięcie` | Przesuwanie widoku (Pan) |
| `Kółko myszy` | Zoom in / Zoom out |
| `Escape` | Zamknięcie edytora (z potwierdzeniem w razie zmian) |

---

## 📄 Licencja
Projekt stworzony dla platformy BarleyTxT. Wszelkie prawa zastrzeżone.
