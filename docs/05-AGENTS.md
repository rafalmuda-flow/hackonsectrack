# Agenci: kontrakty, uruchamianie i kryteria odbioru

Każdy z dziewięciu agentów wykonuje jedną operację na dostarczonym pakiecie danych. Model nie wybiera tenanta, nie rozstrzyga tożsamości firmy, nie pobiera samodzielnie postów i nie wysyła wiadomości. To celowy podział obowiązków: błędy redakcyjne można sprawdzić oddzielnie od integracji i działania procesu.

**Źródło prawdy:** `modules/acquisition/contracts/agents.ts` definiuje wejścia, wyjścia i walidację; `modules/acquisition/agents/catalog.ts` definiuje instrukcje. Ta strona wyjaśnia kontrakty, nie wprowadza alternatywnego schematu.

## Mapa odpowiedzialności

| Krok / agent | Odpowiada za | Wejście charakterystyczne | Wynik w `data` | Interwencja człowieka |
|---|---|---|---|---|
| P02 `acquisition.search_planner` | Krótki plan zapytań i warunki kwalifikacji | `campaign`: branża, geografia, usługa, limit, dozwolone źródła | `queries`, `inclusionCriteria`, `exclusionCriteria` | Niejasny zakres lub brak źródła pasującego do kampanii |
| P05 `acquisition.signal_auditor` | Wskazanie rzeczywistego problemu w dostarczonych materiałach | Zweryfikowany kandydat, `collection`, metryki `cadence`, treści | `findings`, `need` | Niepełna kolekcja, sezonowość, niejednoznaczna interpretacja |
| P06 `acquisition.fit_reviewer` | Dopasowanie potrzeby do oferty i kosztu próbki | `findings`, `offer`, `mode`, budżet i estymacja | `decision`, `reasons`, `buyerNeed`, `willingnessToPay`, `offerId`, `nextAction` | Brak zatwierdzonej oferty dla działania komercyjnego lub przekroczenie budżetu |
| P07 `acquisition.audience_researcher` | Pytania klientów badanej firmy, nie klientów naszej agencji | Oferta firmy, źródła, opinie i dyskusje | `audience`, `questions`, `vocabulary`, `researchGaps` | Nie można odróżnić hipotezy od udokumentowanego pytania |
| P08 `acquisition.brief_writer` | Brief jednego materiału | Pytanie odbiorcy, kanał, długość, ton, ustalenia i źródła | `brief` lub `null` | Brak faktu kluczowego dla materiału; niepotwierdzona tożsamość |
| P09 `acquisition.post_writer` | Jeden post według briefu | `brief` i źródła | `post`: tekst, odniesienia twierdzeń, założenia | Brak dowodów lub sprzeczność briefu z materiałami |
| P10 `acquisition.quality_judge` | Niezależna ocena anonimowych wariantów | Ten sam brief, te same źródła, `variants` o nieznanym autorstwie | `evaluations`, `preferredVariantId` | Brak wariantu przechodzącego bramkę; istotna rozbieżność oceny |
| P11 `acquisition.proof_writer` — opcjonalny eksperyment | Osobna notatka do ręcznego przeglądu; obowiązkowy pakiet składa host | Ustalenia, post, oferta, hostowe `comparisonStatus` | Eksperymentalny wynik zachowany osobno; bez wpływu na obowiązkowe pola ProofPack | Każda propozycja tekstu wymaga osobnej oceny; błędny wynik nie blokuje deterministycznego P0 |
| P13 `acquisition.handoff_writer` | Notka wewnętrzna i opcjonalny szkic wiadomości | Pakiet, oferta, tryb, porównanie, akceptacja materiału i kanału | `internalSummary`, `messageDraft`, `nextOwner`, `nextAction`, `commercialReadiness`, `sendAuthorized:false` | Brak wymaganych akceptacji; operator rozstrzyga dalszy krok |

P01/P03/P04/P11/P12/P14/P15 są krokami deterministycznymi opisanymi w procesie i architekturze. Pobranie danych, obliczenie przerw publikacji, nadanie identyfikatorów, złożenie pakietu, akceptacja i transfer nie są ukrytymi zadaniami modeli.

