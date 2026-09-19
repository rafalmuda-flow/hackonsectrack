# Backlog hackathonu — małe zadania, jawne zależności

**Cel P0: operator w Open Mercato przechodzi od wskazanej firmy i źródeł do sprawdzonego posta, decyzji na konkretnej wersji i lokalnego eksportu pakietu.** Dane społecznościowe mogą być importem; pobranie publicznej strony działa na żywo. Natywne wykonanie modelu, baza, uprawnienia i interfejs działają w OM. Eksport nie udaje wysyłki ani pozyskania klienta.

Kanoniczna kolejka: [`backlog/backlog.json`](../backlog/backlog.json). Karta ma właściciela, timebox, dozwolone pliki, input/output, kryteria Given/When/Then, przypadek negatywny i instrukcję dowodu. Każdy task początkowo ma `todo`. Przygotowane przez autorów specyfikacji definicje agentów, walidatory i Cezar nie zaliczają automatycznie integracji w pełnym hoście.

## 1. Zakres i realny budżet

| Pozycja | Budżet | Znaczenie |
|---|---:|---|
| P0: 26 małych kart | **25,5 roboczogodziny** | Budowa i odbiór samodzielnego demo; żadna karta nie przekracza 1,5 h. |
| Rezerwa | **4 roboczogodziny** | Dwie osoby po 2 h pod koniec pomagają w integracji, poprawkach i odbiorze. |
| Nieprzydzielona część dostępności | **5 roboczogodzin** | Bufor przygotowania, review, opóźnień i nierównego obciążenia; nie pretekst do dokładania P1. |
| Dostępność obowiązkowa | **34,5 roboczogodziny** | 4 osoby × 7,5 h w sobotę + 3 osoby × 1,5 h w niedzielę. |
| Opcjonalne okno | **1,5 h czasu** | Nie jest potrzebne do nominalnej ścieżki; liczby dostępnych w nim osób nie zakładamy. |

Obowiązkowy czas pracy to 9 h: sobota 3,5 h + 4 h, niedziela 1,5 h. Przerwy między oknami nie są godzinami pracy. Dla poniższego grafu najdłuższa sekwencja zależności wynosi **8,5 h**, więc zostaje tylko **0,5 h marginesu czasu**. Suma roboczogodzin nie wystarcza do oceny wykonalności: 25,5/4 nie oznacza sześciogodzinnego projektu. Model czasu zakłada wykorzystanie przygotowanych kontraktów, agentów i skryptów, brak zmiany stacku oraz odbiór małych commitów na bieżąco.

**To cel planistyczny, nie gwarancja.** Pobieranie dużych zależności, konfiguracja providera i iteracje po błędach mogą przesunąć ścieżkę krytyczną, nawet gdy inne osoby mają wolne godziny. Pierwszy checkpoint po 1,5 h wymaga działającego hosta. Po 7 h muszą działać eksport, zapis decyzji i native agent eval. Jeśli checkpoint się opóźnia, PO zamraża rozszerzenia i wykorzystuje rezerwę; nie usuwa kontroli źródeł, scope, wersji ani człowieka. Jeżeli pełny host nie działa, pokazujemy jasno nazwany dowód techniczny agentów — nie nazywamy go ukończonym demo aplikacji.

Ten plan **zastępuje lub ogranicza wcześniejszy board**, po decyzji PO. Nie jest dodatkowym pakietem 25,5 h do starego planu. Nowe repo nie zakłada gotowej aplikacji fulfillment. P0 kończy się kontraktem i lokalnym receipt; zewnętrzny odbiorca jest T32.

## 2. Właściciel funkcji to nie sztywne przypisanie osoby

| Stream | Odpowiedzialność | Godziny P0 | Szczególnie chronione pliki |
|---|---|---:|---|
| PLATFORM | Host, scope, komendy, workflow, retry, integracja | 9,0 | Runtime config, DI, ACL, workflow definitions, package/lockfile |
| DATA | Encje, migracja, seed, źródła, tożsamość, pakiet, export | 7,75 | entities, migration, candidate APIs, adapter contracts |
| AI | Native registry, inputy ról, niezależna ocena, izolowane evale | 4,25 | registry, agent input builders, schemas/quality gate |
| UI | Trzy ekrany OM, czytelność, decyzje, demo | 4,5 | backend pages, UI components, Polish labels |

