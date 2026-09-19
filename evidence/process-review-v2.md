# Niezależny syntetyczny przegląd procesu — v2

**Werdykt: FAIL dla kompletnej, jednoznacznej specyfikacji; istotna poprawa względem v1.** Zamknięto enum decyzji, interpretację sezonowości i ograniczenie współdzielonej domeny. Nadal istnieją materialne rozjazdy kontraktów: zewnętrzny draft może przejść walidację przy roboczej ofercie lub przegranej próbce, a ścieżka nowego posta bez oryginału nie ma zgodnego wejścia P11/P13. Braków nie zastępuje średnia ocen.

Proces jest sensownym projektem preprocesu prowadzącego do rozmowy/płatnego pilota. **Nie jest jeszcze dowodem gotowości działającego produktu ani gotowości klienta do zapłaty.**

## Zakres i stan

Ponowny **semantic/process tabletop review**, z dodatkowym statycznym przeczytaniem kontraktów Zod. Nie uruchamiano aplikacji, testów, modeli, API ani providerów. Przykłady przepuszczenia walidacji poniżej wynikają z analizy warunków w kodzie, nie z wykonanego testu. Nie implementowano poprawek. Niezależny drugi recenzent sprawdził docs05/06 i oba kontrakty; potwierdził R1, R2 oraz problem powodu decyzji w R3.

Odczyt: **2026-09-19T04:27:13Z–04:28:38Z** według czasu środowiska. Raport dotyczy tego stanu; późniejsze równoległe zmiany wymagają oddzielnego addendum. Przeczytano docs01,02,04,05,06 oraz `contracts/domain.ts` i `contracts/agents.ts`; dwa ostatnie są re-exportami, więc oceniono faktyczne źródła w module. Backlog03/07 pozostaje poza werdyktem, zgodnie ze zleceniem.

| Plik | SHA-256 stanu ocenionego |
|---|---|
| `docs/01-PROCESS.md` | `eefa3784644c218026b45018da93678ac061dd1cbd14ea75a73151aabc6e62f9` |
| `docs/02-SKILL-MAP.md` | `25e1cbe80c8c9ac4bf4c64180ca7921d206f286b32196343aad3c68cd2461e6c` |
| `docs/04-ARCHITECTURE.md` | `a4d90d94fe6a077ae0b6f007e6ce0545ebd2767fd8d1633ffcc62ffef9c5b1f1` |
| `docs/05-AGENTS.md` | `ece5a20736020e77af1c5cb2d8df15293946dcb75fed0540b3d1adf0582a3bc0` |
| `docs/06-UI-AND-OPERATIONS.md` | `b089b703e4a6c74cd6c04ea1a2574f6d2ea18b4e37b671c1327f18c0990e7bb5` |
| `modules/acquisition/contracts/domain.ts` | `5a9a0f32d8b8042d8de8f15c774d5b60377836fc33a2b0bfca1412f05bf501a8` |
| `modules/acquisition/contracts/agents.ts` | `916e522b416148f42eec9457c83724728e7bb80c3717b4cc29fb5f853189619c` |

## Rozstrzygnięcie uwag v1

| ID v1 | Stan v2 | Dowód i ograniczenie |
|---|---|---|
| B1 — enum review | **Zamknięty w zakresie enumu** | P12, docs04 §5, docs06 U3 i approvalSchema używają approve/revise/discard/hold. Pozostały wymagane dane tych akcji i wznowienie hold: R3. |
| B2 — proposal/internal/komercyjny handoff | **Częściowo zamknięty** | P11–P14 mają jawne internal_review vs sales_conversation; domain.handoffSchema blokuje commercial przy proposal. Validator agentowego MessageDraft nadal pozwala ominąć gate: R1. |
| B3 — resolution/resume | **Częściowo zamknięty** | Doszły `/identity`, `/resume`, nativeUserTaskId i wznowienie tej samej WorkflowInstance. Nie opisano kompletnego powrotu z operator hold ani celu revise: R3. |
| B4 — expected_pause | **Zamknięty semantycznie** | P05 i docs04 §6: udokumentowany sezon daje cadenceProblem=false; niezależny contentProblem; brak obu → not_fit; niejasność → missing_context/needs_context. Wymaga implementacji mapowania aliasów, nie ponownego projektowania reguły. |
| B5 — quality pass/original-wins | **Częściowo zamknięty** | Rubryka 0–4 i releaseEligible są zgodne; tie/original-wins mają brak claimu o poprawie i commercialReadiness=false. Brakuje wspólnej reprezentacji no-original/none_pass oraz walidacji draftu: R1–R2. |
| I1 — shared-domain dedup | **Zamknięty przez ograniczenie MVP** | P03 i docs04 §6 jawnie wyłączają rozdzielanie oddziałów/franczyz na wspólnej domenie z automatycznej ścieżki. Nie trzeba budować nowego entity resolution. |

