# FLOW Acquisition · Open Mercato

**Od publicznego sygnału problemu do sprawdzonego mini-researchu i jednego dobrego posta.** Pakiet do zbudowania preprocesu pozyskiwania klientów agencji: kompletna specyfikacja, natywne role agentów, kontrakty, testy i małe zadania do Cezara.

To nowy moduł, który przekazuje pakiet do sprzedaży/obsługi. Nie zastępuje pełnego procesu marketingowego i nie wysyła automatycznie wiadomości. Działający zakres oraz zadania do implementacji są rozdzielone w [raporcie weryfikacji](docs/09-VALIDATION.md).

## Zacznij od swojej roli

| Kto | Najkrótsza droga |
|---|---|
| PO / BA | [Proces 15 kroków](docs/01-PROCESS.md) → [user stories](docs/03-USER-STORIES.md) → [ekrany](docs/06-UI-AND-OPERATIONS.md) |
| Integrator | [Architektura i dane](docs/04-ARCHITECTURE.md) → [środowisko](docs/10-ENVIRONMENT.md) → [backlog i zależności](docs/07-BACKLOG.md) |
| Developer / agent kodujący | [AGENTS.md](AGENTS.md) → jedna karta z [tasks](tasks/) → jej kontrakty i test odbioru |
| AI developer | [9 ról i 4 skille](docs/05-AGENTS.md) → [kontrakty](contracts/agents.ts) → [ewaluacja native](eval/native/README.md) |
| Osoba uruchamiająca Cezara | [Cezar krok po kroku](docs/08-CEZAR.md) → `npm run cezar:ready` |
| Reviewer | [Raport testów](docs/09-VALIDATION.md) → [końcowy przegląd](evidence/process-review-v3.md) → dowody aktualnej wersji |

## Szybki start

```bash
npm ci
npm run verify
npm run docs:build
npm run cezar:ready
```

[Otwórz czytelną wersję dokumentacji](docs/portal.html) po zbudowaniu pliku. Dokumenty Markdown pozostają źródłem prawdy; portal jest ich wygenerowanym widokiem. Kod modułu jest samowystarczalny w `modules/acquisition/`, a główne `contracts/` i `fixtures/` re-eksportują te same definicje.

## Co jest w pakiecie

- Deduplikacja 27 pozycji mapy skilli z decyzją o przejęciu lub odłożeniu kompetencji.
- Proces P01–P15 z odpowiedzialnością, zakresem, wejściem i wynikiem, interwencją i błędami.
- Stories i zadania developmentu z zależnościami, plikami, estymatami i kryteriami odbioru.
- Kontrakty API, siedem encji, granice modułów, plan workflow, stany UI i handoff.
- Dziewięć definicji natywnych agentów OM, cztery współdzielone procedury i izolowane przypadki testowe.
- Workflow Cezara z ochroną przed uruchamianiem zadań bez zaakceptowanych zależności.

## Zasady zakresu

P0 oznacza samodzielne demo acquisition. Pozostałe kanały pozyskiwania, cykliczny monitoring, ads intelligence i rzeczywisty kontakt wychodzący mają oddzielne karty P1. Nie sumuj automatycznie tego backlogu z wcześniejszym tablicą zadań realizacji usługi. Budżet, ścieżka krytyczna i rezerwa są w [07-BACKLOG.md](docs/07-BACKLOG.md).

Warunki produktu: brak danych oznacza `unknown`; jakość treści nie dowodzi autorstwa AI; logo w portfolio nie dowodzi aktualnej umowy; jakość próbki nie dowodzi gotowości zapłaty. Człowiek zatwierdza konkretną rewizję. Dane testowe, rzeczywisty model, natywny runtime i pełne API mają odrębne dowody.

## Wersje

[config/upstream.json](config/upstream.json) przypina badany kod OM i Cezara. [Źródła i licencje](docs/11-SOURCES-AND-DECISIONS.md) wyjaśniają pochodzenie kompetencji oraz decyzje. Enterprise jest instalowany jako zależność do developerskiej ewaluacji, nie kopiowany do repo.
