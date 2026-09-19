# User stories — rezultat dla użytkownika

P0 to samodzielne demo acquisition. P1 to nazwane rozszerzenia; żadne nie jest ukrytym warunkiem odbioru P0. Ten plan zastępuje część wcześniejszego zakresu hackathonu. Nie dodajemy go automatycznie do poprzedniego boardu obsługi marketingowej. Pełny fulfillment, umowy, publikacja i billing są poza tym modułem.

Operator prowadzi sprawę. Sales Owner odpowiada za ofertę i następny krok. PO ocenia koszt i wartość eksperymentu. Potencjalny klient jest odbiorcą próbki; w P0 nie musi mieć konta w panelu. Developer i juror sprawdzają dowody techniczne. Gotowość rynku do zakupu wymaga odrębnego sprawdzenia.

Etapy opisuje [proces P01–P15](01-PROCESS.md), API i enumy — [architektura](04-ARCHITECTURE.md), wykonanie — [backlog](07-BACKLOG.md). Powiązania story → task są również w `backlog/backlog.json`.

## P0 — scenariusze użytkownika

### US01. Uruchomię kampanię z ofertą i limitem

**Jako operator chcę wybrać segment, ofertę, źródła i maksymalny koszt, aby wiedzieć jaki wynik zamawiam.** Proces: P01. Karty: T01, T04, T15, T25.

- Given wybraną organizację i poprawną konfigurację, When tworzę kampanię, Then widzę jej wersję, limit kosztu, język i tryb danych.
- Given ofertę w statusie `proposal`, When zaczynam research, Then jest dozwolony, ale cena nie jest komunikowana jako zatwierdzona oferta.

Dowód: jedna kampania demo. Koszt API w USD jest oddzielony od ceny oferty w PLN.

### US02. Dodam firmy ze źródłami bez duplikatów

**Jako operator chcę wkleić 3–5 domen i źródła ich znalezienia, aby zacząć od sprawdzalnej listy.** Proces: P02. Karty: T02, T05, T15.

- Given tę samą domenę i kampanię, When importuję firmę drugi raz z innego źródła, Then powstaje jeden kandydat z zachowanymi oboma źródłami.
- Given nazwę z portfolio agencji, When zapisuję kandydata, Then relacja pozostaje niepotwierdzona; system nie przypisuje obecnego wykonawcy ani budżetu.

Dowód: trzy firmy, duplikat jednej z nich i osobna firma o podobnej nazwie.

### US03. Zobaczę pochodzenie i ograniczenia danych

**Jako operator chcę znać źródła i kompletność materiału, aby odróżniać problem marketingu od problemu dostępu do danych.** Proces: P04. Karty: T02, T06, T07, T16, T25.

- Given udane pobranie strony, When utrwalam źródło, Then widzę URL, datę pobrania, hash, dostawcę i tryb `live`.
- Given zaimportowane posty lub niepełny feed, When czytam wynik, Then widzę `import` i ograniczenia. Pusty wynik nie oznacza nieaktywności firmy.

Dowód: jeden kandydat ma stronę pobraną na żywo i import postów; kontrolowany timeout zachowuje osobny status błędu.

### US04. Potwierdzę właściwą firmę i profil

**Jako operator chcę sprawdzić dowód powiązania domeny z profilem, aby nie przygotować materiału dla innej firmy.** Proces: P03. Karty: T08, T16.

- Given jawny link do profilu na stronie firmy, When resolver sprawdza źródło, Then przypisuje profil z referencją dowodu.
- Given dwie firmy o tej samej nazwie lub oddziały na wspólnej domenie, When brak jednoznacznego dowodu, Then sprawa czeka na rozstrzygnięcie. Ręczna decyzja wymaga powodu.

Dowód: `unknown`, wskazanie profilu i wznowienie tej samej instancji workflow po zapisaniu rozwiązania.

### US05. Dostanę konkretny problem albo uczciwy brak problemu