## Pozostałe blokery i konkretne poprawki

### R1 — MessageDraft może ominąć zakaz komunikacji zewnętrznej

**Typ: sprzeczność deklarowanego kontraktu z walidatorem. Bloker P0 specyfikacji gate.**

Źródła: `docs/01-PROCESS.md`, P13 i tabela przypadków; `docs/05-AGENTS.md`, „Wewnętrzne demo a gotowość komercyjna”; `modules/acquisition/contracts/agents.ts`, gałąź `validateAgentOutput` dla `handoff_writer`.

Dokumenty wymagają zatwierdzonej oferty i wyniku new_wins dla zewnętrznego draftu. Kod sprawdza te warunki tylko wtedy, gdy model ustawi `data.commercialReadiness=true`. Dla samego `messageDraft !== null` sprawdza tryb commercial, materialApproved, contactEligibility i obecność kanału, ale nie ofertę ani wynik porównania.

Statyczny kontrprzykład: wejście `mode=commercial`, `comparisonStatus=original_wins`, oferta `approval=draft`, `materialApproved=true`, `contactEligibility=approved`, kanał email; wyjście zawiera tekst `messageDraft` i `commercialReadiness=false`. Warunki walidatora dotyczące draftu nie zgłoszą naruszenia. `sendAuthorized=false` chroni przed wysłaniem narzędziem, ale nie naprawia niespójnego kontraktu przygotowania draftu.

**Poprawka:** dla każdego niepustego MessageDraft egzekwować pełną bramkę oferty, porównania i akceptacji, niezależnie od deklaracji commercialReadiness. Najlepiej użyć jednej funkcji polityki zamiast dwóch niejednakowych zestawów warunków.

Dodatkowy rozjazd do rozstrzygnięcia w tej samej korekcie: docs04 §8 mówi „wynik inny niż new_wins […] bez ceny”. `proof_writer` może dziś zwrócić cenę zgodną z approved offer przy original_wins i commercialReadiness=false. Należy albo usunąć cenę z każdego takiego pakietu, albo świadomie skorygować normatywną zasadę dokumentacji. Samo to, że cena istnieje w zatwierdzonej ofercie, nie rozstrzyga miejsca jej prezentacji.

**AC:** proposal/tie/original_wins/none_pass/not_comparable nigdy nie tworzą zewnętrznego MessageDraft; wewnętrzna notka nadal działa; jedna wspólna polityka reguluje dopuszczenie ceny i draftu.

### R2 — Nowy post bez oryginału nie ma zgodnej ścieżki P10 → P11 → P13

**Typ: sprzeczne enumy i nieistniejące przejście. Bloker P0 kompletności procesu.**

Źródła: `docs/01-PROCESS.md`, P08 i P10; `docs/05-AGENTS.md`, „Wspólny sędzia jakości”; `modules/acquisition/contracts/agents.ts`, input `proof_writer`/`handoff_writer`; `modules/acquisition/contracts/domain.ts`, `handoffSchema.comparisonStatus`.

P08/P10 celowo dopuszczają nowy materiał przy przerwie publikacji i ocenę absolutną bez oryginału. Domena ma `not_comparable`, ale oba downstream agenty akceptują wyłącznie `new_wins`, `original_wins`, `tie`, `none_pass`. `not_comparable` nie przechodzi schematu ich wejścia. Nie wolno zastąpić go `none_pass`, ponieważ nowy post może spełniać kryteria absolutne. W odwrotną stronę agentowe `none_pass` nie występuje w domenowym handoffSchema.

