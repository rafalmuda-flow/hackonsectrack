# Ekrany, zachowanie i odbiór

Trzy ekrany w standardowym backendzie OM. UI wykorzystuje `DataTable`, `CrudForm`, `apiCall` i mechanizmy uprawnień platformy. Żaden komponent nie zapisuje bezpośrednio do bazy. Każda akcja pokazuje stan oczekiwania, wynik lub czytelny błąd; odświeżenie strony odtwarza stan z API.

## U1. Kampania i lista kandydatów

Ścieżka docelowa `/backend/acquisition`. Nagłówek: nazwa kampanii, tryb danych, wersja oferty, wykorzystany/rezerwowany limit. Akcje: „Dodaj firmy”, „Importuj publikacje”, „Uruchom wybrane”. Formularz startowy: branża, rynek, język, oferta/propozycja, maksymalna liczba kandydatów, budżet, wklejone adresy URL. Najpierw walidacja, potem jedno potwierdzenie konfiguracji.

Tabela: firma i domena; źródło kandydata; etap; problem (treść/regularność/brak danych); stan oceny; ostatnia aktywność z datą i kompletnością; koszt. Wiersz ma link do szczegółów, nie pięć niezależnych przycisków uruchomienia. Filtry: etap, brak danych, wymaga decyzji, zaakceptowany. Brak wyników: „Nie znaleźliśmy kandydatów spełniających warunki. Zmień źródła lub kryteria.” Błąd pobrania nie wyświetla komunikatu o pustej liście.

Widoczne oznaczenie `Dane syntetyczne / Import / Dane pobrane`. Przy niezweryfikowanym portfolio: „Firma wymieniona w portfolio — aktualna współpraca niepotwierdzona”. Nie pokazujemy etykiet „AI autor”, „zły klient” ani wymyślonego prawdopodobieństwa zakupu.

## U2. Szczegóły firmy

Ścieżka `/backend/acquisition/:candidateId`. Góra: tożsamość i linki do źródeł. Pasek postępu pokazuje fazy „Dane → Diagnoza → Próbka → Ocena → Decyzja”; po rozwinięciu konkretne P01–P15 i odnośniki do natywnych uruchomień. Techniczne identyfikatory pod „Szczegóły wykonania”, nie w podstawowym tekście.

| Sekcja | Treść | Co użytkownik może zrobić |
|---|---|---|
| Tożsamość | Powiązanie domeny/profilu i cytowany dowód | Potwierdzić, poprawić, odłożyć z przyczyną |
| Źródła | URL, data publikacji i pobrania, tryb, kompletność, cytat | Otworzyć źródło; dostarczyć brakujący materiał |
| Diagnoza | Maks. 3 obserwacje i znaczenie dla czytelnika; niepewność widoczna obok | Odrzucić niewłaściwą obserwację, dodać kontekst sezonowości |
| Dopasowanie | Co oferta rozwiązuje, co nie wiadomo, zakres kosztu | Uzupełnić ofertę lub zatrzymać PoC |
| Próbka | Jeden tekst i brief; źródła twierdzeń poza postem | Skopiować szkic, zgłosić poprawkę, nie publikować automatycznie |
| Ocena | Warianty A/B, skala 0–4 i cytowane powody; wynik po ujawnieniu autorstwa | Zobaczyć brak poprawy, nie tylko „model akceptuje” |
| Koszt | Koszty API w USD: potwierdzone i zarezerwowane osobno; koszt przygotowania researchu w PLN oddzielnie | Zwiększyć właściwy limit uprawnioną akcją lub zatrzymać |

Pauza pokazuje jedno konkretne zadanie, np. „Nie potwierdziliśmy, że profil należy do tej firmy. Wskaż odnośnik ze strony lub odrzuć dopasowanie.” Po odpowiedzi zapis i wznowienie są jednym widocznym działaniem, realizowanym przez kontrakty identity/resume. Brak `resume` albo brak uprawnienia ma czytelny komunikat; UI nie zmienia statusu lokalnie na „działa”.

