# Wynik ewaluacji native Open Mercato

**Status: gotowe do implementacji, bez kwalifikacji do wydawania treści automatycznie.** Wszystkie 9 ról uruchomiono w rzeczywistym, niemodyfikowanym NativeAgentRunner Open Mercato 0.8.0 z modelem przez OpenRouter i zapisem SQL. Po celowanych poprawkach i najwyżej jednej naprawie semantycznej danego przypadku 8 z 9 ról ma poprawny przykład zwykłego zadania. `proof_writer` nadal wymaga interwencji. Wyników z różnych prób nie przedstawiamy jako nowego pełnego przebiegu 18/18.

W ponownej walidacji najnowszych zapisanych wyników 18/18 przechodzi aktualny kontrakt strukturalny i walidację powiązań. Ocena semantyczna nadzorującego agenta przyjmuje 14/18 konkretnych wyników; 4 pozostają `needs_human`. Łącznie wykonano 49 przebiegów ról i 28 ocen syntetycznego recenzenta; oszacowany koszt tokenów wyniósł 1,312 USD (osobny krótki smoke nie jest w tej sumie). Te liczby mierzą różne rzeczy. Zakończony runtime i poprawny JSON nie dowodzą jakości tekstu.

## Co naprawdę uruchomiono

`AgentRuntimeService → NativeAgentRunner → runAiAgentObject → OpenRouter`; prawdziwy MikroORM 7.1.14 i upstream CommandBus. AgentRun, AgentGuardrailCheck oraz AgentSpan zapisano w PGlite PostgreSQL 18.3 WASM przez protokół PostgreSQL. Nie użyto mocka modelu ani ORM. Zależności platformy pobrano z npm; kod enterprise nie został skopiowany do repo.

To test developerski dozwolony w ramach licencji ewaluacyjnej pakietu enterprise. Nie jest uruchomieniem hosta Next.js ani dowodem działania całego workflow, autoryzacji HTTP, generatora rejestru, connectorów danych czy zwykłego PostgreSQL pod obciążeniem. Rejestr agentów podano przez oficjalny hook testowy; RBAC jest kontrolowanym kontekstem fixture. Dane są syntetyczne, szyfrowanie nie było badane, zdarzenia odbiera testowy sink. Szczegóły i komendy: [README](README.md).

## Ślad prób

| Raport w `evidence/` | Co sprawdza | Wynik formalny |
|---|---|---|
| `native-v1.json` | Pierwszy pełny przebieg 9 ról × 2 przypadki | 12/18 |
| `native-v2.json` | Pełny przebieg po doprecyzowaniu kontraktów | 15/18 |
| `native-model-retest.json` | Mocniejszy model, 3 konkretne porażki v2 | 3/3; post nadal odrzucony semantycznie |
| `native-final-retest.json` | Mocniejszy model: signal, audience, brief, post | 4/4; brief/post wymagały korekty semantycznej |
| `native-repair-final.json` | Jedna naprawa signal, brief, post na podstawie feedbacku | 3/3; zaakceptowane semantycznie |
| `native-repair-remaining.json` | Jedna naprawa search, proof, handoff | 3/3; proof nadal odrzucony semantycznie |
| `native-input-gate.json` | Preflight: brak źródła, błędny cytat i failed fetch | 4/4; zero wywołań modelu |
| `native-p11-host-gate.json` | Deterministyczne składanie P11 z zatwierdzonych części | 3/3; zero wywołań modelu |

Model bazowy: `openai/gpt-4.1-mini`. Mocniejsze próby i naprawy: `anthropic/claude-sonnet-5`. Model nie dostał `referenceOutput`; naprawa dostała oryginalne wejście, rzeczywisty poprzedni wynik i konkretną uwagę recenzenta. Raport zawiera oba run IDs. Nie poprawiano tekstu wyniku ręcznie. Naprawa jest osobną definicją ewaluacyjną native z tymi samymi instrukcjami roli, skillami i schematem oraz instrukcją obsługi envelope naprawy; produkcyjny adapter pozostaje zadaniem implementacyjnym.

## Ostateczna dyspozycja

