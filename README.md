# NOCTUA

**Lokalne narzędzie do zarządzania zespołem agentów AI.** Zatrudniasz agentów (researcher, copywriter, developer, analityk, recenzent), dajesz im zadania, a oni naprawdę je wykonują — każdy agent to osobne wywołanie **Claude Code w trybie headless** (`claude -p`) na Twoim komputerze, w ramach **Twojej subskrypcji Claude**. Wyniki lądują jako pliki (Markdown, CSV, HTML, PDF, Word) w katalogu zadania.

Całość jest pokazana jako stacja na skraju mgławicy: agenci przechodzą do swoich modułów, gdy pracują, odpoczywają w kapsułach, gdy czekają, a gdy coś się zepsuje — widać to od razu.

> Repo zawiera tylko kod. Nie ma w nim żadnych kluczy ani kont — agenci korzystają z Claude Code zalogowanego na komputerze, na którym uruchamiasz NOCTUA.

---

## Spis treści

1. [Szybki start](#szybki-start)
2. [Wymagania](#wymagania)
3. [Uruchomienie agentów lokalnie — krok po kroku](#uruchomienie-agentów-lokalnie--krok-po-kroku)
4. [Tryby: Mock i Claude](#tryby-mock-i-claude)
5. [Jak tego używać](#jak-tego-używać)
6. [Jak to działa pod spodem](#jak-to-działa-pod-spodem)
7. [Bezpieczeństwo](#bezpieczeństwo)
8. [Koszty i limity](#koszty-i-limity)
9. [Zapis stanu](#zapis-stanu)
10. [Konfiguracja (zmienne środowiskowe)](#konfiguracja-zmienne-środowiskowe)
11. [Gdy coś nie działa](#gdy-coś-nie-działa)
12. [Ograniczenia i znane problemy](#ograniczenia-i-znane-problemy)
13. [Dla deweloperów](#dla-deweloperów)

---

## Szybki start

```bash
git clone https://github.com/GracjanFilipek/agent-tycoon.git
cd agent-tycoon
npm install
npm run dev
```

Otwórz **http://localhost:5173**. Aplikacja startuje w trybie **Mock** — wszystko działa (zatrudnianie, zadania, scena, przeciąganie), ale agenci tylko udają pracę i nie wołają modelu. Żeby agenci pracowali naprawdę, zobacz [Tryby](#tryby-mock-i-claude).

`npm run dev` uruchamia dwa procesy naraz: serwer (`127.0.0.1:3001`) i interfejs (`localhost:5173`). Zatrzymujesz oba przez `Ctrl+C`.

---

## Wymagania

| Co | Wersja | Po co |
|---|---|---|
| **Node.js** | **20.12+** (testowane na 25) | serwer i interfejs |
| **npm** | dołączony do Node | instalacja, workspaces |
| **Claude Code CLI** | testowane na **2.1.198** | tylko w trybie Claude |
| **Subskrypcja Claude** (Pro / Max) | zalogowana w CLI | tylko w trybie Claude |
| **Google Chrome** (lub Chromium / Edge / Brave) | dowolna aktualna | tylko eksport do PDF |
| **macOS** | — | eksport do Word (`textutil`), „Pokaż w Finderze” |

System: rozwijane i testowane na **macOS**. Na Linuksie działa wszystko poza eksportem DOCX i „Pokaż w Finderze” (PDF po ustawieniu `CHROME_BIN`). **Windows nie był testowany.**

---

## Uruchomienie agentów lokalnie — krok po kroku

Tryb Mock działa od razu po `npm install`. Żeby agenci **naprawdę** wykonywali zadania, potrzebujesz czterech rzeczy na swoim komputerze: **Node.js**, **Claude Code**, **subskrypcji Claude zalogowanej w Claude Code** i dostępu do tego repozytorium. Poniżej po kolei, z poleceniami do sprawdzenia, że każdy krok się udał (przykłady dla macOS).

### Krok 1. Node.js 20.12 lub nowszy

```bash
node -v
```

Jeśli polecenie nie istnieje albo wersja jest starsza niż `v20.12`, zainstaluj wersję LTS z [nodejs.org](https://nodejs.org) albo przez Homebrew:

```bash
brew install node
```

### Krok 2. Git i dostęp do repozytorium

```bash
git --version
```

Na macOS przy pierwszym użyciu system zaproponuje instalację narzędzi deweloperskich — zgódź się. **Repozytorium jest prywatne:** właściciel musi dodać Cię jako współpracownika na GitHubie, zanim `git clone` zadziała.

### Krok 3. Claude Code (CLI)

Claude Code to program, którym NOCTUA uruchamia każdego agenta. Zainstaluj go według [dokumentacji Claude Code](https://docs.claude.com) — w chwili pisania dostępny był instalator natywny i pakiet npm:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

albo:

```bash
npm install -g @anthropic-ai/claude-code
```

Sprawdź, że terminal go widzi:

```bash
claude --version
```

> **`command not found: claude`?** Instalator natywny kładzie program w `~/.local/bin`, którego może nie być w `PATH`. Dodaj go:
> ```bash
> echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
> ```
> NOCTUA i tak sama zajrzy do `~/.local/bin/claude`, ale dla Twojej wygody w terminalu warto to ustawić.

### Krok 4. Subskrypcja Claude i logowanie

Potrzebujesz konta Claude z planem, który obejmuje Claude Code (**Pro** lub **Max**). Zaloguj się w CLI — otworzy się przeglądarka:

```bash
claude auth login
```

Sprawdź status:

```bash
claude auth status
```

Powinno być `"loggedIn": true` i `"authMethod": "claude.ai"`.

> **Ważne:** NOCTUA działa z **logowaniem subskrypcją**. Klucz API (`ANTHROPIC_API_KEY`) jest celowo usuwany ze środowiska agentów, żeby nikt nie płacił za API, myśląc, że korzysta z subskrypcji.

### Krok 5. Sprawdź, że Claude Code działa bez okna

Agenci używają trybu headless (`claude -p`). Jedno krótkie wywołanie potwierdzi, że wszystko jest gotowe (zużywa odrobinę limitu):

```bash
claude -p "Odpowiedz jednym słowem: działa" --model haiku
```

Jeśli widzisz odpowiedź — Claude Code jest gotowy dla NOCTUA.

### Krok 6. Pobierz i uruchom NOCTUA

```bash
git clone https://github.com/GracjanFilipek/agent-tycoon.git
cd agent-tycoon
npm install
npm run dev
```

Otwórz **http://localhost:5173**.

### Krok 7. Przełącz na Claude i daj pierwsze zadanie

1. W prawym górnym rogu kliknij **Claude** i potwierdź.
2. **Zatrudnij** agenta — np. Copywriter, poziom Junior (`haiku`, najtańszy w limicie).
3. **ZADANIA → Nowa paczka:** tytuł, brief (np. *„Napisz 5 pomysłów na post na LinkedIn o automatyzacji w księgowości”*), format **Markdown**, zespół: Twój agent, zaznacz **start od razu**.
4. Klik w agenta na stacji pokaże kroki na żywo. Gotowy plik znajdziesz w zakładce **PROJEKTY**.

### Krok 8 (zalecany). Sprawdź zabezpieczenia na swoim komputerze

```bash
npm run check:security -w server -- --hard
```

Kilka krótkich wywołań `haiku`; oczekiwany wynik: `✅ Wszystkie reguły wytrzymały`. Więcej w [Bezpieczeństwo](#bezpieczeństwo).

### Opcjonalnie

- **PDF** — wymaga zainstalowanego Google Chrome (albo Chromium / Edge / Brave). Bez niego format PDF jest wyszarzony.
- **Word (DOCX)** — działa tylko na macOS (wbudowany `textutil`).

---

## Tryby: Mock i Claude

Przełącznik jest w prawym górnym rogu (🧪 **Mock** / **Claude**). Wybrany tryb jest pamiętany między uruchomieniami.

### Mock (domyślny)

Agenci symulują pracę: pojawiają się kroki („Analizuję brief…”, „WebSearch”, „Write”), powstaje przykładowy plik, recenzent wystawia ocenę. **Zero wywołań modelu, zero kosztów.** Dobre do poznania narzędzia i do pracy nad interfejsem. Jeśli w briefie wpiszesz `[błąd]`, agent celowo „utknie” — tak sprawdzisz, jak wygląda awaria.

### Claude

Agenci wołają prawdziwy Claude Code. Potrzebujesz:

1. **Zainstalowanego Claude Code** — instrukcja instalacji jest w dokumentacji Claude Code (https://docs.claude.com)
2. **Zalogowania kontem z subskrypcją:**
   ```bash
   claude auth login
   claude auth status   # powinno pokazać "loggedIn": true, "authMethod": "claude.ai"
   ```
3. **Żeby serwer znalazł program `claude`** — szuka go w `PATH`, potem w `~/.local/bin/claude`. Jeśli masz go gdzie indziej, uruchom z `CLAUDE_BIN=/pełna/ścieżka/do/claude npm run dev`.

> ⚠️ **Tylko subskrypcja, nie klucz API.** NOCTUA celowo usuwa `ANTHROPIC_API_KEY` ze środowiska agentów, żeby nikt przypadkiem nie płacił za API, myśląc, że korzysta z subskrypcji. Jeśli masz wyłącznie klucz API (bez logowania subskrypcją), agenci zgłoszą „Not logged in”.

Tryb możesz też wymusić przy starcie: `RUNNER=claude npm run dev` albo `RUNNER=mock npm run dev`.

---

## Jak tego używać

### 1. Zatrudnij agentów

Zakładka **AGENCI → Zatrudnij** (albo „Aktywuj” na uśpionym module stacji). Podajesz:

- **imię**, **rolę** (Researcher, Copywriter, Developer, Analityk, Recenzent),
- **poziom** — wybór modelu: Junior = `haiku`, Mid = `sonnet`, Senior = `opus`,
- **krótki opis** — kim agent ma być, np. *„Copywriter B2B od finansów i SAP, pisze konkretnie, z liczbami, bez korpomowy”*.

Przycisk **„Wygeneruj master prompt”** zamienia opis w szczegółowy prompt systemowy (w trybie Claude pisze go `sonnet`, w trybie Mock powstaje z szablonu). Możesz go poprawić przed zatrudnieniem i edytować później w karcie agenta (**Rdzeń świadomości**). Stacja mieści do **12 agentów**.

### 2. Daj zadanie (paczkę)

Zakładka **ZADANIA → Nowa paczka**: tytuł, brief, **format wyniku** i **zespół**.

- **Format:** Auto (agent dobiera), PDF, Word (DOCX), HTML, Markdown, CSV.
- **Zespół:** klikasz agentów w kolejności pracy. Wykonawcy pracują po kolei we wspólnym katalogu (każdy czyta pliki poprzednika), ostatni robi wynik końcowy. **Recenzenci** oceniają wynik na końcu.

Agenta do zespołu dodasz też **przeciągając paczkę** — z listy albo z Hangaru na stacji — **na sylwetkę agenta** na mapie, albo przyciskiem **„Przydziel”**.

### 3. Obserwuj pracę

- Pracujący agent idzie do strefy swojej roli (Obserwatorium, Kuźnia Słów, Rdzeń Analityczny, Warsztat, Wieża Recenzji), jego przewód danych płynie.
- Klik w agenta otwiera kartę z **logiem na żywo** (każdy krok, każde użyte narzędzie) i przyciskiem **Anuluj**.
- Agent, który **utknął** (błąd, limit tur, timeout), ma czerwony znak ▲ i przycisk **„Postaw na nogi”**.
- Gdy zadanie się uda, kula energii leci do licznika **PROJEKTY**.

### 4. Recenzja i poprawki

Jeśli w zespole jest Recenzent, ocenia wynik w skali 1–10 i zwraca listę poprawek. Gdy wynik nie jest zaakceptowany, autor dostaje **jedną rundę poprawek**, po czym recenzent ocenia ponownie. Ocena końcowa jest widoczna przy zadaniu.

### 5. Odbierz wyniki

Zakładka **PROJEKTY**: ukończone zadania, ocena, przebieg pracy i **pliki** — otwórz w przeglądarce, pobierz (⬇) albo **„Pokaż w Finderze”**. Pliki leżą w `workspaces/<id-zadania>/`.

---

## Jak to działa pod spodem

```
[ Przeglądarka: React + scena SVG ]  ⇄ WebSocket (stan na żywo) / REST (akcje) ⇄  [ Serwer: Fastify ]
                                                                                     ├─ kolejka zadań (limit równoległości)
                                                                                     ├─ pipeline zespołu (praca → recenzja → poprawki)
                                                                                     ├─ runner: Mock albo Claude CLI
                                                                                     ├─ eksport PDF / DOCX
                                                                                     └─ zapis stanu (data/state.json)
```

**Każdy krok agenta to jedno wywołanie** w katalogu zadania:

```bash
claude -p "<brief + zespół + co zrobili poprzednicy>" \
  --output-format stream-json --verbose \
  --model haiku|sonnet|opus \
  --append-system-prompt "<master prompt agenta + zasady pracy>" \
  --tools "Read,Write,Edit,Glob,Grep,WebSearch,WebFetch" \
  --allowedTools "Read(./**),Edit(./**),WebSearch,WebFetch" \
  --disallowedTools Bash \
  --permission-mode dontAsk \
  --max-turns 15|25|30 \
  --strict-mcp-config --disable-slash-commands --no-session-persistence
```

- Strumień JSON jest czytany linia po linii i zamieniany na kroki w logu (myślenie, tekst, użycie narzędzia, wynik).
- **Recenzent** dostaje tylko `Read`, `Glob`, `Grep` i odpowiada werdyktem w stałym formacie (`--json-schema`).
- **PDF i Word:** agent zapisuje porządny `wynik.html`, a serwer **po recenzji** sam zamienia go na `wynik.pdf` (Chrome w trybie headless) albo `wynik.docx` (`textutil`). Agent nie potrzebuje do tego powłoki.
- **Limity:** maks. tury na krok — 15 (haiku) / 25 (sonnet) / 30 (opus), recenzja 12; timeout kroku 10 min (`TASK_TIMEOUT_MS`).

---

## Bezpieczeństwo

NOCTUA uruchamia agentów **na Twoim komputerze**, więc domyślne ustawienia są zachowawcze:

- **Bez powłoki.** Agenci nie mają narzędzia `Bash` — nie istnieje w ich zestawie (`--tools`) i jest dodatkowo zablokowane (`--disallowedTools`). Bash to **moduł premium**: odblokowujesz go świadomie dla konkretnego agenta w jego karcie, po ostrzeżeniu.
- **Tylko katalog zadania.** Odczyt i zapis są ograniczone regułami uprawnień do `workspaces/<id-zadania>/` (`Read(./**)`, `Edit(./**)`), a tryb `dontAsk` odrzuca wszystko inne, zamiast czekać na zgodę. Agent ma to też napisane wprost w prompcie.
- **Bez pomijania uprawnień.** NOCTUA nigdy nie używa `--dangerously-skip-permissions` ani trybu `bypassPermissions`.
- **Bez Twoich serwerów MCP** (`--strict-mcp-config`).
- **Serwer słucha tylko lokalnie** (`127.0.0.1`), pliki wyników są udostępniane wyłącznie z katalogu danego zadania.

**Sprawdź to u siebie** — skrypt celowo każe agentowi złamać każdą z reguł (Bash, zapis poza katalogiem ścieżką absolutną i przez `../`, odczyt pliku z sekretem) i ocenia wynik **po plikach na dysku**, nie po tym, co agent powie. Kosztuje kilka krótkich wywołań `haiku`:

```bash
npm run check:security -w server -- --hard
```

`--hard` usuwa z promptu zasady pracy, więc zatrzymać agenta mogą już tylko uprawnienia CLI. Oczekiwany wynik: `✅ Wszystkie reguły wytrzymały`.

> Agenci dziedziczą część Twojej konfiguracji Claude Code z `~/.claude` (np. hooki, globalny `CLAUDE.md`). Serwery MCP są wyłączone, reszta nie. Zwykle to nieszkodliwe, ale wpływa na zachowanie agentów.

---

## Koszty i limity

- W trybie Claude agenci zużywają **limit Twojej subskrypcji** — tę samą pulę co rozmowy w aplikacji Claude i Claude Code. Dużo zadań na `opus` może szybciej wyczerpać limit w oknie czasowym.
- **„KOSZT API (REALNY)”** w górnym pasku to **szacunek** z CLI: ile te wywołania kosztowałyby po stawkach API. Na subskrypcji nic za to nie płacisz — traktuj to jako miarę zużycia.
- **Limit równoległości** (strzałki ▲▼ w górnym pasku, 1–5, domyślnie 2) ogranicza, ile zadań idzie naraz.
- Każde wywołanie ładuje domyślny prompt systemowy Claude Code, więc nawet proste zadanie zużywa trochę więcej niż sama treść.

---

## Zapis stanu

Agenci, zadania (z logami i wynikami), ustawienia i licznik kosztu są zapisywane w **`data/state.json`** po każdej zmianie (zapis atomowy) i przy zamykaniu serwera.

Po restarcie serwera:

- zadania, które były **w toku**, kończą się jako **nieudane** z powodem „Przerwane — serwer został zrestartowany w trakcie pracy” (procesy `claude` giną razem z serwerem) — uruchomisz je ponownie jednym kliknięciem,
- zadania **w kolejce** wracają do backlogu (restart nigdy sam nie odpala płatnych wywołań),
- pracujący agenci stają się wolni; ci, którzy utknęli, zostają w tym stanie.

Uszkodzony plik stanu jest odkładany jako `data/state.corrupt-<czas>.json`, a serwer startuje od zera. **Pełny reset:** zatrzymaj serwer i usuń `data/state.json` (opcjonalnie też `workspaces/`). Oba katalogi są w `.gitignore`.

---

## Konfiguracja (zmienne środowiskowe)

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `RUNNER` | (zapamiętany, na start `mock`) | `mock` albo `claude` — wymusza tryb przy starcie |
| `CLAUDE_BIN` | `claude` z `PATH` albo `~/.local/bin/claude` | ścieżka do Claude Code CLI |
| `CHROME_BIN` | Chrome / Chromium / Edge / Brave w `/Applications` | przeglądarka do eksportu PDF |
| `TASK_TIMEOUT_MS` | `600000` (10 min) | maks. czas jednego kroku agenta |
| `PORT` | `3001` | port serwera API — **uwaga:** interfejs (`web/vite.config.ts`) ma ten port wpisany na sztywno w proxy |

Przykład: `RUNNER=claude TASK_TIMEOUT_MS=900000 npm run dev`

---

## Gdy coś nie działa

| Objaw | Przyczyna | Co zrobić |
|---|---|---|
| Agent od razu „utknął”, w logu **„Not logged in”** | Claude Code nie jest zalogowany subskrypcją (albo masz tylko klucz API) | `claude auth login`, potem `claude auth status` → `"loggedIn": true` |
| **„Nie znaleziono programu `claude`”** | serwer nie widzi CLI | dodaj `~/.local/bin` do `PATH` (Krok 3) albo uruchom z `CLAUDE_BIN=/ścieżka/do/claude npm run dev` |
| Agent utknął z **„przekroczył limit tur”** | zadanie za duże na jeden krok (15 / 25 / 30 tur zależnie od poziomu) | podziel zadanie, daj agenta na wyższym poziomie albo dołóż kolejną osobę do zespołu |
| **„Przekroczono limit czasu”** | krok trwał dłużej niż 10 min | `TASK_TIMEOUT_MS=1200000 npm run dev` (20 min) |
| Zadanie nieudane: **„Przerwane — serwer został zrestartowany”** | serwer został zatrzymany w trakcie pracy | uruchom zadanie ponownie przyciskiem w szczegółach paczki |
| **PDF / Word wyszarzony** | brak Chrome / system inny niż macOS | zainstaluj Chrome albo ustaw `CHROME_BIN`; DOCX tylko na macOS |
| `npm run dev`: **port zajęty** (`EADDRINUSE`) | działa już inna kopia NOCTUA albo inny program na 5173 / 3001 | zamknij poprzednią kopię (`Ctrl+C` w jej terminalu) |
| Interfejs: **„brak połączenia”** | serwer nie działa | sprawdź terminal z `npm run dev` — serwer loguje tam błędy |
| Chcesz zacząć od zera | — | zatrzymaj serwer, usuń `data/state.json` (opcjonalnie `workspaces/`) |

---

## Ograniczenia i znane problemy

- **Eksport DOCX i „Pokaż w Finderze” działają tylko na macOS.** Na innych systemach format Word jest wyszarzony z informacją, dlaczego.
- **Windows nie był testowany** — uruchamianie `claude` jako procesu może wymagać poprawek.
- **Wymagana w miarę świeża wersja Claude Code** (testowane na 2.1.198): używane są flagi `--tools`, `--permission-mode dontAsk`, `--json-schema`, `--max-turns`.
- **Tylko logowanie subskrypcją** — sam klucz API nie zadziała (patrz [Krok 4](#krok-4-subskrypcja-claude-i-logowanie)).
- **Restart w trakcie zadania** przerywa je (zob. [Zapis stanu](#zapis-stanu)).
- **Maks. 12 agentów** i 1–5 zadań równolegle.

---

## Dla deweloperów

### Struktura

```
shared/   wspólne typy i katalogi (role, narzędzia, formaty)
server/   Fastify + WebSocket
  src/runners/      MockRunner, ClaudeCliRunner (+ parser stream-json)
  src/pipeline.ts   praca zespołu: kolejni wykonawcy → recenzja → poprawki → eksport
  src/taskQueue.ts  kolejka i limit równoległości
  src/prompts.ts    prompty kroków, recenzji i generatora master promptów
  src/export.ts     HTML → PDF / DOCX
  src/persistence.ts zapis i odtwarzanie stanu
  scripts/securityCheck.ts  test piaskownicy na prawdziwym CLI
web/      Vite + React
  src/station/      scena stacji (warstwy SVG + DOM, rozmieszczenie agentów)
  src/creatures/    postacie SVG: 5 ról × 5 stanów × 3 formy
  src/panels/       HUD i prawy panel (agenci, zadania, projekty)
  src/theme/        tokeny, animacje, style
design/agent-tycoon/  makiety interfejsu (.dc.html)
scripts/shots.mjs     zrzuty ekranu do porównań z makietami
```

### Polecenia

```bash
npm run dev                               # serwer + interfejs
npm run typecheck                         # TypeScript we wszystkich pakietach
npm test                                  # testy serwera (parser strumienia, zapis stanu)
npm run check:security -w server -- --hard  # test piaskownicy na prawdziwym Claude Code
npm run shots:ref                         # wzorcowe PNG z makiet → design/shots/
npm run shots -- --seed                   # zrzuty działającej aplikacji (tryb Mock) → design/shots/
```

Skrypty zrzutów używają zainstalowanego Chrome przez `playwright-core` (bez pobierania przeglądarki).

### API (lokalne)

Stan na żywo: WebSocket `/ws` (pełny stan po każdej zmianie). Akcje przez REST na `127.0.0.1:3001`:

| Metoda | Ścieżka | Co robi |
|---|---|---|
| `GET` | `/api/state` | cały stan |
| `POST` | `/api/agents/generate-prompt` | master prompt z opisu |
| `POST` / `PATCH` / `DELETE` | `/api/agents`, `/api/agents/:id` | zatrudnij / edytuj (prompt, skille) / zwolnij |
| `POST` | `/api/agents/:id/reset` | „postaw na nogi” |
| `POST` / `PATCH` / `DELETE` | `/api/tasks`, `/api/tasks/:id` | utwórz / edytuj (zespół, format) / usuń |
| `POST` | `/api/tasks/:id/start`, `/cancel` | uruchom / anuluj |
| `GET` | `/api/tasks/:id/files/*` | plik wyniku (`?download=1` — pobierz) |
| `POST` | `/api/tasks/:id/reveal` | pokaż katalog w Finderze (macOS) |
| `PATCH` | `/api/settings` | tryb (`mock`/`claude`), limit równoległości |

Runnery mają wspólny interfejs (`server/src/runners/AgentRunner.ts`) — kolejny backend (np. Agent SDK z kluczem API) to nowa klasa, bez zmian w reszcie.