Podsumowanie kampanii korzysta z `GET /api/acquisition/campaigns/:id/summary` dostarczanego w T22. Nie sumuje USD i PLN i nie pobiera automatycznie kursu. Cena oferty nie jest kosztem przygotowania pakietu. Jeśli dostawca nie zwrócił kosztu, widok pokazuje „Koszt nieznany”, a nie `0`.

## U3. Przegląd i przekazanie

Ścieżka `/backend/acquisition/:candidateId/review`. Podgląd gotowego pakietu: obserwacja ze źródłem, jeden post, ograniczenia i proponowany dalszy krok. Istniejący QualityReview oraz oryginał można otworzyć obok; ekran nie wymaga nowego uzasadnienia od autora pakietu. Tryb wewnętrzny ma oznaczenie „Materiał roboczy — niegotowy do użycia handlowego”. Nie dodajemy automatycznie ceny oferty 2500 PLN z historycznej propozycji.

Akcje i odpowiadające im wartości API:

| Przycisk | Wartość API | Skutek |
|---|---|---|
| Zatwierdź tę wersję | approve | Zapis zgody na hash i numer rewizji; dostępny tylko po przejściu kontroli jakości |
| Poproś o poprawkę | revise | Wymagany konkretny powód; nowa rewizja bez starej zgody |
| Odrzuć | discard | Kończy ścieżkę tej próbki, zachowuje historię |
| Odłóż | hold | Otwarta sprawa z powodem; nie oznacza zgody |

Gdy inny użytkownik zmieni wersję: odpowiedź 409, komunikat „Pakiet zmienił się od otwarcia. Przejrzyj aktualną wersję.” Przyciski nie próbują zatwierdzić nowszej treści w tle.

Po zatwierdzeniu „Eksportuj pakiet” tworzy potwierdzenie `exported` i plik; „Przekaż do obsługi agencyjnej” jest dostępne dopiero po podłączeniu adaptera i zwraca `accepted_by_agency` po potwierdzeniu odbioru. Nie pokazujemy „klient pozyskany”. Przy braku dopuszczalności kontaktu pakiet może pozostać wewnętrzny; treść interfejsu nie proponuje obejść.

## Stany i komunikaty wspólne

- 400: wskaż pole i oczekiwany format.
- 403: pokaż brak potrzebnego uprawnienia; ukrycie przycisku nie zastępuje ochrony API.
- 404: „Nie znaleziono sprawy w tej organizacji.”
- 409: zachowaj wpisany komentarz i pobierz nową wersję do ponownego przeglądu.
- 429: odróżnij limit kampanii od limitu częstotliwości wywołań dostawcy; pokaż potrzebną decyzję.
- 503/timeout: „Źródło/model jest chwilowo niedostępne”; pokaż stan zachowanych danych i możliwość wznowienia.
- Unknown: nie używaj zielonego znacznika akceptacji, punktacji 0 ani etykiety brak marketingu.

Klawiatura: fokus na komunikacie po błędzie, etykieta przy każdym polu, tekstowe stany oprócz koloru. Długie cytaty rozwijane; pełny tekst dostępny. Przyciski w stanie oczekiwania blokują przypadkowe podwójne wysłanie, a backend i tak egzekwuje idempotencję.

## Scenariusz demonstracji: 5 minut

0:00–0:40 cel i 3 kandydatów, jawne pochodzenie danych. 0:40–1:30 jedno rzeczywiste uruchomienie agenta i źródła. 1:30–2:30 diagnoza i pojedynczy post. 2:30–3:30 sędzia odrzuca zmyślone twierdzenie lub pokazuje przewagę dobrego oryginału. 3:30–4:20 człowiek zatwierdza konkretną poprawioną wersję. 4:20–5:00 potwierdzenie eksportu i ślad w OM. Brak zewnętrznej wysyłki.

Fixture jest jawnie oznaczony. Jeśli dostawca danych nie działa, pokazujemy zapisany wynik z czasem i statusem historycznym oraz aktualny błąd; nie animujemy fixture jako trwającego runu. Ewaluacja pojedynczej roli może być pokazana jako dowód techniczny, ale nie zastępuje działającego panelu.
