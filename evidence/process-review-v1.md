# Niezależny syntetyczny przegląd procesu — v1

**Werdykt: FAIL dla gotowości specyfikacji do jednoznacznego wdrożenia; wartościowy i spójny kierunek produktu.** Brakuje zamkniętych ścieżek wyjątków i zgodnego kontraktu decyzji/przekazania. Tych braków nie kompensuje średnia ocen. Nie jest to ocena działania aplikacji ani potwierdzenie popytu.

## Zakres i identyfikacja badanego stanu

Rodzaj badania: **semantic/process tabletop review**. Niezależny sędzia czyta specyfikację i ręcznie przechodzi scenariusze, bez uruchamiania workflow, agentów, UI, API lub płatnych providerów. Nie wykonano testu runtime, testu integracyjnego OM ani rozmowy z klientem. Nie zmieniono specyfikacji.

Stan odczytany **2026-09-19T04:09:19Z**, według czasu środowiska. Autorzy mogą równolegle zmieniać pliki; ten raport odnosi się do poniższych treści/hashów, a nie do późniejszego stanu HEAD.

| Dokument | SHA-256 |
|---|---|
| `docs/01-PROCESS.md` | `797aba9b95ffda22744e12753dfbba0bd6912bc16e4adbf2e7e09308114996ba` |
| `docs/02-SKILL-MAP.md` | `25e1cbe80c8c9ac4bf4c64180ca7921d206f286b32196343aad3c68cd2461e6c` |
| `docs/04-ARCHITECTURE.md` | `792ec4e44499df7d79af8c06687460b51c6a3d3267f50262cd39b9ffcfcd669d` |

Nie było potrzeby korzystania z wcześniejszej propozycji w `research/process-proposal.md`. Kanoniczny proces ma pierwszeństwo przed inspiracjami. Innych dokumentów, przyszłego backlogu, kodu i treści upstream skilli ten przegląd nie zatwierdza.

## Kryteria oceny

Skala: 1 = brak/zasadnicza sprzeczność; 2 = istotne luki; 3 = zrozumiałe z niedookreśleniami; 4 = dobre, niewielkie braki; 5 = kompletne w granicach przeglądu. **Nie wyliczam średniej.**

| Kryterium | Ocena 1–5 | Uzasadnienie |
|---|---:|---|
| Czytelność celu i działania operatora | 4 | Dobry ciąg firma → dowody → próbka → decyzja → handoff, trzy ekrany zamiast 15 formularzy. Przy wyjątkach kolejna czynność nie zawsze ma kontrakt. |
| Kompletność wejść i wyjść | 3 | Każdy krok ma input/output i failure; brakuje kanonicznego mapowania stanów, decyzji i zasad wznowienia. |
| Jednoznaczne ownership | 4 | Oddzielenie autora, sędziego, collectora i orkiestratora jest czytelne. „Operator + gate” wymaga ustalonego rozstrzygnięcia w stanach spornych. |
| Spójność kontraktów między procesem a architekturą | 2 | Różne enumy decyzji, sprzeczny warunek dla oferty proposal, brak rozstrzygnięcia celu handoff. |
| Obsługa braków danych i błędów | 3 | Dobre null semantics, bounded retry i odróżnienie błędu od pustego rynku. Bez kontraktu wznowienia nie wszystkie pauzy są obsługiwalne. |
| Rzetelność faktów i niezależność oceny | 4 | Źródła, zakres wniosków, ograniczenia, anonimowe A/B i brak utożsamiania problemu z intencją zakupu. Tie/original-wins wymaga twardej bramki. |
| Powód zakupu i uczciwość komercyjna | 4 | Problem → demonstracja → zakres usługi → wkład klienta jest sensowną hipotezą wartości. Nie ma dowodu gotowości zapłaty i dokument tego nie udaje. |
| Wykonalność w 34,5–36 roboczogodzinach | 3 | Mały intake, fixture/import, jeden post i lokalny export ograniczają zakres. 9 ról, native OM od zera i wszystkie wyjątki pozostają ryzykiem; przydziałów z nieocenionego backlogu nie potwierdzam. |
| Deduplikacja skilli | 4 | Jeden kanoniczny proces i ograniczone adaptacje; reuse copy-editing w diagnozie i QA jest celowym użyciem instrukcji w oddzielnych kontekstach, nie drugim właścicielem stanu. |

