# Weryfikacja — co działa, co czeka na implementację

**Pakiet jest przygotowaniem do developmentu. Nie jest ukończoną aplikacją acquisition.** Zweryfikowaliśmy kontrakty, reguły domenowe, pojedynczych agentów w rzeczywistych komponentach Open Mercato i mechanikę zadań Cezara. Pełny panel, API, kontrola dostępu i workflow pozostają zadaniami hackathonu.

## Jak czytać dowody

| Poziom | Co wykonano | Czego wynik nie oznacza |
|---|---|---|
| Struktura specyfikacji | Kontrola kart, zależności, godzin, pokrycia stories i odnośników | Nie potwierdza wykonania żadnego tasku |
| Przenośne testy pakietu | Rzeczywiste walidatory wejścia i wyniku, zakres organizacji, koszt, jakość, decyzje i Cezar | Nie jest testem HTTP/RBAC ani bazy hosta |
| Native agent runtime | Prawdziwy model, niezmieniony AgentRuntimeService/NativeAgentRunner, MikroORM, CommandBus i zapis SQL | Nie jest pełnym uruchomieniem Next.js, generatora rejestrów ani UI |
| Ocena treści | Sędzia semantyczny oraz dodatkowy przegląd źródeł przez agenta prowadzącego | Sędzia może się mylić; poprawny JSON nie dowodzi jakości tekstu |
| Cezar | Oryginalny parser, kontrakt API, mock uruchomienia w worktree, blokady odbioru i niezależny review | Nie uruchomiono prawdziwego agenta kodującego ani całego backlogu |
| Docelowy host | Przygotowany przypięty checkout i moduł, instrukcja startu | Pełny host, auth, workers i integracja pozostają `not_run` |

## Testy kodu i specyfikacji

Polecenia do odtworzenia:

```bash
npm ci
npm run verify
node scripts/check-spec.mjs --report
npm run cezar:preflight -- --offline
```

**72/72 testy pakietu przechodzą**, a ścisła kontrola TypeScript obejmuje kontrakty, adaptery hosta i reguły domenowe. Raport `evidence/package-tests.tap` zawiera końcowy przebieg testów. `evidence/spec-check.json` sprawdza 34 karty: 26 P0 i 8 P1. Kontrola jawnie wymienia przyszłe testy `tests/acceptance/Txx.test.ts`, których brak jest oczekiwany przed implementacją. **Brak testu przy odbiorze konkretnej karty powoduje FAIL.** Ogólne testy pakietu nie zastępują tego odbioru.

Testy domenowe obejmują m.in. przerwę w publikacjach, niepełny i stary feed, brak potwierdzenia najnowszego posta, niedostateczny baseline, cytaty nieobecne w źródłach, cudzą organizację, zmianę treści po akceptacji, brak powodu decyzji oraz blokadę handlowego wykorzystania pakietu bez wykazanej poprawy.

## Prawdziwe modele w native Open Mercato

[Instrukcja uruchomienia](../eval/native/README.md) opisuje zależności, wejścia, koszt i zapis wyników. Źródła firm w tej ewaluacji są syntetyczne. Model i runtime są rzeczywiste; model nie widzi referencyjnej odpowiedzi fixture.

Pierwszy przebieg uzyskał 12/18 formalnych zaliczeń, drugi 15/18. Zachowaliśmy oba raporty (`native-v1.json`, `native-v2.json`). Nie przepisujemy historii po poprawce instrukcji ani kontraktu. Testy mocniejszego modelu i pojedynczej naprawy mają własne raporty, hashe pakietu oraz identyfikatory przebiegów. Zmiana modelu nie wyłącza kontroli jakości.

Wykryte problemy obejmowały: cytaty nieobecne w źródle, dopisanie narzędzi do informacji o materiałach, uogólnienie jednej opinii na wszystkich odbiorców, przeniesienie uwagi badacza do posta i cenę w wolnym tekście mimo roboczej oferty. To przydatny wynik ewaluacji: developer dostaje konkretne przypadki regresyjne i miejsce zatrzymania procesu.

**Zmiana procesu po ewaluacji:** `proof_writer` nadal dopisywał nieprawdziwe uzasadnienia po jednej naprawie. W P0 pakiet P11 składa kod z zatwierdzonych obserwacji, dokładnego tekstu posta i dozwolonej ceny. Model może przygotować opcjonalną notatkę do ręcznego przeglądu; jego wynik nie zasila samodzielnie materiału dla klienta. Helper jest osobno testowany. Historyczny wynik modelu pozostaje niezaliczony — nie zastępujemy go treścią wygenerowaną przez kod w raporcie native.