**Decyzja po testach native:** `proof_writer` zmieniał post i dodawał nowe obserwacje mimo instrukcji zachowania treści. Dlatego obowiązkowy P11 korzysta z `buildProofPack(input, {qualityPassed, sourceArtifactHash, offerVersion})`. Helper kopiuje sprawdzone `findings` i `samplePost`, przypina snapshot, zachowuje reguły ceny oraz porównania. `whyBetter=[]` i neutralny `nextStep` pochodzą z hosta. Notatka LLM nie trafia automatycznie do materiału klienta. Nie oznacza to zaliczenia nieudanego modelu; dowód działania helpera stanowią osobne testy kodu.

## Jeden format i trzy stany wyniku

Każde wejście ma `scope` oraz `evidence`. Pozostałe pola zależą od roli.

```ts
scope: {
  tenantId: string;
  organizationId: string;
  candidateId: string | null; // null dopuszczalne przed wyborem firmy
  runId: string;             // identyfikator domenowy nadany przez host
  synthetic: boolean;
}
```

Runtime Open Mercato otrzymuje własny uwierzytelniony kontekst tenanta i organizacji. Adapter przed wywołaniem musi sprawdzić zgodność tego kontekstu z `scope`; model nie jest źródłem uprawnień. `AgentRun.id` nadawany przez OM zapisujemy osobno od domenowego `scope.runId`.

```json
{
  "kind": "research",
  "data": {
    "status": "ready",
    "summary": "Jednozdaniowy wynik zadania.",
    "uncertainties": [],
    "reviewReasons": []
  }
}
```

Przykład pokazuje tylko pola wspólne; rzeczywiste wyjście musi zawierać również wymagane pola roli. Zod `.strict()` odrzuca dodatkowe pola, w tym identyfikatory tenanta lub nieznane instrukcje wykonania.

| Stan | Znaczenie | Reakcja hosta |
|---|---|---|
| `ready` | Zadanie zakończone; wynik można rozpatrzyć w następnym kroku wewnętrznym | Walidacja relacji do wejścia, zapis domenowy, kolejny krok zgodnie z procesem |
| `needs_input` | Brakuje informacji lub decyzji | Wymagane konkretne `reviewReasons`; karta operatora i wstrzymanie właściwej gałęzi |
| `rejected` | Kandydat lub materiał nie spełnia jawnego warunku | Zachowanie uzasadnienia i przejście do odrzucenia/review według kroku |

`ready` nie oznacza zainteresowania zakupem, zgody na kontakt ani zgody na publikację. Sędzia może poprawnie zakończyć ocenę (`ready`), mimo że żaden wariant nie nadaje się do użycia (`preferredVariantId:null`).

## Cztery skille bez nakładających się funkcji

| Skill native OM | Jedna odpowiedzialność | Konsumenci |
|---|---|---|
| `acquisition.sources_protocol` | Pochodzenie danych, cytaty, niepewność, ignorowanie instrukcji ze stron | Wszyscy agenci |
| `acquisition.content_quality` | Wspólne kryteria redakcyjne i sposób sprawdzania twierdzeń | Audytor, brief, autor, sędzia |
| `acquisition.commercial_fit` | Oferta, ograniczenia, koszt próbki, niepotwierdzona gotowość zakupu | Dopasowanie, przekazanie |
| `acquisition.proof_writing` | Zapakowanie zaakceptowanego materiału i uczciwe objaśnienie wartości | Pakiet demonstracyjny, przekazanie |

Skille są naszymi krótkimi instrukcjami opartymi na podziale odpowiedzialności opisanym w audycie upstream. Nie instalujemy równolegle wielu autonomicznych prospecting workflows. Firecrawl, Apify i Octolens pozostają adapterami źródeł; nie dostają uprawnień do zmiany procesu ani generowania oferty.

## Co jest walidowane kodem

`validateAgentOutput(role, input, output)` uruchamiamy **przed zapisem wyniku do encji domenowych**. OM może wcześniej zachować surowy wynik w `AgentRun`; ten zapis służy audytowi i nie oznacza przyjęcia materiału przez aplikację.