**Jako operator chcę zobaczyć do trzech obserwacji z cytatem lub datami, aby móc uzasadnić wybór kandydata.** Proces: P05. Karty: T08, T10, T16.

- Given potwierdzony feed i wystarczające daty, When przerwa przekracza jawną regułę, Then widzę przerwę w tym kanale wraz z obliczeniem i możliwym innym wyjaśnieniem.
- Given dobry post albo udokumentowaną sezonowość, When nie pozostaje inny problem, Then poprawnym wynikiem jest brak dopasowania; system nie wymusza krytyki.

Dowód: przerwa, dobry post i niepełne dane. Żaden wynik nie stwierdza autorstwa AI ani szkody reputacyjnej bez dowodu.

### US06. Zrozumiem dopasowanie naszej usługi

**Jako Sales Owner chcę powiązać problem z zakresem oferty, aby inwestować w próbkę dla firmy, której możemy pomóc.** Proces: P06. Karty: T09, T10, T13.

- Given `serviceFit=yes`, możliwość rzetelnego wykonania i dostępny budżet, When sprawdzam kwalifikację, Then dostaję powód przygotowania PoC i hipotezę powtarzalnej potrzeby.
- Given brak informacji o budżecie klienta i intencji zakupu, When system ocenia dopasowanie, Then oba pozostają `unknown`. `serviceFit=no` blokuje PoC.

Dowód: jedna karta wyjaśnia, co usługa może poprawić oraz jakich informacji nadal brakuje.

### US07. Otrzymam mały research odbiorcy i marki

**Jako osoba przygotowująca materiał chcę fakty firmy i 1–2 potrzeby odbiorcy z maksymalnie 3–5 źródeł, aby post miał sens biznesowy.** Proces: P07. Karty: T11, T16.

- Given pytanie klienta w źródle, When research je podsumowuje, Then zachowuje źródło i zakres wniosku.
- Given tylko informacje o kategorii, When agent ich używa, Then oznacza je jako dotyczące kategorii; nie udaje opinii klientów konkretnej firmy.

Dowód: fakty, potrzeby, dozwolone twierdzenia i ograniczenia wystarczające do jednego posta.

### US08. Dostanę zamknięty brief jednego posta

**Jako autor chcę znać odbiorcę, cel, temat, CTA i dozwolone fakty, aby pisać bez zgadywania podstaw.** Proces: P08. Karty: T11, T17.

- Given research i wybrany kanał, When powstaje brief, Then ma jeden temat, jeden cel, referencje faktów i kryteria oceny.
- Given poprawę istniejącej publikacji, When tworzę brief, Then wskazuje oryginał. Przy nowym temacie bez oryginału wymaga oceny bez porównania.

Dowód: jeden kompletny brief, bez danych innych firm w kontekście.

### US09. Otrzymam gotowy post bez wymyślonych faktów

**Jako odbiorca próbki chcę przeczytać użyteczny post pasujący do mojej firmy, aby zobaczyć jakość usługi na przykładzie.** Proces: P09. Karty: T12, T17.

- Given kompletny brief i fakty, When autor kończy, Then tekst jest gotowy do czytania, a referencje faktów znajdują się obok.
- Given brak ceny, certyfikatu albo terminu promocji, When autor pisze, Then nie dopisuje tych informacji ani placeholderów udających gotową publikację.

Dowód: jeden tekst po polsku z przypisanymi faktami. Generowanie grafiki jest poza P0.

### US10. Zobaczę niezależną ocenę, także gdy wygra oryginał

**Jako operator chcę uczciwego porównania według tej samej rubryki, aby nie pokazać klientowi słabszej próbki jako poprawy.** Proces: P10. Karty: T12, T17, T25.

- Given oryginał i próbkę, When sędzia dostaje A/B, Then nie zna ich autorstwa i może wybrać oryginał, remis albo żaden tekst.
- Given wymyślony fakt lub pomyloną firmę, When sprawdzamy jakość, Then występuje twarde odrzucenie. Dopuszczamy jedną poprawkę i ponowną ocenę, następnie interwencję człowieka.