## Blokery i poprawki konieczne przed werdyktem PASS

### B1 — Sprzeczny enum decyzji człowieka

- **Typ:** odkryta sprzeczność kontraktu; priorytet P0 specyfikacji.
- **Dowód:** `docs/01-PROCESS.md`, P12: „`approve`, `request_changes`, `reject`, `defer`”. `docs/04-ARCHITECTURE.md`, §5, `POST /candidates/:id/review`: „`approve/revise/discard/hold`”.
- **Skutek:** autor UI i autor endpointu mogą zgodnie z własną kartą zaimplementować niezgodne akcje. Nie wiadomo, czy `discard` jest odrzuceniem sprawy, usunięciem draftu, czy inną decyzją; `hold` nie wskazuje semantyki `deferred`.
- **Minimalna poprawka:** wybrać jeden enum w obu dokumentach albo dodać normatywną tabelę mapowania etykieta UI → wartość API → stan workflow. Wskazać cel `request_changes` i dane potrzebne dla `defer`.
- **AC:** wszystkie cztery decyzje mają dokładnie jeden wynik; nieznana wartość jest odrzucana; decyzja dotyczy wskazanego hasha/revizji. Równoczesna edycja nadal daje conflict.

### B2 — Brak jednoznacznej drogi dla niezatwierdzonej oferty i trybu handoff

- **Typ:** sprzeczność plus brakujące pole/bramka; priorytet P0 specyfikacji.
- **Dowód:** `docs/01-PROCESS.md`, P11 dopuszcza „demo-handoff z `commercialReadiness=false`”; P13 Output dopuszcza `internal_demo`, ale P13 Failure/stop mówi bez wyjątku „brak zatwierdzonej wersji lub wymaganej informacji -> blocked”. `docs/04-ARCHITECTURE.md`, §8 dopuszcza ofertę `unapproved`, a §5 `/handoff` przyjmuje tylko zatwierdzony artefakt/hash, `target` i `requestedNextStep`.
- **Skutek:** jeden implementator zablokuje również legalne wewnętrzne demo, drugi pozwoli wyeksportować ofertę proposal do rzeczywistego wykorzystania, opierając się tylko na akceptacji artefaktu. Samo `target=export` nie odróżnia tych celów.
- **Minimalna poprawka:** jawny purpose/audience, np. `internal_demo` versus `sales_use`, z deterministycznie wyliczaną gotowością. Rozdzielić zatwierdzenie jakości artefaktu od zatwierdzenia oferty. Sprecyzować wyjątek P13 dla internal_demo i brak potrzeby publicznego kanału firmy przy wewnętrznym przekazaniu. `approvedOfferVersion` w aktywacji musi mieć określoną opcjonalność dla research-only.
- **AC:** proposal + dobry post + approve → dozwolony oznaczony export wewnętrzny; próba handlowego użycia → `needs_offer/blocked`; brak wersji oferty w ogóle → dokładnie określony research-only do momentu, w którym oferta staje się konieczna; model nigdy nie uzupełnia ceny.

### B3 — Pauzy mają nazwy, ale nie mają zamkniętego kontraktu rozstrzygnięcia i wznowienia

