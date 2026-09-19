# Testy agentów w rzeczywistym runtime Open Mercato

Ten pakiet uruchamia pojedynczych agentów przez **niemodyfikowany AgentRuntimeService / NativeAgentRunner Open Mercato 0.8.0** i prawdziwy model przez OpenRouter. Używa prawdziwego MikroORM 7 oraz platformowego CommandBus. AgentRun, guardrails i trace są zapisywane w PostgreSQL WASM (PGlite) przez protokół PostgreSQL.

To środowisko developerskiej ewaluacji. Nie zastępuje pełnego hosta OM, kontroli uprawnień przez HTTP ani PostgreSQL produkcyjnego. Licencja enterprise pozostaje własnością Open Mercato; zależność jest pobierana z npm, a jej kod nie jest kopiowany do repo. Przed wykorzystaniem komercyjnym trzeba mieć odpowiednie uprawnienie.

Wyniki i ograniczenia tej sesji: [REPORT.md](REPORT.md).

## Uruchomienie

Node 24; około 800 zależności pobieranych jednorazowo. Z repo:

```bash
cd eval/native
npm ci --ignore-scripts
# OPENROUTER_API_KEY dostarcz z menedżera sekretów lub środowiska.
# Alternatywnie OPENROUTER_API_KEY_FILE wskazuje plik poza repo.
npm test
```

Domyślny model wykonawczy: `anthropic/claude-sonnet-5`, provider `openrouter`. `OM_AI_MODEL` pozwala zmienić model. Ta polityka wynika z wykrytych błędów tańszego `openai/gpt-4.1-mini`; mocniejszy model również wymaga walidatora, oceny semantycznej i człowieka przed wydaniem materiału. Skrypt odczytuje aktualną cenę z katalogu OpenRouter, zapisuje szacowany koszt tokenów i kończy serię po osiągnięciu 80% domyślnego budżetu 1 USD. Limit ostatniego wywołania nie jest atomową blokadą operatora; ustaw także twardy limit klucza u operatora. `EVAL_MAX_COST_USD` zmienia budżet serii. Rozliczenie operatora modelu jest ostatecznym źródłem kosztu.

Domyślny raport: `evidence/native-latest.json`. Przykład testu wybranych zmienionych przypadków:

```bash
EVAL_FIXTURES=post_writer.normal,post_writer.challenging EVAL_REPORT=evidence/native-post-retest.json npm test
```

Warianty referencyjne w fixture służą walidacji testów. **Nie są wysyłane do modelu.** Model otrzymuje wyłącznie wejście danego przypadku i instrukcje swojej roli. Każdy raport zapisuje hash użytego pakietu agentów i wynik każdego przypadku.

Niezależna semantyczna ocena rzeczywistych wyników (domyślnie inny model, `anthropic/claude-sonnet-5`):

```bash
EVAL_SOURCE_REPORT=evidence/native-latest.json npm run judge
```

Sędzia dostaje źródłowe wejście zapisane w raporcie, wynik agenta i wymagania roli. Nie otrzymuje wzorcowej odpowiedzi. Jego raport domyślnie trafia do `evidence/native-judge-latest.json`. `EVAL_JUDGE_MODEL` zmienia model, `EVAL_JUDGE_REPORT` nazwę raportu. Krytyk może popełniać błędy; oceny fail trzeba przejrzeć z podanym cytatem i źródłem.

## Co znaczy PASS

- Zakończony rzeczywisty native run ze strukturalnie poprawnym wynikiem.
- Przejście własnego `validateAgentOutput`: odwołania do istniejących źródeł, dosłowne cytaty, limity, zasady ofert i przekazania.
- Oczekiwany status oraz najważniejsze warunki scenariusza.

`AgentRun.status=ok` **nie wystarcza** do zatwierdzenia wyniku biznesowego. Platforma zapisuje surowy wynik wcześniej; własny walidator blokuje zapis domenowy/przejście dalej. Nie zmieniamy zapisanego śladu, gdy własny gate odrzuci treść.

## Czego ten test nie dowodzi

- Uruchomienia całego hosta Next.js, generatora rejestrów, UI oraz ścieżki logowania.
- Poprawności ról/uprawnień między tenantami: test ma kontrolowany scope RBAC.
- Współbieżności zwykłego PostgreSQL, durable event workers i pełnego workflow.
- Działania rzeczywistych źródeł Firecrawl/Apify/Octolens: wejścia są syntetyczne.
- Szyfrowania: syntetyczne dane w testowej bazie używają domyślnego KMS noop.
- Rzeczywistej gotowości klienta do zakupu lub statystycznie wiarygodnej skuteczności agenta.

Wyniki semantycznego syntetycznego sędziego są dodatkową oceną, nie dowodem prawdziwości ani substytutem ręcznego sprawdzenia próbki.

## Przed modelem i pojedyncza naprawa

`npm run gate` testuje prawdziwy `inspectAgentInput` bez modelu. Brak wymaganego dowodu, niezgodny cytat briefu i nieudane pobranie blokują start. Raport `evidence/native-input-gate.json` nie zmienia historycznych nieudanych odpowiedzi modelu w sukcesy.

`npm run repair` odtwarza jedną naprawę udokumentowanych defektów semantycznych. Ustaw `EVAL_FIXTURES=signal_auditor.normal,brief_writer.normal,post_writer.normal` dla pierwszej trójki. Bierze oryginalne wejście i rzeczywisty wcześniejszy wynik z `evidence/native-final-retest.json`, dodaje konkretną uwagę recenzenta i uruchamia nowego agenta przez ten sam native runtime. Instrukcje roli, skille i schema są te same; dodatkowa definicja ewaluacyjna objaśnia envelope naprawy. Wynik nie jest edytowany ręcznie. Raport zachowuje identyfikator wcześniejszego przebiegu i feedback. Jest to wzorzec dla hostowego adaptera retry do implementacji; nie dowodzi istnienia pełnego handlera produkcyjnego.

```bash
EVAL_SOURCE_REPORT=evidence/native-repair-final.json EVAL_JUDGE_REPORT=evidence/native-judge-repair.json npm run judge
```

Po jednej nieudanej naprawie wynik pozostaje `needs_human`; nie wykonuj pętli do uzyskania przypadkowego PASS. Krytyk v2 jest zachowany do audytu w `judge-prompt-v2.txt`; aktualny sędzia doprecyzowuje zakres etapu i reguły warunkowe. Każdy nowy raport sędziego zawiera wersję oraz hash jego instrukcji.

Jedna naprawa pozostałych trzech ról z ich oryginalnego zapisanego wejścia:

```bash
EVAL_SOURCE_REPORT=evidence/native-v2.json EVAL_FIXTURES=search_planner.normal,proof_writer.normal,handoff_writer.normal EVAL_REPORT=evidence/native-repair-remaining.json npm run repair
EVAL_SOURCE_REPORT=evidence/native-repair-remaining.json EVAL_JUDGE_REPORT=evidence/native-judge-remaining.json npm run judge
```

To jedna naprawa każdego wskazanego przypadku, a nie wiele prób wybieranych po najlepszym wyniku. Zmiana feedbacku wymaga jawnego nowego śladu ewaluacji.