Dowód: `original_wins` i odrzucenie za fakt, nie tylko pozytywny przypadek. Bez oryginału nie ma twierdzenia o przewadze.

### US11. Dostanę zrozumiały pakiet demonstracyjny

**Jako Sales Owner chcę dowodu problemu, próbki i wyjaśnienia dalszej usługi w jednym miejscu, aby odbiorca szybko zrozumiał propozycję.** Proces: P11. Karty: T13, T14, T18, T26.

- Given zaakceptowany tekst, When renderer składa pakiet, Then rozdziela materiał dla klienta od kosztów i wewnętrznych hipotez.
- Given ofertę niezatwierdzoną albo `tie`, `original_wins` lub `not_comparable`, When pakiet powstaje, Then służy `internal_review`, bez ceny i obietnicy poprawy.

Dowód: w 60 sekund niezależny czytelnik wskazuje obserwację, zmianę i zakres dalszej pracy. To test czytelności, nie popytu.

### US12. Podejmę decyzję dla dokładnie tej wersji

**Jako uprawniony operator chcę zatwierdzić, zwrócić do korekty, odrzucić lub odłożyć pakiet, aby kontrolować przekazanie.** Proces: P12. Karty: T02, T14, T19, T21, T25.

- Given poprawny hash i wersję, When wybieram `approve`, Then zapisuje się moja decyzja i kończy właściwy native UserTask.
- Given zmieniony tekst, When zatwierdzam starą wersję, Then dostaję 409 i nowy podgląd. Ponowne kliknięcie z tym samym kluczem nie dubluje decyzji.

Dowód: `approve`, `revise`, `discard`, `hold` oraz utrata ważności starej akceptacji po zmianie treści.

### US13. Przekażę pakiet bez pozornej wysyłki

**Jako Sales Owner chcę wyeksportować wejście do obsługi i dostać receipt, aby kolejny proces nie powtarzał researchu.** Proces: P13–P14. Karty: T20, T21, T25.

- Given aktualny zaakceptowany hash, When wybieram eksport, Then powstaje jeden HandoffReceipt `exported` i pakiet JSON/HTML.
- Given lokalny eksport, When oglądam wynik, Then widzę „nie wysłano”. Nie ma potwierdzenia odbiorcy, zainteresowania klienta ani zakupu bez rzeczywistego zdarzenia.

Dowód: `acquisition.handoff.v1`, następny krok i brakujące informacje. Brak wywołań SMTP, DM oraz publikacji.

### US14. Zobaczę koszt i wynik bez fikcyjnej konwersji

**Jako PO chcę rozdzielić liczbę próbek, jakość, koszty i sprzedaż, aby decydować o dalszym eksperymencie.** Proces: P15. Karta: T22.

- Given zmierzony koszt API, When liczę kampanię, Then widzę koszt zaakceptowanego pakietu. Brak pomiaru oznacza `unavailable`.
- Given brak zdarzeń sprzedażowych, When czytam podsumowanie, Then wynik to `not_measured`, a nie zero procent konwersji ani deklaracja sukcesu.

Dowód: małe podsumowanie z rozdzielonymi danymi syntetycznymi i rzeczywistymi.

### US15. Zrozumiem zatrzymanie i wznowię bez duplikacji

**Jako operator chcę powodu zatrzymania i konkretnej akcji, aby nie tracić kontroli nad kosztem ani restartować całości.** Proces: P03, P04, P06, P10, P15. Karty: T23, T25.

- Given brak źródła albo kontekstu, When proces czeka, Then wskazuje wymagany artefakt i native UserTask. Wznowienie wymaga zapisania rozwiązania.
- Given wyczerpany budżet, When przychodzi następny krok, Then nie wykonuje płatnego wywołania. Retry sprawdza wcześniejszy providerRunId i nie zeruje kosztu.