Owner z manifestu odpowiada za spójność obszaru. Konkretną kartę może wykonać inny dostępny full-stack developer. Jedna osoba przypisana na cały dzień wyłącznie do PLATFORM byłaby przeciążona. Integrator przydziela pomoc po skończeniu krótszych kart AI/UI. Zmiany migracji, wspólnych schemas, rejestru modułu i lockfile mają jednego autora w danej fali; pozostałe karty je konsumują.

## 3. Harmonogram względny na cztery osoby

A–D oznaczają stanowiska w planie, nie stałe osoby lub role. A prowadzi integrację w końcówce; musi być dostępna w niedzielę. D kończy przed niedzielnym oknem. Czas liczony od początku pracy, bez przerw. Sloty obejmują mały test i przygotowanie dowodu; długie oczekiwanie na dostawcę jest ryzykiem harmonogramu.

| Osoba | Przebieg zaplanowanych kart | Rezerwa |
|---|---|---|
| A | 0–1,5 T01; 1,5–2,25 T09; 2,25–3,25 T12; 3,25–4,25 T13; 4,25–5 T18; 5–6 T17; 6–7 T20; 7–8 T25; 8–8,5 T26 | 8,5–9 margines krytyczny |
| B | 0–1,5 T02; 1,5–2,5 T03; 2,5–3,25 T11; 3,25–4,25 T04; 4,25–5,25 T08; 5,25–6,75 T14 | 7–9 integracja, 2 h |
| C | 1,5–2,5 T15; 2,5–3,5 T05; 3,5–4,25 T06; 4,25–5,25 T23; 5,25–6,25 T24; 6,25–7 T22 | 7–9 integracja, 2 h |
| D | 2,25–3 T10; 3–4 T07; 4–5 T16; 5–6 T19; 6–7 T21 | Wcześniejsze wolne sloty: przygotowanie i review; bez wymogu obecności po 7,5 h |

Równoległość UI jest możliwa dzięki zatwierdzonym DTO i jawnie syntetycznym fixtures. T15/T16/T17/T21 odbierają komponenty w hoście, bez twierdzenia, że backend całego procesu już działa. **T25 powtarza zachowania na rzeczywistych API i bazie.** Dzięki temu ekran nie czeka na ostatni endpoint, ale demo nie kończy się na mockach.

T02 może powstać równolegle do T01: test izolowanego schema/migracji, a wdrożenie migracji do hosta należy do T03. Nie uruchamiamy czterech testów resetujących tę samą bazę. Native host i pełny smoke mają jednego operatora; izolowane testy kontraktów mogą działać równolegle.

## 4. P0 — karty wykonania

| ID | Wynik | Owner | h | Fala | Zależności |
|---|---|---|---:|---:|---|
| [T01](../tasks/T01.md) | Uruchom przypięty host OM i bazę demonstracyjną | PLATFORM | 1,5 | 1 | — |
| [T02](../tasks/T02.md) | Zdefiniuj encje i jedną migrację acquisition | DATA | 1,5 | 1 | — |
| [T03](../tasks/T03.md) | Dodaj scope, repozytorium i ACL modułu | PLATFORM | 1 | 2 | T01, T02 |
| [T04](../tasks/T04.md) | Zapisz kampanię i wersję oferty | PLATFORM | 1 | 3 | T03 |
| [T05](../tasks/T05.md) | Importuj kandydatów z domen i źródeł | DATA | 1 | 3 | T03 |
| [T06](../tasks/T06.md) | Importuj wersjonowany snapshot źródeł | DATA | 0,75 | 4 | T05 |
| [T07](../tasks/T07.md) | Pobierz publiczną stronę jako źródło live | DATA | 1 | 4 | T03 |
| [T08](../tasks/T08.md) | Potwierdź profil i policz odstępy publikacji | DATA | 1 | 5 | T06, T07 |
| [T09](../tasks/T09.md) | Zarejestruj agentów i skille native w hoście | AI | 0,75 | 2 | T01 |
| [T10](../tasks/T10.md) | Przygotuj wejścia diagnozy i kwalifikacji | AI | 0,75 | 3 | T09 |
| [T11](../tasks/T11.md) | Przygotuj wejścia mini-researchu i briefu | AI | 0,75 | 3 | T09 |
| [T12](../tasks/T12.md) | Odizoluj autora od niezależnej oceny | AI | 1 | 3 | T09 |
| [T13](../tasks/T13.md) | Wykonuj i zapisuj pojedynczy krok przez OM | PLATFORM | 1,0 | 4 | T03, T09, T10, T11, T12 |
| [T14](../tasks/T14.md) | Zarejestruj proces i bramkę przeglądu w OM | PLATFORM | 1,5 | 5 | T04, T05, T08, T13, T23 |
| [T15](../tasks/T15.md) | Zbuduj ekran kampanii i listy przypadków | UI | 1 | 2 | T01 |
| [T16](../tasks/T16.md) | Pokaż źródła, tożsamość i diagnozę sprawy | UI | 1 | 4 | T15 |
| [T17](../tasks/T17.md) | Pokaż post, fakty i niezależną ocenę | UI | 1 | 4 | T15 |
| [T18](../tasks/T18.md) | Złóż wersjonowany pakiet wartości | DATA | 0,75 | 5 | T03, T13 |
| [T19](../tasks/T19.md) | Zapisz decyzję operatora dla konkretnej wersji | PLATFORM | 1 | 6 | T03, T18 |
| [T20](../tasks/T20.md) | Eksportuj pakiet i zapisz lokalne przekazanie | DATA | 1 | 7 | T19 |
| [T21](../tasks/T21.md) | Dodaj panel decyzji i przekazania | UI | 1 | 6 | T16, T17 |
| [T22](../tasks/T22.md) | Policz małe podsumowanie i zapisz outcome | DATA | 0,75 | 7 | T18, T19 |
| [T23](../tasks/T23.md) | Dodaj limity kosztu, błędy i bezpieczne wznowienie | PLATFORM | 1 | 5 | T13 |
| [T24](../tasks/T24.md) | Uruchom izolowane evale agentów w pełnym OM | AI | 1 | 6 | T13, T18, T23 |
| [T25](../tasks/T25.md) | Odbierz minimalny pion w aplikacji OM | PLATFORM | 1,0 | 8 | T04, T05, T06, T07, T08, T14, T18, T19, T20, T21, T22, T23, T24 |
| [T26](../tasks/T26.md) | Zamknij instrukcję demo i czytelność produktu | UI | 0,5 | 9 | T25 |