| Rola | Zwykły przypadek | Trudny przypadek |
|---|---|---|
| search_planner | Przyjęty po jednej naprawie | `needs_human`: myli efekt usługi z kryterium wyszukiwania |
| signal_auditor | Przyjęty po jednej naprawie | Poprawnie rozpoznaje brak danych |
| fit_reviewer | Przyjęty; drobne poprawki językowe | Poprawnie blokuje niezatwierdzoną ofertę |
| audience_researcher | Przyjęty po zmianie modelu | Poprawnie wskazuje brak dowodów |
| brief_writer | Przyjęty po jednej naprawie | Poprawnie blokuje niezweryfikowaną tożsamość |
| post_writer | Przyjęty po jednej naprawie | Poprawnie odmawia bez wymaganego źródła; host blokuje też przed modelem |
| quality_judge | Poprawnie porównuje anonimowe warianty | Poprawnie odrzuca procent i gwarancję bez źródła |
| proof_writer | `needs_human` mimo jednej naprawy | `needs_human`: cena robocza w wolnym tekście |
| handoff_writer | Przyjęty po jednej naprawie; szkic nadal podlega człowiekowi | Wysyłka zablokowana prawidłowo, ale podsumowanie wymaga korekty |

Przyjęcie oznacza poprawny wynik tego syntetycznego kroku, nie zgodę na publikację ani ogólną niezawodność roli. Angielskie opisy części wyników operacyjnych wymagają lokalizacji przed odbiorem polskiego interfejsu.

Najważniejsza pozostała porażka P11 jest mierzalna: wejście zawiera jeden finding `f1`, a naprawiony model tworzy trzy nowe obserwacje. Twierdzi też, że próbka jest krótsza, chociaż ma 143 znaki wobec 128 znaków źródłowego posta, oraz że poprzedni tekst nie miał CTA, chociaż zawierał „Dołącz do nas!”. Powtórnej naprawy nie uruchomiono.

Wynik uzasadnia zmianę architektury P11: host składa zatwierdzone obserwacje, post i dozwoloną cenę deterministycznie; model może zaproponować uwagi podlegające review. Helper `buildProofPack` jest już zaimplementowany w `modules/acquisition/contracts/agent-host-adapter.ts`. Trzy niezależnie uruchomione testy lokalne przeszły: dokładne kopie i snapshot, blokada ceny bez uprawnionego porównania/oferty oraz diagnostyka przy nieudanej jakości. Raport `native-p11-host-gate.json` jest odrębnym dowodem. Nie zmienia nieudanego native wyniku proof_writer w PASS.

## Sędzia też bywa błędny

Niezależny syntetyczny recenzent oceniał rzeczywiste odpowiedzi bez dostępu do wzorców. Raporty `native-judge-*.json` zachowują jego głosy, cytaty i uzasadnienia. `native-adjudication.json` zawiera osobną ocenę nadzorującego agenta, przypisaną do dokładnego run ID; nie jest to certyfikacja człowieka.

Krytyk v2 mylnie potraktował cenę zatwierdzonej oferty jak cenę roboczą, a hipotezę zawartą w zapytaniu wyszukiwarki jak twierdzenie o konkretnej firmie. Jednocześnie skalibrowany krytyk przeoczył rozszerzenie „materiały i wypał” do „wszystko potrzebne” oraz zaniżył znaczenie dopisanej „spokojnej atmosfery”. Nadzorujący agent zawetował te wyniki i zlecił pojedynczą udokumentowaną naprawę. Ostatni sędzia również uznał naprawiony proof za PASS, ale nadzorujący agent utrzymał `needs_human` wobec nowych obserwacji i mierzalnie błędnego porównania długości. Nie obniżono progu jakości po to, aby uzyskać PASS.

## Polityka dla implementacji

1. `inspectAgentInput` przed tokenami; brak wymaganego źródła kieruje do operatora.
2. Native runtime i zapis surowego śladu.
3. Walidacja schematu, scope oraz źródeł przed zapisem domenowym i przejściem kroku.
4. Semantyczna ocena i najwyżej jedna naprawa z konkretnym feedbackiem, bez odpowiedzi wzorcowej.
5. Nadal błędny lub niejednoznaczny wynik: `needs_human`. Człowiek zatwierdza materiał przed użyciem zewnętrznym.

Domyślna konfiguracja demonstracyjna: OpenRouter + `anthropic/claude-sonnet-5`, bez cichego fallbacku do mini. To wybór jakościowy wynikający z testu, nie kwalifikacja produkcyjna. Każda zmiana modelu/promptu wymaga regresji na właściwych przypadkach. Źródłem końcowych liczników, kosztów, hashy wejść i wyników ponownej walidacji jest [native-summary.json](../../evidence/native-summary.json).
