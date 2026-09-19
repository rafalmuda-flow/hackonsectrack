# Addendum do v3 — P11 po nieudanej ewaluacji proof_writer

**Werdykt pozostaje `ready_for_development`.** Deterministyczne składanie P11 usuwa zależność obowiązkowego pakietu P0 od modelu, który w badaniu dopisywał nieprawdziwe informacje. Nie zmienia nieudanego testu modelu w PASS i nie jest dowodem poprawności całego produktu.

Zakres: dodatkowy przegląd semantyczny i statyczny odczyt `buildProofPack`, aktualizacji P11, docs05/09 oraz T18. Nie wykonywano testów runtime ani nowej ewaluacji treści. Snapshot: **2026-09-19T04:42:02+00:00** według środowiska.

| Plik | SHA-256 |
|---|---|
| `docs/01-PROCESS.md` | `1d2a16fef86058c01fb6ad0733c5d7a52379eea28c58ed8786b3c88132082f8e` |
| `docs/05-AGENTS.md` | `26b6ae4ae48abce7eefd6bf315bab3af5e1707f15ff37a8e7d8417a7515075a6` |
| `docs/09-VALIDATION.md` | `945062340bb6e0dc4810ffc7ccafdeb863da0cee3b613ddc051b957e56185b5c` |
| `tasks/T18.md` | `6e9027d52e245653db7aeb1ef59639abc7a73a107e0f3b236f847033d763e011` |
| `modules/acquisition/contracts/agent-host-adapter.ts` | `db0f673d4c8098569903a02b817302084c5b3e24e85c0dd5ea52fb1236daf3f3` |

## Co oceniono

1. **Jeden właściciel obowiązkowych pól.** Docs01 na szybkiej mapie, w rolach i w P11 przypisuje pakiet `buildProofPack` oraz rendererowi. `proof_writer` jest opcjonalnym eksperymentem z oddzielną notatką. T18 jawnie nie wymaga jego wyniku. Brak/błąd modelowej notatki nie blokuje P0.
2. **Nie powstaje ponowne generowanie sprawdzonych faktów.** Helper zachowuje 1–3 wskazane findings przez exact clone i dokładny `input.post.text`. Obowiązkowe `whyBetter` jest puste, a nextStep jest stałym neutralnym tekstem. Pochodzenie, oferta i sourceArtifactHash pozostają w snapshotcie.
3. **Wcześniejsze bramki są zachowane.** Gotowy proof_pack wymaga qualityPassed, potwierdzonej identity i wyniku różnego od none_pass. Cena i commercialReadiness wymagają dodatkowo new_wins i approved offer z osobą zatwierdzającą. Przy braku jakości powstaje diagnostic_report, którego dokumenty zabraniają kierować do P12/P14 jako zaakceptowany ProofPack.
4. **Historia ewaluacji pozostaje uczciwa.** Docs09 jawnie mówi, że proof_writer dodawał nieprawdziwe uzasadnienia również po jednej naprawie. Wynik modelu zostaje niezaliczony; testy helpera są innym poziomem dowodu i nie zastępują go w native report. Nie powstaje claim „9/9 content PASS”.
5. **Łańcuch użytkowy pozostaje czytelny.** Sprawdzona diagnoza i źródła → dobry post → deterministyczny pakiet → P12 na konkretnej wersji → notka/kontrakt przekazania. Oferta i jej zakres pochodzą z przypiętego wejścia, a następny krok wybiera uprawniony człowiek. Model nie musi dopisywać uzasadnienia, żeby dało się ocenić próbkę.

## Próby semantyczne zmiany

| Przypadek | Oczekiwane zachowanie wynikające ze specyfikacji i helpera | Ocena |
|---|---|---|
| Opcjonalny proof_writer dodaje fikcyjny fakt | Błędna notatka pozostaje oddzielna i nie zasila observations/samplePost/ceny. Obowiązkowy P11 nadal używa sprawdzonego wejścia. | PASS semantic |
| Dobry post + approved offer + new_wins | Dokładny post i observations, dozwolona przypięta cena; dalsze approve/handoff pozostają osobnymi bramkami. | PASS semantic |
| Proposal, tie/original_wins albo not_comparable | Brak ceny i commercialReadiness; materiał wewnętrzny, bez nowego claimu poprawy. | PASS semantic |
| Nieudana jakość lub none_pass | Diagnostic_report do poprawy, bez przyjętego ProofPack/P12/P14. | PASS semantic |
| Zmieniono wejście po utworzeniu pakietu | Snapshot i sourceArtifactHash identyfikują poprzednie wejście; host ma utworzyć nową rewizję, a nie nadpisać poprzednią zgodę. | PASS semantic |

PASS oznacza przejście przez opis/reguły, nie wykonanie funkcji w hoście.

## Pozostałe granice

Deterministyczny assembler zapobiega dodaniu nowych nieprawdziwych zdań w tej fazie. **Nie dowodzi prawdziwości wcześniejszej diagnozy lub posta.** Wymaga sprawdzonych wejść; wcześniejsza walidacja, semantyczna kontrola dowodów i końcowy przegląd człowieka nadal mają znaczenie. Nie wolno nazywać exact copy automatyczną gwarancją faktografii.

Wdrożenie T18 musi pobierać źródłowe artefakty i qualityPassed z aktualnego stanu OM, zachować scope i powiązanie wersji. Booleany/hashe z niezweryfikowanego żądania HTTP nie są dowodem akceptacji. To istniejący obowiązek hostowego adaptera i future tasku, a nie nowy mechanizm stanu.

Uwaga redakcyjna o „co zmieniono” została zamknięta przed zamrożeniem: aktualne T18 AC1 oraz U3 prezentują istniejący QualityReview i oryginał osobno, bez nowego uzasadnienia LLM. Nie ma obowiązku uzupełniania pustego whyBetter nieocenioną notatką modelu.

**Spec ready_for_development pozostaje PASS. Runtime i release konkretnego materiału wymagają własnych dowodów; willingness-to-pay nadal jest unverified.**


Końcowa kontrola doprecyzowania T18/U3: 2026-09-19T04:42:20+00:00. `docs/06-UI-AND-OPERATIONS.md` SHA-256: `f89a10fb9cd60fc65439a5e80b43b176e7aa7361db140d7586487954588ef34f`.