Fala to pomoc w orientacji. Prawdziwą gotowość wyznacza `dependsOn`, zaakceptowane commity i brak konfliktu plików, nie sam numer. Nie czekamy na najwolniejszą kartę całej fali, jeśli konkretne zależności następnej są już przyjęte. Numer karty jest stały; nie jest kolejnością wykonywania.

### Zakres automatyzacji P0

Operator zatwierdza konfigurację, importuje małą listę i źródła oraz rozstrzyga niepewną tożsamość. Partie „kwalifikacja → próbka → przegląd” wykonuje OM z zapisanymi artefaktami. Można uruchamiać partie ręcznie; nie trzeba automatycznego odkrywania firm ani monitoringu. Wymagane pozostają native AgentRun, natywna instancja workflow, jawny warunek zatrzymania, niezależna ocena i native UserTask. Operator nie kopiuje promptów ani wyników między krokami.

Minimalny przykład ma jeden potwierdzony problem treści i jeden post. Dodatkowe przypadki pokazują: niepełne źródło, dobry oryginał, błąd faktograficzny i brak danych. Nie budujemy wszystkich kanałów ani pełnej automatyzacji całych P01–P15 przed uzyskaniem tego pionu.

## 5. P1 — nazwane rozszerzenia poza zobowiązaniem

| ID | Zakres | h | Warunek rozpoczęcia |
|---|---|---:|---|
| [T27](../tasks/T27.md) | Podłącz Apify dla jednego publicznego profilu | 2 | P0 odebrane; T06, T07, T26; konto/źródło/odbiorca jeśli wymagane. |
| [T28](../tasks/T28.md) | Dodaj Octolens jako źródło jawnej potrzeby | 1,5 | P0 odebrane; T05, T07, T26; konto/źródło/odbiorca jeśli wymagane. |
| [T29](../tasks/T29.md) | Wyciągnij kandydatów z portfolio agencji | 2 | P0 odebrane; T05, T07, T26; konto/źródło/odbiorca jeśli wymagane. |
| [T30](../tasks/T30.md) | Dodaj obserwacje publicznych reklam | 1,5 | P0 odebrane; T06, T07, T26; konto/źródło/odbiorca jeśli wymagane. |
| [T31](../tasks/T31.md) | Uruchom monitoring zmian przez harmonogram OM | 1,5 | P0 odebrane; T14, T23, T26; konto/źródło/odbiorca jeśli wymagane. |
| [T32](../tasks/T32.md) | Podłącz rzeczywistego odbiorcę kontraktu handoff | 2 | P0 odebrane; T20, T26; konto/źródło/odbiorca jeśli wymagane. |
| [T33](../tasks/T33.md) | Opracuj i zweryfikuj bramkę realnego kontaktu | 2 | P0 odebrane; T20, T26; konto/źródło/odbiorca jeśli wymagane. |
| [T34](../tasks/T34.md) | Sprawdź gotowość zakupu w płatnym pilotażu | 2 | P0 odebrane; T26; konto/źródło/odbiorca jeśli wymagane. |