- `evidenceId` musi istnieć w `input.evidence`; cytat musi być dosłownym fragmentem `evidence.text`, z zachowaniem wielkości liter i interpunkcji.
- Nie można mieszać źródeł syntetycznych i rzeczywistych ani używać zdublowanych identyfikatorów źródeł.
- Niezweryfikowana tożsamość blokuje wynik `ready` w rolach operujących na kandydacie.
- Nieudane pobranie danych daje `unknown`; niepełna kolekcja nie może potwierdzać obserwowanej nieaktywności.
- Obserwowane ustalenie lub pytanie klienta wymaga źródła.
- Koszt przekraczający budżet blokuje automatyczne przygotowanie próbki.
- Brief nie może zmienić ustalonego kanału ani limitu znaków; post musi zmieścić się w limicie.
- Fragmenty twierdzeń w `claimReferences` muszą rzeczywiście występować w napisanym poście.
- Każdy anonimowy wariant musi zostać oceniony dokładnie raz, a cytat uzasadniający ocenę musi występować w tym wariancie.
- Pakiet zachowuje tekst próbki bez zmian; cena musi być identyczna z zatwierdzoną ofertą.
- Nie można zadeklarować poprawy, jeśli host nie potwierdził `new_wins`.
- `sendAuthorized` zawsze pozostaje `false`; wewnętrzny tryb nie tworzy szkicu zewnętrznej wiadomości.

Walidacja cytatów potwierdza istnienie źródła, ale nie dowodzi, że twierdzenie poprawnie z niego wynika. Przykład: „materiały i wypał są w cenie” nie dowodzi „nie trzeba przynosić narzędzi”. To rozstrzyga sędzia semantyczny i końcowy przegląd. Nie reklamujemy tych testów jako automatycznej gwarancji prawdziwości.

## Wspólny sędzia jakości

Warianty dostają losowe identyfikatory i losową kolejność. Host przechowuje mapowanie autorstwa poza wejściem modelu. Sędzia nie otrzymuje nazw `original`/`generated`, informacji o autorze ani celu „wybierz naszą wersję”.

| Kryterium | Co sprawdza |
|---|---|
| `clarity` | Czy odbiorca rozumie główną myśl? |
| `relevance` | Czy tekst odpowiada na wskazane pytanie odbiorcy? |
| `specificity` | Czy daje użyteczną, konkretną informację? |
| `factuality` | Czy twierdzenia mają oparcie w źródłach i nie dodano pozornej precyzji? |
| `voice` | Czy język pasuje do briefu marki i brzmi naturalnie? |

Skala: **0** — bezużyteczne/szkodliwe; **1** — poważny problem; **2** — potrzebna istotna poprawa; **3** — dobre, drobne zastrzeżenia; **4** — w pełni spełnia kryterium. Bramka `releaseEligible`: factuality **4**, każde pozostałe kryterium **≥3**, zero problemów krytycznych. Nie uśredniamy nieprawdziwego twierdzenia dobrym stylem.

`new_wins`, `original_wins`, `tie`, `none_pass` lub `not_comparable` wyznacza host z mapowania anonimowych wariantów i ocen. `not_comparable` oznacza brak odpowiedniego oryginału do porównania; nie zastępuje negatywnej oceny nowej wersji. Sama preferencja modelu nie autoryzuje działania. Dobry stary post ma pełne prawo wygrać.

## Wewnętrzne demo a gotowość komercyjna

- `internal_demo`: dopasowanie może dopuścić próbkę przy roboczej ofercie, o ile problem i koszt są uzasadnione. Bez twierdzenia o zatwierdzonej cenie i bez komunikacji zewnętrznej.
- `commercial`: przygotowanie próbki wymaga zatwierdzonej oferty z osobą zatwierdzającą. Szkic wiadomości dodatkowo wymaga zatwierdzonego materiału, właściwego kanału i wyniku `new_wins`.
- `tie`, `original_wins` lub `not_comparable`: wolno zachować materiał do wewnętrznego przeglądu; `whyBetter=[]`, `improvementClaimAllowed=false`, `commercialReadiness=false`, `quotedPricePln=null`. Nie powstaje zewnętrzny szkic wiadomości, nawet jeśli model ustawi samą flagę gotowości na `false`.
- `none_pass`: wolno zachować wyłącznie wewnętrzny raport nieudanej próby. Nie jest to zaakceptowany ProofPack i nie może trafić do P12/P14 jako pakiet do zatwierdzenia lub przekazania. Host kieruje do poprawki albo operatora. Nie mapujemy `none_pass` na `not_comparable`.
- `commercialReadiness` w P11 opisuje gotowość pakietu względem jakości i oferty. P13 ponownie sprawdza komplet akceptacji i dopuszczalność kanału. Żadna z tych flag nie zastępuje hostowej decyzji P12/P14.