Dowód: kontrolowany timeout, limit budżetu i niezaliczona jakość z dozwoloną akcją. Bez „kontynuuj mimo wszystkiego”.

### US16. Dostanę sprawdzalny dowód działania w OM

**Jako developer lub juror chcę odróżnić schemat, harness i pełny host, aby wiedzieć co już działa.** Proces: przekrojowo. Karty: T01, T03, T09, T13, T24, T25, T26.

- Given uruchomiony host, When wykonuję izolowane ewaluacje dziewięciu ról, Then każda ma real AgentRun, model, inputHash i asercje domenowe. Brak wykonania to FAIL.
- Given użytkownika organizacji A, When próbuje odczytać dowód lub pakiet organizacji B, Then dostaje 404 bez cudzych danych.

Dowód oddziela testy przenośne, native harness, pełny OM i zintegrowane demo. Test poszczególnych agentów nie wymaga uruchamiania przepływu pomiędzy nimi.

## P1 — jawne rozszerzenia

| Story | Wynik | Proces | Karta |
|---|---|---|---|
| US17 | Publiczne posty z jednego adaptera Apify, z datami i ograniczeniami kompletności. | P04 | [T27](../tasks/T27.md) |
| US18 | Kandydat z publicznej deklaracji potrzeby znalezionej przez Octolens. | P02, P04 | [T28](../tasks/T28.md) |
| US19 | Kandydat z publicznego portfolio, bez domniemywania aktualnej umowy i ceny. | P02, P03 | [T29](../tasks/T29.md) |
| US20 | Publiczne kreacje reklamowe jako dowody, bez przypisywania ROAS albo budżetu. | P04, P07 | [T30](../tasks/T30.md) |
| US21 | Odświeżanie znanych źródeł przez harmonogram OM, z idempotencją i limitami. | P02, P04, P15 | [T31](../tasks/T31.md) |
| US22 | Rzeczywisty odbiorca intake potwierdza przekazanie własnym identyfikatorem. | P14 | [T32](../tasks/T32.md) |
| US23 | Konkretna polityka dopuszczalności kontaktu, niezależna od akceptacji jakości. | P13, P14 | [T33](../tasks/T33.md) |
| US24 | Plan sprawdzenia realnego kolejnego kroku i płatnego pilotażu z klientami. | P06, P11, P15 | [T34](../tasks/T34.md) |

Kryteria Given/When/Then dla rozszerzeń są na wskazanych kartach. P1 nie obejmuje domyślnie uruchomienia wysyłki. T33 przygotowuje bramkę i politykę; integracja konkretnego kanału wymaga osobnej zaakceptowanej karty.

## Warunki wspólne

- Źródła, błąd wykonania i brak danych są różnymi stanami. Każda obserwacja ma zakres i dowód.
- Tenant i organizacja pochodzą z hosta. Kontekst jednej firmy nie zawiera danych innej.
- Autor nie zatwierdza własnego tekstu. Dobry oryginał może wygrać.
- Nowa treść ma nowy hash i rewizję. Stara akceptacja nie zatwierdza nowej treści.
- Jakość, decyzja operatora, dopuszczalność kontaktu, eksport i sprzedaż mają oddzielne znaczenie.
- Limit USD działa przed wywołaniem providera. Nieznany koszt nie wynosi zero.
- Użytkownik widzi powód zatrzymania i sensowny następny krok bez czytania logów.
- Deklaracja `todo` zmienia się dopiero po odbiorze rzeczywistego wykonania.

## Co potwierdzi gotowość zakupu

Sędzia ocenia czytelność i jakość materiału. US24 opisuje odrębny eksperyment z realnymi odbiorcami: zainteresowanie konkretnym następnym krokiem, akceptację zakresu i ceny, gotowość dostarczenia danych oraz płatny pilotaż. Sam komplement dotyczący posta nie potwierdza popytu. Dwie godziny T34 dotyczą przygotowania eksperymentu i formularza; nie obiecują przeprowadzenia rozmów ani sprzedaży.