- **Typ:** odkryty brak ścieżki; priorytet P0 specyfikacji.
- **Dowód:** `docs/01-PROCESS.md`, P03: człowiek rozstrzyga `unknown`, które prowadzi do `needs_identity`. P05/P07 prowadzą do `needs_evidence`; P06 do `paused_budget`. `docs/04-ARCHITECTURE.md`, §5 nie zawiera zapisu decyzji tożsamości ani kontraktu human-resolution; `/run` odrzuca istniejący aktywny run. §6 odkłada pełny graph, mapowanie i legalne przejścia do przyszłej karty.
- **Skutek:** specyfikacja mówi, że człowiek może pomóc, ale nie wskazuje, jak jego decyzja staje się trwałym wejściem OM i jak następuje kontynuacja. Nowy run nie jest automatycznie równoznaczny ze wznowieniem. Import evidence nie rozstrzyga decyzji identity.
- **Minimalna poprawka:** jedna mała tabela pauza → Native UserTask/komenda → wymagane dane → owner → kolejny krok. Jedna uniwersalna, typowana komenda resolution może wystarczyć; nie ma potrzeby budowy osobnego silnika. Ustalić resume starej instancji versus zakończenie i jawny nowy run.
- **AC:** przypadek `needs_identity` można prawidłowo zamknąć pozytywnie lub negatywnie; `needs_evidence` nie rusza bez nowego wejścia; wznowienie jest idempotentne, scoped i przypięte do wersji. Nie omija limitu kosztu ani P12.

### B4 — Sezonowa przerwa nie ma deterministycznego znaczenia biznesowego

- **Typ:** odkryty brak ścieżki, nie sprzeczność danych; priorytet P0 specyfikacji.
- **Dowód:** `docs/01-PROCESS.md`, algorytm sygnałów pkt 4: sezon zmienia interpretację na `expected_pause` „lub wymaga ręcznego review”; tabela przypadków: „expected_pause / review”. P05 udostępnia tylko `problemObserved=yes/no/unknown`, a wejście P06 zależy od obserwowanego problemu. Nie ma mapowania expected_pause na ten wynik.
- **Skutek:** system może uznać samą przerwę poza sezonem za problem albo utknąć w needs_evidence mimo wystarczających danych. Operator nie wie, czy ma akceptować hipotezę, korygować diagnozę czy zakończyć sprawę.
- **Minimalna poprawka:** znany sezon + brak innych problemów → `problemObserved=no`, reason `expected_pause`, terminal `no_observed_problem`. Niejednoznaczna sezonowość → konkretny review task z pytaniem. Niezależny poparty dowodem problem treści może być oceniony oddzielnie, bez używania przerwy jako jego dowodu.
- **AC:** zimowy fixture letniej atrakcji nie wchodzi do PoC wyłącznie z powodu przerwy. Rzeczywiste daty pozostają niezmienione.

### B5 — Preferencja sędziego i „quality pass” nie mają jednej bramki do rzeczywistego pakietu

- **Typ:** luka kontraktu/gate; priorytet P0 specyfikacji.
- **Dowód:** `docs/01-PROCESS.md`, P10 zabrania przedstawiania remisu/wygranej oryginału jako ulepszenia i kieruje do poprawy/manual review lub archiwum wewnętrznego. P11 przyjmuje „draft z quality pass”, ale nie definiuje, czy `accept` i `preference=original` mogą współistnieć i co wtedy następuje. `docs/04-ARCHITECTURE.md`, §5 handoff nie przenosi rozstrzygnięcia poprawy ani celu pakietu.
- **Skutek:** tekst może być dobry absolutnie, ale gorszy od oryginału. Samo `accept` i ludzki approve nie dowodzą ulepszenia. Dwa zespoły mogą zaimplementować inne przejścia.
- **Minimalna poprawka:** zapisać tabelę `verdict × hardFailures × comparisonResult × purpose → nextStep/claimAllowed`. Dla próbki bez oryginału porównanie jest `not_applicable`, a przejście zależy od kryteriów absolutnych. Operator może zmienić strategię, ale nie zmienić wyniku porównania bez nowej oceny.
- **AC:** tie/original-wins nigdy nie trafia automatycznie do pakietu z twierdzeniem o poprawie; hard fail blokuje użycie; brak oryginału nie oznacza ani wygranej, ani porażki porównawczej.