T27 wymaga wybranego i przypiętego Actor oraz sprawdzalnego publicznego profilu. T28 potrzebuje konta Octolens. T29 używa katalogu tylko jako źródła agencji; referencje klientów bierze ze strony, nie z pola Clutch `clients`. T30 nie daje dostępu do wydawania budżetu. T31 używa harmonogramu OM. T32 wymaga realnego odbiorcy i jego kontraktu. T33 przygotowuje politykę kontaktu; **realny outbound pozostaje wyłączony** i wymaga osobnej karty konkretnego kanału. T34 to przygotowanie eksperymentu, nie obietnica uzyskania sprzedaży w 2 h.

## 6. Gotowość karty i odbiór

**Ready** oznacza: zależności scalone do bazowego brancha i przyjęte, kontrakty obecne, brak aktywnego zadania na tych samych plikach, wymagane środowisko dostępne. Nie wystarcza `done` w Cezarze ani `verified` wpisane ręcznie w manifest.

1. `npm run cezar:ready` pokazuje dopuszczalne karty; launcher respektuje ich pliki i zależności.
2. Cezar wykonuje jedną kartę w swoim worktree, przeprowadza review i jej konkretną komendę weryfikacyjną.
3. Autor zapisuje `evidence/tasks/<ID>.md` i maszynowe `<ID>.json`; niezależny reviewer dodaje `<ID>.review.json` zgodnie z [instrukcją Cezara](08-CEZAR.md).
4. Integrator sprawdza wynik, scala commit, a potem przyjmuje go przez `node scripts/cezar-accept.mjs ID --commit SHA --reviewer NAME`.
5. Następne zadanie korzysta z przyjętej zmiany na bazowym branchu. Błąd testu albo brak dowodu pozostawia kartę nieodebraną.

Każda karta wskazuje `node --import tsx --test tests/acceptance/<ID>.test.ts`. Plik jest **planowanym deliverable tej karty** i na początku może nie istnieć. Nie należy tworzyć pustych testów po to, by kolejka wyglądała na zieloną. Brak testu przy odbiorze jest błędem. Plan i preflight nie wykonują przyszłych testów i nie udają, że funkcje już powstały.

UI ma dodatkowo ręczny dowód zachowania: zrzuty, scenariusz i rezultat, nie sam obraz. T24 wymaga rzeczywistych run IDs w pełnym OM. T25 wymaga całej aplikacji, auth, DB, decyzji i lokalnego receipt. Ogólne `npm run verify` kontroluje pakiet, nie zastępuje odbioru funkcji z karty.

## 7. Odbiór P0 jako całości

| Warunek | Dowód | Jeśli brak |
|---|---|---|
| Host OM i scope organizacji | Login + tenant/org check + 404 dla obcego pakietu | P0 nieodebrane |
| Dane i jawne tryby | Live WWW + import postów + partial/error | Nie wolno twierdzić, że wykonano live social scrape |
| Realny model w native runtime | AgentRun dla izolowanych ról i walidacja wyniku | `blocked`, nie pass z fixture |
| Uczciwa diagnoza i próbka | Źródła, faktografia, dobry oryginał może wygrać | Brak handlowego pakietu |
| Człowiek i wersja | UserTask + ReviewDecision na aktualnym hash | Brak eksportu jako zaakceptowany materiał |
| Kontrakt przekazania | HandoffReceipt `exported`, poprawny JSON/HTML | Nie ma gotowego rezultatu acquisition |
| Czytelność | Recenzent po 60 s wskazuje problem, zmianę i zakres | Poprawka treści/interfejsu przed prezentacją |
| Uczciwy pitch | Oddzielone live, import, fixture i przyszły odbiorca | Poprawka runbooka przed prezentacją |

Dowody przygotowania obecnego repo znajdują się w [raporcie walidacji](09-VALIDATION.md). T24/T25 są przyszłymi bramkami docelowego hosta i zintegrowanego demo, o ile raport nie wskazuje ich rzeczywistego ukończenia. Sukces syntetycznego sędziego nie potwierdza ceny ani chęci zakupu.