## Rejestracja i wywołanie w Open Mercato

### Normatywne mapowanie hosta na agentów

Gotowe funkcje są w `modules/acquisition/contracts/agent-host-adapter.ts`; główny katalog `contracts/` je re-eksportuje. Adapter aplikacji korzysta z tych funkcji zamiast dopisywać drugą interpretację kwalifikacji.

| Dane hosta | Dane agenta / procesu | Właściciel i reguła |
|---|---|---|
| `offer.status:proposal` | `agentOffer.approval:draft` | `mapHostOfferToAgent` usuwa cenę i osobę zatwierdzającą z wejścia modelu |
| `offer.status:approved` | `agentOffer.approval:approved` | Wymagana osoba zatwierdzająca; cena i zakres przechodzą bez zmian |
| `offer.id/version/status` | `hostOfferRef` | Host przypina tę referencję do manifestu wejścia. `version` nie jest polem generowanym ani odtwarzanym przez LLM |
| `decision:fit` + istniejący problem ze źródłem + hostowe `offerCoversProblem:yes` | `serviceFit:yes` | Samo słowo `fit` nie wystarcza; brak potwierdzenia zakresu pozostawia `unknown` |
| Potwierdzona zdolność realizacji usługi | `deliveryFeasible` | Jawna konfiguracja hosta lub decyzja operatora. Nigdy nie wyliczamy jej z `fit`; `unknown` wstrzymuje PoC |
| Znany budżet klienta / zakupowa intencja | `budgetFit` / `purchaseIntent` | Oddzielne dane hosta; przy braku dowodu `unknown`. Cena usługi ani wygląd profilu nie zastępują tych danych |
| Hipoteza powtarzalnej potrzeby | `repeatableNeed` | Osobne ustalenie hosta; przy braku dowodu `unknown`. Nie jest automatycznym wynikiem jednego słabego posta |
| Limit API i koszt przygotowania próbki | `costAllowed` | Wymagane jednocześnie: dostępna pula dostawców oraz koszt przygotowania nieprzekraczający limitu PLN. Walut nie sumujemy |
| `not_fit` lub `unknown` | `stop` lub `hold` | `mapFitToProcessGates` zachowuje uzasadnienie agenta; nie wymyśla, który warunek szczegółowy zawiódł |

Po mapowaniu uruchamiana jest istniejąca reguła domenowa `qualifyPoc`; nie tworzymy drugiego silnika kwalifikacji. Nieznany budżet klienta lub intencja zakupu nie blokują samej próbki, ale nie zmieniają się przez to w potwierdzone `yes`.

`modules/acquisition/ai-skills.ts` rejestruje cztery skille przez natywne `defineSkill`. Import skilli występuje przed `defineAgent` w `ai-agents.ts`, ponieważ OM rozwiązuje je przy rejestracji.

Wszyscy agenci mają `agentType:'researcher'`, `result.kind:'research'`, `tools:[]`, `allowedActions:[]`, `loop.maxSteps:1`. To kodowe agenty native, nie agenci plikowi OpenCode. W konfiguracji nie ma twardo wpisanego dostawcy ani modelu; wybiera je konfiguracja środowiska.

Domyślna polityka przygotowanego środowiska ewaluacji i zalecenie do demo to `OM_AI_MODEL=anthropic/claude-sonnet-5`; zmianę zapisujemy jawnie w konfiguracji i dowodzie. Testowany model mini popełniał błędy cytowania i uzupełniał brakujące fakty, więc nie służy jako cichy model zapasowy. Mocniejszy model również wymaga preflight, walidacji wyniku, oceny semantycznej i przeglądu człowieka przy nierozwiązanym błędzie. Maksymalnie jedna poprawka nie daje automatycznego statusu „zatwierdzony produkcyjnie”.