## Inny istotny problem — I1: domena jako wyłączny klucz firmy

**Typ: sprzeczność modelu dla konkretnego przypadku brzegowego; priorytet P1 lub jawne ograniczenie MVP.** `docs/01-PROCESS.md`, P03 wymaga rozdzielania franczyz i oddziałów. `docs/04-ARCHITECTURE.md`, §4 wymusza `unique(tenant_id,organization_id,campaign_id,canonical_domain)`. Dwie odrębne jednostki na wspólnej domenie nie dają się w ten sposób rozdzielić w jednej kampanii.

Minimalnie: jawnie wykluczyć taką strukturę z automatycznej obsługi P0 i zatrzymać do resolution albo użyć stabilnego identityKey, pozostawiając domenę jako sygnał deduplikacji. AC: wspólna domena nie scala faktów dwóch różnych firm. Ten problem nie blokuje demo na jednoznacznych firmach, ale blokuje twierdzenie o pełnej obsłudze zakresu P03.

## Przejścia przez scenariusze

Statusy poniżej opisują wyłącznie badanie semantyczne. PASS-SCOPED oznacza kompletny wynik dla wskazanej ograniczonej ścieżki, nigdy runtime PASS. Przy sprzeczności lub brakującym przejściu nie przyznaję PASS.

| ID i dane wejściowe | Odtworzone kroki i wynik | Ocena |
|---|---|---|
| S1. Zwykła firma usługowa, pewna tożsamość, aktualne źródła, jeden udokumentowany problem, zatwierdzona oferta, dostępny budżet | P01–P06 dopuszczają PoC przy serviceFit/deliveryFeasible=yes. P07–P09 tworzą jeden rzetelny post. P10 accept, porównanie poprawy pozytywne; P11 pack; P12 approve; P13/P14 export. Intencja i budżet klienta pozostają unknown. | **CONDITIONAL/nie PASS całej ścieżki:** kierunek nominalny jest kompletny, ale undefined quality pass i readiness/gate B2/B5 nie pozwalają potwierdzić kontraktu końca. |
| S2. Collector timeout, zero postów | P04 po ograniczonym retry zachowuje błąd source_unavailable; P05 nie może wywnioskować zaniedbania. Stop needs_evidence. Po imporcie źródła brak jawnego resume. | **PASS-SCOPED dla bezpiecznego zatrzymania; FAIL dla ścieżki uzupełnij→wznów** z powodu B3. |
| S3. Letnia atrakcja, aktualnie zima, strona podaje sezon, feed zweryfikowany | Daty wskazują przerwę, ale sezon jest znanym wyjaśnieniem. Algorytm mówi expected_pause/review; brak mapowania do problemObserved i dalszego stanu. | **FAIL**, B4. Nie wolno dopuścić PoC na samej przerwie. |
| S4. Logo firmy w starym portfolio agencji, relacja niepotwierdzona | P02 seed z relationshipStatus=unverified; P03 ustala samą tożsamość. P04–P06 mogą zbadać komunikację niezależnie od historii agencji. Nie powstaje fakt aktualnej umowy, ceny ani budżetu firmy. | **PASS-SCOPED dla intake i interpretacji relacji**. Pełny handoff podlega wspólnym B2/B5. |
| S5. Aktualny oryginalny post jest dobry | Jeśli to jedyny badany problem: P05 no → no_observed_problem, bez wymuszania krytyki i PoC. Jeśli próbka mimo innego problemu powstała: P10 może wskazać original-wins; dalsza ścieżka jest niedookreślona. | **PASS-SCOPED dla P05 no; FAIL dla original-wins po P10**, B5. |
| S6. Brak oferty zatwierdzonej, istnieje jedynie proposal | Research i próbka są dozwolone; P11 dopuszcza internal_demo. P13 równocześnie wymaga zatwierdzonej wersji w Failure. API nie odróżnia handlowego exportu od wewnętrznego. | **FAIL**, B2. Nie oznacza potrzeby wymyślenia ceny. |
| S7. Dwie firmy o podobnej nazwie, brak pewnego profilu | P03 unknown → needs_identity poprawnie chroni przed zmieszaniem faktów. Po wskazaniu właściwej firmy przez operatora brak kontraktu zapisu i kontynuacji. | **FAIL pełnej ścieżki**, B3. |
| S8. Operator wybiera „poproś o zmiany” | P12 wymaga request_changes i wskazania etapu; API opisuje revise. Żadna tabela nie normuje mapowania i danych celu. | **FAIL**, B1. |
| S9. Zmieniono post po approve; ponowiono handoff | Proces i architektura zgodnie wymagają nowej rewizji/hash oraz nowej decyzji; powtórzenie identycznego requestId ma oddać ten sam receipt. | **PASS-SCOPED dla opisanego invariant**; nie testowano jego egzekwowania. |