Dodatkowo docs05 dopuszcza „pakiet do wewnętrznego przeglądu” dla none_pass, podczas gdy P11 i docs06 wymagają quality pass przed gotowym pakietem/approve. Należy rozróżnić wewnętrzny raport nieudanej próby od ProofPack z zaakceptowanym postem albo wskazać, gdzie none_pass kończy przepływ.

**Poprawka:** jeden kanoniczny enum oraz tabela przypadków: new_wins, tie, original_wins, no-original, none-pass → rodzaj artefaktu, quality status, dozwolony cel, improvementClaim. W P0 można uczciwie ograniczyć no-original do wewnętrznego pakietu bez twierdzenia o przewadze; nie trzeba dopuszczać go do handlu. Musi jednak istnieć poprawne wejście obu agentów albo jawna ścieżka omijająca je.

**AC:** dobry post bez oryginału może przejść do zadeklarowanego wewnętrznego wyniku bez fałszywego porównania; none_pass nie udaje quality pass; żaden legalny stan procesu nie wymaga wymyślenia nowej wartości enumu przez implementatora.

### R3 — Review/resume nadal nie przenosi wszystkich wymaganych danych

**Typ: brak kontraktu działania, a nie ponowny problem enumu. Bloker P1 pełnej obsługi operatora.**

Źródła: `docs/01-PROCESS.md`, P12; `docs/06-UI-AND-OPERATIONS.md`, U3; `modules/acquisition/contracts/domain.ts`, `approvalSchema`; `docs/04-ARCHITECTURE.md`, `/review`, `/resume`, §6.

- Dokumenty wymagają powodu revise/hold/discard; approvalSchema dopuszcza brak `reason` i pusty string dla każdej akcji.
- P12 mówi revise → wybrany etap, ale `/review` i approvalSchema nie mają pola etapu; powód nie powinien być parsowany jako ukryta komenda. Alternatywnie MVP może jawnie zawsze wracać do P09.
- `/resume` dopuszcza identity_resolved/context_added/source_replaced/budget_extended. Operator hold pozostawia otwartą sprawę, lecz brak jawnego polecenia odłożono→ponowny review i sposobu ponownego otwarcia jego UserTask. Trzeba ustalić, czy hold kończy UserTask i tworzy nowy, czy pozostawia oczekiwanie.

**Poprawka:** niepusty reason zależny od akcji; pole reviseTargetStep albo stały cel P09; jawny hold-release w tej samej natywnej instancji z zachowaniem hasha i aktualnych gates. Dodatkowe API nie jest wymagane, jeśli istniejąca komenda zostanie jednoznacznie rozszerzona.

**AC:** każdą akcję da się odtworzyć po odświeżeniu; powód jest trwały; revise ma jeden cel; hold można legalnie wznowić bez tworzenia drugiej instancji lub obchodzenia akceptacji.

### R4 — Wymagany CommercialFit i wynik agenta opisują różne informacje

**Typ: brak normatywnego mapowania domena ↔ agent. Bloker P1 handoff dla zespołu developerskiego.**

Źródła: `docs/01-PROCESS.md`, „Model oferty” oraz P06; `docs/05-AGENTS.md`, tabela roli fit_reviewer; `modules/acquisition/contracts/agents.ts`, output `fit_reviewer`.

Proces wymaga oddzielnych serviceFit, deliveryFeasible, repeatableNeed, budgetFit, purchaseIntent, a gate PoC zależy od dwóch pierwszych = yes. Agent zwraca jeden `decision=fit|not_fit|unknown`, reasons, buyerNeed, willingnessToPay='unverified' i nextAction. Wynik `fit` nie pozwala odtworzyć pięciu niezależnych pól bez dodatkowej interpretacji. Nie wskazano, kto tworzy te pola lub jak zmiana jednego wpływa na gate.

**Poprawka:** albo dodać wymagane pola do wyniku i walidować warunki gate, albo uprościć normatywny proces do faktycznego kontraktu P0, jawnie pozostawiając budżet/intencję/regularność potrzeb jako niepotwierdzone dane. Nie dopisywać drugiego „kwalifikatora”.

Podobne różnice nazw są rozwiązywalne adapterem i same nie są blockerem: `offer.approval=draft` → domenowe `offer.status=proposal`; wersja oferty pochodzi z manifestu hosta; `purpose` → `requestedNextStep`; quality `evaluations` → domenowy review. Dla czytelności devów warto spisać te mapowania w jednej tabeli, żeby nie traktować modeli konceptualnych P01–P15 jako dosłownych DTO.