Szkielet adaptera hosta, do zaimplementowania zgodnie z backlogiem:

```ts
const input = roleContracts[role].input.parse(requestPayload)
assertScopeMatchesAuthenticatedContext(input.scope, authenticatedContext)
const preflight = inspectAgentInput(role, input)
if (preflight.decision === 'needs_input') return createOperatorReview(preflight.reasons)
// Wywołanie rzeczywistego serwisu z kontenera OM; output wyciągamy
// zgodnie z typem odpowiedzi przypiętej wersji runtime.
const run = await agentRuntime.run(`acquisition.${role}`, input, {
  tenantId: authenticatedContext.tenantId,
  organizationId: authenticatedContext.organizationId,
  userId: authenticatedContext.userId,
  source: 'runtime',
})
// Zobacz działający adapter w skrypcie native eval i jego raport.
const accepted = validateAgentOutput(role, input, extractResearchResult(run))
await persistDomainResult(accepted, input.scope, run)
```

`assertScopeMatchesAuthenticatedContext`, `createOperatorReview`, `extractResearchResult` i `persistDomainResult` powyżej oznaczają obowiązki adaptera, nie gotowe funkcje w tym pliku. `inspectAgentInput` jest zaimplementowany: blokuje m.in. brak wymaganego źródła przed wydaniem tokenów autora. Działające dowody uruchomienia pojedynczych agentów są opisane w dokumentacji ewaluacji. Test przeciwny może celowo ominąć preflight, aby sprawdzić, czy również sam model poradzi sobie z brakiem źródła; nie jest to zalecany tryb produkcyjny. Nie należy przepisywać niniejszego fragmentu jako pozornie kompletnego endpointu.

Po przeniesieniu modułu do `src/modules/acquisition` wszystkie jego względne importy pozostają wewnętrzne. Zarejestrować moduł w konfiguracji aplikacji, uruchomić generator OM i wykonać próbę z Playground. Nie kopiować całego enterprise do naszego repo; używamy przypiętego upstream i jego licencji.

## Testy i uczciwe odczytanie wyniku

```bash
npm run test:agents
```

`fixtures/agents/manifest.ts` re-eksportuje manifest **18 syntetycznych przypadków**: po jednym zwykłym i trudnym dla każdej roli. Manifest zawiera wejście, kryteria oraz `referenceOutput` do testów kontraktowych. **Nie podawać `referenceOutput` modelowi podczas ewaluacji.** Wszystkie nazwy, opinie i ceny testowe są zmyślone oraz jawnie oznaczone.

Testy kontraktowe sprawdzają m.in. fałszywe cytaty, brak danych, przekroczenie kosztu, niezatwierdzoną ofertę, pomylenie tożsamości, nieudokumentowaną przewagę naszej wersji, limity tekstu i próbę obejścia akceptacji. Osobne przypadki potwierdzają możliwość wewnętrznego demo bez udawania gotowości sprzedażowej.

Rozróżniamy trzy poziomy dowodu:

1. **Kontrakt:** testy lokalne potwierdzają przyjęcie poprawnego i odrzucenie niepoprawnego obiektu.
2. **Agent native:** rzeczywisty model przez natywny runtime OM wytworzył wynik, runtime zachował run, a walidator domenowy ocenił wynik. Raport musi pokazywać model, wersję, przypadek, status i błędy.
3. **Produkt:** przepływ między krokami, realne integracje, interfejs, gotowość klientów do zapłaty i skuteczność sprzedaży. Tego nie dowodzi ani kontrakt, ani pojedynczy run; pozostaje zakresem implementacji i pilotażu.

Nie poprawiać fixture pod błędny wynik modelu. Zmieniać instrukcje lub kontrakt tylko wtedy, gdy lepiej opisują pożądane zachowanie; zachować nieudane podejście w raporcie. Każda zmiana promptu jest wersjonowana w Git razem z testem regresji.