## Co nie jest błędem i czego sędzia nie może potwierdzić

- `budgetFit=unknown` i `purchaseIntent=unknown` mogą dopuszczać wewnętrzny PoC. To jawna polityka produktu, a nie pomylenie problemu z leadem gotowym do zakupu.
- `repeatableNeed=yes` nie musi być bezwzględnym warunkiem każdej jednorazowej próbki. Warto doprecyzować, jak `no/unknown` ogranicza argument o abonamentowej usłudze, ale narzucenie tego gate byłoby preferencją sędziego. Dziś wniosek pozostaje hipotezą.
- Rubryka jakości może mieć osobne wyniki liczbowe. Nie jest zakazanym wielkim scoringiem firm. Nie ma potrzeby dodawania bardziej złożonego score.
- Dziewięć nazwanych ról nie wymaga dziewięciu modeli, serwisów lub ekranów. Można współdzielić runtime przy zachowaniu oddzielnych kontekstów autora i sędziego. Obcięcie liczby ról jest opcją implementacyjną, nie warunkiem poprawności procesu.
- Export do jawnego lokalnego odbiorcy/stubu jest uczciwym końcem hackathonowego demo. Nie potwierdza integracji z produkcyjną sprzedażą ani realizacją usługi.
- Hipoteza reason-to-pay jest zrozumiała, lecz jedna próbka nie dowodzi regularnego dowozu, małego nakładu klienta, skuteczności sprzedaży ani akceptacji ceny. Potrzebne byłyby realne rozmowy/płatny pilotaż i pomiar kosztu/czasu. Ten przegląd nie jest ich substytutem.
- Szacunek 28 h + 4 h rezerwy + 2,5 h przygotowania jest arytmetycznie zgodny z 34,5 h. Bez przydziałów, zależności oraz dowodu uruchomienia świeżego hosta OM nie stanowi dowodu wykonalności harmonogramu. Ryzyko należy obniżyć jednym pionowym przejściem, a nie kolejnym score czy szerszym discovery.

## Zakres wymaganej ponownej oceny

Po korekcie B1–B5 i rozstrzygnięciu I1 należy ponownie przeczytać zmienione kontrakty, zanotować timestamp/hash i odtworzyć co najmniej S1–S8. Nie wystarczy stwierdzenie, że autorzy „rozumieją intencję”. Tabela musi wskazać źródło decyzji, następny stan i właściciela.

Przyszłe testy runtime, odrębne od tego raportu, powinny sprawdzić: walidację wszystkich akcji review, offer/purpose gate, resolution/resume w Native Workflow, expected_pause, original-wins i hard fail, hash po edycji, idempotency handoff i tenant isolation. Ich brak w v1 nie jest ukryty pod oceną syntetyczną.