**AC:** developer potrafi wskazać źródło każdego pola decydującego o wejściu do PoC; `decision=fit` nie przykrywa serviceFit=no; intencja/budżet nie stają się potwierdzone przez domniemanie.

## Powtórzone i rozszerzone scenariusze

PASS-SCOPED oznacza tylko poprawność wymienionego zachowania w semantycznym przeglądzie. Nie oznacza testu wykonania.

| Scenariusz | Wynik v2 |
|---|---|
| Zwykła firma, znany problem, approved offer, new_wins | Nominalna sekwencja ma czytelny cel. Nie przyznaję pełnego PASS, ponieważ R4 pozostawia wymagane pola kwalifikacji bez źródła i bramka draftu jest niespójna R1. |
| Brak danych / timeout | PASS-SCOPED: unknown i stop; dodane identity/resume zachowują tę samą instancję. Implementacja zapisu materiału rozstrzygającego pozostaje zadaniem developerskim. |
| Sezonowa przerwa, brak innego problemu | PASS-SCOPED: cadenceProblem=false, contentProblem=false → not_fit, bez PoC na samej przerwie. |
| Stare portfolio | PASS-SCOPED: seed jest dopuszczalny, aktualna relacja pozostaje unverified; brak wnioskowania o aktualnym kontrakcie/cenie. |
| Dobry oryginał przy P05 | PASS-SCOPED: brak obserwowanego problemu może zakończyć sprawę bez próbki. |
| Oryginał wygrywa po P10 | Częściowa poprawa: brak claimu o przewadze i internal packet. FAIL pełnego gate, bo MessageDraft może przejść przy commercialReadiness=false (R1). |
| Oferta tylko draft/proposal | Wewnętrzna ścieżka jest jawna; domenowy commercial handoff jest zablokowany. FAIL pełnej zgodności, bo MessageDraft ma lukę R1. |
| Dobry nowy post, brak oryginału | FAIL: not_comparable jest odrzucane przez wejścia P11/P13 (R2). |
| Żaden wariant nie spełnia releaseEligible | Fail/stop jakości jest właściwy, ale dalszy „wewnętrzny pakiet” nie ma zgodnej semantyki między docs01, docs05 i domain (R2). |
| Operator revise, potem hold i powrót | FAIL pełnej ścieżki: brak celu revise i release z hold; walidator dopuszcza brak powodu (R3). |
| Dwie firmy/oddziały na wspólnej domenie | PASS-SCOPED jako jawnie wyłączony przypadek automatycznego MVP, bez fałszywego scalenia. |
| Edycja po approve i powtórne kliknięcie handoff | PASS-SCOPED dla opisanego version/hash/idempotency invariant; nie sprawdzano runtime. |

## Gotowość do sensownego płatnego pilota

**Dobry kierunek, gotowość uruchomienia niepotwierdzona.** Łańcuch wartości jest czytelny: obserwowalny problem → przydatna próbka → zakres dalszej usługi → wkład klienta. Wynik jest użyteczny dla sprzedaży, jeśli nie wymaga ponownego researchu i zachowuje ograniczenia danych. To rozsądna hipoteza, którą można sprawdzić z klientami; syntetyczna ocena jakości nie zastępuje sprawdzenia jej wartości.

Minimalne warunki uruchomienia prawdziwego pilota poza samym demo:

1. Istniejąca, zatwierdzona konkretna oferta: zakres, cena, wejścia klienta, timebox i warunki odbioru. Historia 2500 PLN/12 tematów jest nadal propozycją; recenzent nie zatwierdza jej w imieniu właściciela.
2. Realny właściciel przejmuje pakiet, zna braki i rejestruje faktyczne rozmowy/zamówienie w istniejącej obsłudze. Lokalny export jest poprawnym wynikiem demo, ale sam nie jest przyjęciem przez sprzedaż ani zakupem.
3. Technicznie sprawdzone gates i minimum jedno działające przejście w hostowym OM z powtarzalnym zapisem decyzji. W tym przeglądzie tego nie testowano; kod kontraktu nie dowodzi UI lub workflow.
4. Przed pierwszą płatną realizacją właściciel ustala, jaki wynik sprawdza pilot i jaki nakład/koszt jest akceptowalny. Dokumenty wymieniają właściwe miary, lecz nie ma dowodu ich wyniku ani zatwierdzonego progu ekonomiki. Nie trzeba do tego dodawać scoringu klientów.