Naprawy działają na trzech poziomach:

1. `inspectAgentInput` zatrzymuje model, jeśli brak podstawowego materiału lub tożsamość jest nierozstrzygnięta.
2. `validateAgentOutput` odrzuca naruszenia kontraktów, dowodów, cen i uprawnień do materiału handlowego.
3. Ocena semantyczna oraz człowiek wychwytują nadinterpretacje, których schema nie rozstrzygnie. Jedna naprawa dostaje konkretną uwagę i tworzy nowy native run. Kolejny błąd oznacza `needs_human`.

Cały obecny przegląd wykonali agenci AI; nie przedstawiamy go jako certyfikacji przez człowieka. W docelowym procesie zatwierdzenie przez operatora nadal jest obowiązkowe.

Każda rola została uruchomiona osobno. Nie traktujemy zbioru prób na różnych wersjach promptów jako jednego końcowego przebiegu 18/18. **Wynik końcowy: 9/9 ról uruchomionych w native runtime; 8/9 ma zaakceptowany semantycznie zwykły przykład po celowanych próbach. Z 18 najnowszych zapisanych przypadków 14 przyjęto, a 4 pozostają `needs_human`.** Offline wszystkie 18 przechodzą aktualną walidację formalną; to nie nowy pełny przebieg native. Wykonano 49 przebiegów ról i 28 ocen syntetycznego recenzenta, z szacowanym kosztem tokenów 1,31 USD. Dokładny stan jest w [raporcie native](../eval/native/REPORT.md) i [zestawieniu maszynowym](../evidence/native-summary.json). `AgentRun.status=ok` nigdy samodzielnie nie zwalnia materiału dla klienta.

Testowa baza to PGlite PostgreSQL przez protokół PostgreSQL, z rzeczywistym MikroORM. Kontrolowany kontekst rejestru, zakres organizacji i KMS noop są udokumentowane w harnessie. Nie zbadano generatora pełnego rejestru hosta, sesji, tenantowego RBAC przez HTTP, rzeczywistych adapterów social media ani workers. Docker nie był dostępny w tym środowisku. Te bramki mają karty T01, T03, T24 i T25.

## Syntetyczny sędzia procesu

Pierwszy niezależny review zakończył się **FAIL** i wskazał pięć blokerów. Zachowany [raport v1](../evidence/process-review-v1.md) dotyczy wcześniejszej wersji, nie końcowego werdyktu. Poprawki objęły enumy decyzji, roboczą ofertę, kontrakt wznowienia, sezonowość i wygraną oryginału. Drugi przegląd odkrył luki na styku opisu i schematów: ścieżkę bez oryginału, adapter oferty, pola dopasowania i blokadę treści handlowej. Powstały rzeczywiste poprawki i regresje, nie wyłącznie redakcyjne odpowiedzi recenzentowi.

[Przegląd v3](../evidence/process-review-v3.md) przyznał `ready_for_development`; [końcowe uzupełnienie](../evidence/process-review-v3-addendum.md) obejmuje deterministyczne składanie P11. Ocena czytelności i kompletności **nie potwierdza chęci zakupu**. Rozmowy, akceptacja zakresu/ceny i płatny pilotaż są oddzielnym eksperymentem T34.

## Cezar: wykonanie i kontrola odbioru

[Raport upstream](../evidence/cezar-upstream.json) i [niezależny przegląd](../evidence/cezar-forward-review.md) pokazują zakres testów. Oryginalny parser przyjął workflow; mock wykonał kroki w osobnym worktree. Projektowy gate prawidłowo odrzucił fikcyjne wykonanie bez wymaganych dowodów.

Wykryto i usunięto dwa blokery: nadpisywanie RunStore przez wiele niezależnych procesów oraz zbyt wąskie rozpoznawanie własności plików w folderach. Launcher korzysta z jednego cockpit i jego API; zależności zwalnia dopiero przyjęty, scalony commit. Rzeczywisty provider agenta kodującego, logowanie CLI i przesłanie zadania przez działający cockpit wymagają środowiska developera.

## Warunek zakończenia hackathonu

Repo jest punktem startowym, a karty mają status `todo`. P0 jest gotowe dopiero po dowodach T24–T26: pojedyncze role w pełnym hoście, scope, działający panel i lokalny eksport. Testowanie przepływów między krokami nie było warunkiem obecnej ewaluacji; pozostaje częścią implementacji i odbioru aplikacji. Nie oznaczamy przyszłych kart jako wykonanych na podstawie tej specyfikacji.
