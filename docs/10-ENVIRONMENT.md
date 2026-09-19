# Uruchomienie od zera

Są dwa uruchamialne cele: **izolowana ewaluacja agentów** oraz **pełny host aplikacji**, na którym developerzy zrealizują backlog. Działający test pierwszego nie oznacza gotowego panelu i workflow drugiego.

## A. Szybka weryfikacja pakietu

Wymagane Node.js 24 i npm. W katalogu repo:
```bash
npm ci
npm run verify
```
Testy nie potrzebują płatnych usług. Sprawdzają kontrakty, reguły domenowe, spójność specyfikacji i bramki Cezara. Wykonanie agentów z modelem jest osobnym poleceniem w `eval/native/README.md`.

## B. Rzeczywiste uruchomienia pojedynczych agentów OM

`eval/native/` zawiera własne środowisko testowe importujące oryginalne pakiety Open Mercato 0.8.0, nie kopię ich implementacji. Wymaga klucza modelu w zmiennej środowiskowej. Model i limit kosztu są jawne. Baza ewaluacyjna PGlite jest izolowana i używa protokołu PostgreSQL z prawdziwym MikroORM oraz CommandBus. To praktyczny sposób sprawdzenia 9 ról bez instalowania Dockera na komputerze.

Zakres odbioru: natywne definicje agentów i skilli → natywny runtime → rzeczywisty model → walidacja wyniku → zapis AgentRun i śladu diagnostycznego. Brak testu HTTP sesji, pełnego systemu uprawnień aplikacji, widoków, workerów i całego procesu od początku do końca. Dane syntetyczne; test nie daje produkcyjnej konfiguracji szyfrowania. Szczegóły i faktyczne wyniki w `09-VALIDATION.md` oraz `evidence/`.

## C. Host Open Mercato dla kodowania i demo

Oficjalny przypięty checkout i starter zapewniają najbardziej odtwarzalny cel zgodny z badanym kodem. Potrzebne są Git, Node.js 24 oraz Docker lub zgodne środowisko kontenerowe. Starter stawia zależności, bazę i aplikację. Repo dostarcza sam moduł acquisition; upstream nie jest commitowany.

```bash
npm run om:prepare
cd .runtime/open-mercato
node packages/starter/bin/om-start.mjs doctor
```

Przygotuj lokalne `.env` według upstream `.env.example`; dopisz wartości z `.env.acquisition.example`. Ustaw provider/model i klucz. Włącz:
```dotenv
OM_ENABLE_ENTERPRISE_MODULES=true
OM_ENABLE_ENTERPRISE_MODULES_AGENTS=true
OM_AI_PROVIDER=openrouter
OM_AI_MODEL=<wybrany-model>
QUEUE_STRATEGY=local
```

Następnie:
```bash
node packages/starter/bin/om-start.mjs up --skip-llm-prompt
```

Zaloguj się na lokalne konto utworzone przez inicjalizację hosta; hasło pochodzi z konfiguracji hosta, nie z tej specyfikacji. Wybierz jedną organizację. Potwierdź listę 9 agentów acquisition w katalogu Agent Orchestratora. Dopiero potem uruchom izolowany test HTTP przez `POST /api/agent_orchestrator/agents/{id}/run` z `{input:...}` i zapisz `runId`. Brak klucza/modelu ma zwracać 503, a nie pozorny wynik fixture.

Pełny panel acquisition, encje i workflow są przedmiotem kart backlogu. Sam overlay przygotowany teraz rejestruje role i reguły; nie ma jeszcze wszystkich ekranów i endpointów. Po zmianach modułu odśwież overlay przez om:prepare, potem `yarn generate`; migracje zgodnie z właściwą kartą. Installer odmawia nadpisania ręcznie zmienionych plików hosta. Kod źródłowy zmieniaj w głównym repo, nie w wygenerowanej kopii runtime.

Na Windows użyj WSL 2 z Node.js 24 i Dockerem. Cezar i aplikacja muszą widzieć ten sam checkout i narzędzia; nie mieszaj ścieżek Windows i WSL w jednym uruchomieniu.

## D. Uprawnienia i konfiguracja

| Rola | Minimalne prawa |
|---|---|
| Reader | acquisition.view |
| Operator | view/manage/run, natywne uprawnienie uruchamiania agentów, jedna organizacja |
| Reviewer | view/review/export |
| Workflow principal | jawny zestaw safe commands włączony per tenant; nie uprawnienia superadmin z sesji |

Minimalny zestaw integracji do izolowanego testu: dostawca modelu. Do pobrania WWW wystarczy ograniczony adapter HTTP; Firecrawl/Apify/Octolens są opcjonalne i nie mogą zmienić braku konfiguracji w pusty „udany” wynik. Nie rejestrujemy kont, nie kupujemy abonamentów i nie przesyłamy danych dostępowych do Cezara w treści zadania.

Ustaw dwa odrębne limity: koszt wywołań dostawców w USD oraz wewnętrzny koszt przygotowania researchu/próbki w PLN. Rezerwacja dostawcy nie rozlicza czasu zespołu; cena oferty nie jest żadną z tych rezerwacji. Środowisko nie przelicza kursu automatycznie.

## E. Cezar

Instrukcja i kontrola zależności w [08-CEZAR.md](08-CEZAR.md). Wymaga zalogowanego CLI jednego z obsługiwanych agentów. Repo nie dostarcza loginu i nie może go zastąpić. Najpierw uruchom preflight, potem jedną gotową kartę. Cezar tworzy gałąź i katalog roboczy Git; człowiek zatwierdza i scala wynik, a następnie zwalnia zależne karty.

## F. Licencje

Open Mercato core i Cezar mają własne licencje; Agent Orchestrator należy do pakietu enterprise. Developerska ewaluacja została oddzielona od produkcyjnego użycia. Instrukcja nie nadaje licencji ani nie modyfikuje mechanizmów dostępu. Przed komercyjnym startem operator potwierdza uprawnienie organizacji. Własny moduł i prompty nie zawierają kodu enterprise.

## Gdy korzystasz z archiwum ZIP zamiast clone

Archiwum zawiera źródła, bez katalogu `.git`. Przed użyciem worktree Cezara utwórz lokalną historię (w rozpakowanym katalogu):

```bash
git init -b main
git add .
git commit -m "Initial acquisition specification"
```

Jeżeli to już klon repozytorium Git, pomiń ten krok. Następnie wykonaj standardowe `npm ci`, `npm run verify` i instrukcję Cezara. Repo GitHub możesz opublikować później; samo lokalne wykonywanie Cezara wymaga Git, a nie utworzonego zdalnego repo.