To warunki rzeczywistego działania, nie prośba o rozszerzenie hackathonu o umowy, billing lub automatyczny outreach. Mały pilot może korzystać z ręcznej sprzedaży/obsługi poza modułem.

## Czytelność dla devów oraz zweryfikowane vs przyszłe

Oceny 1–5 bez średniej:

| Kryterium | Ocena | Komentarz |
|---|---:|---|
| Cel i ownership | 4 | Dziewięć ról ma czytelne granice; trzy ekrany skupiają użytkownika na sprawie. |
| Jednoznaczność kontraktów | 3 | Enum review i pauzy poprawione; R1–R4 nadal wymagają rozstrzygnięcia przed niezależną implementacją. |
| Wyjątki i uczciwość danych | 4 | Sezon, portfolio, unknown, source errors i shared domain opisane odpowiedzialnie. |
| Rzetelność porównania jakości | 4 | Wspólna rubryka, faktografia jako hard gate i prawo oryginału do wygranej. Brak no-original mapping pozostaje materialny. |
| Reason-to-pay jako hipoteza | 4 | Konkretny rezultat i rola wkładu klienta; brak pozornego potwierdzania intencji zakupowej. |
| Rozróżnienie dowodów i planu | 4 | Docs05 wyraźnie oddziela kontrakt, native agent i produkt oraz podpisuje pseudokod jako niegotowy adapter. Odesłanie do raportu runtime wymaga dostępnego raportu. |
| Realność harmonogramu | 3 | Zakres nadal ograniczony; 34,5 h wymaga potwierdzenia w kończonym backlogu, którego ta runda nie zatwierdza. |

Doc05 jasno opisuje, które funkcje adaptera są obowiązkami do wdrożenia, oraz że pojedyncze native runs nie dowodzą produktu. Doc06 zabrania prezentowania fixture jako aktualnego live runu. To właściwe rozróżnienie. Nagłówek „Elementy działające w MVP” w docs01 warto zmienić na „Zakres do uruchomienia w MVP”, bo reszta dokumentacji opisuje stan docelowy. Docs04 odsyła do `09-VALIDATION.md`; w momencie odczytu pliku nie było jeszcze na liście docs. Brak należy uzupełnić przed dostarczeniem kompletu, a nie wywodzić z niego domyślnego test PASS.

Dodatkowe doprecyzowanie, nie nowy blocker: proces opisuje heurystykę minimum 4 postów/90 dni, a cadencePolicySchema ma domyślnie minBaselinePosts=6 oraz maxSourceAgeDays=7. Ustalić jedną konfigurację demonstracyjną albo jawnie zaznaczyć, że proces pokazuje wariant, a konkretne parametry pochodzą z wersjonowanej polityki kampanii.

## Kontrola willingness-to-pay

**Nie znaleziono twierdzenia, że syntetyczny judge dowodzi gotowości zapłaty.** Przeciwnie:

- `docs/01-PROCESS.md`, cel: „syntetyczny sędzia ocenia artefakty, nie popyt”; rozmowa/płatny pilot sprawdza gotowość zapłaty.
- `modules/acquisition/contracts/agents.ts`: `fit_reviewer.willingnessToPay` to literal `'unverified'`.
- `docs/05-AGENTS.md`: kontrakt i pojedynczy native run nie dowodzą gotowości klientów do zapłaty ani skuteczności sprzedaży.
- `docs/06-UI-AND-OPERATIONS.md`: export nie jest „klient pozyskany”.

Ta zgodność zasługuje na utrzymanie w pitchu i raporcie. Nie oznacza walidacji ceny, popytu czy marży.

## Następny warunek werdyktu

Po poprawkach R1–R4 wymagany jest krótki przegląd różnic i powtórzenie odpowiednich kontrprzykładów, z nowym timestamp/hash. Dla semantic PASS wystarczy zamknąć politykę i przejścia; nie należy nazywać tego runtime PASS. Przy publikacji zestawu potrzebne jest również uczciwe uzupełnienie raportu walidacji i kończonego backlogu.
