# Uruchamianie zadań w Cezarze

**Cezar koduje jedną kartę backlogu w osobnym Git worktree. Open Mercato uruchamia produkt.** Ten pakiet przygotowuje podział pracy i bramki odbioru; nie uruchamia samoczynnie wszystkich agentów.

## Start w 5 krokach

1. Sklonuj repo i wykonaj `npm ci` na Node24. Zainstaluj i zaloguj CLI agenta kodującego, domyślnie `codex`. Możesz wskazać dostępny `claude`, `opencode` lub `pi` w `.ai/cezar/config.json`. ChatGPT GitHub connector nie loguje CLI na twoim komputerze.
2. Sprawdź pliki i konfigurację: `npm run cezar:preflight -- --offline`. Pełny check: `npm run cezar:preflight`. Pełny check sprawdza obecność CLI; Cezar osobno weryfikuje jego auth przy starcie.
3. Uruchom **jeden** cockpit poleceniem poniżej. W drugim terminalu zobacz gotowe karty: `npm run cezar:ready`. Zależne karty są zablokowane do odbioru scalonych zależności. Status w backlogu nie zastępuje odbioru przez integratora.
4. Wyświetl plan jednej gotowej karty: `npm run cezar:launch -- <ID>`. Dopiero `npm run cezar:launch -- <ID> --execute` wysyła ją do kolejki działającego cockpit przez lokalne API. Nie tworzy osobnego procesu `cezar run`. Nie używaj dosłownie `<ID>`; weź identyfikator z listy ready.
5. Po zakończeniu sprawdź diff i dowody. Integrator scala zmianę, uruchamia istotne testy po połączeniu i przyjmuje zadanie poleceniem opisanym niżej. Wtedy zależne karty stają się ready.

Tryb graficzny:

```bash
CEZ_DISPATCH=0 npx --package @open-mercato/cezar@0.11.1 cezar --no-open
```

Otwórz `http://127.0.0.1:4321`. Wybierz workflow `flow-implement-task` i wklej prompt pokazany przez `cezar:launch`. Zanim startujesz przez GUI, nadal sprawdź `cezar:ready`; GUI nie zna naszego manifestu zależności. Ręczny start GUI omija claim tworzony przez launcher — taki task wpisz na wspólnej tablicy, by druga osoba go nie uruchomiła.

Launcher sprawdza wersję 0.11.1, wyłączony dispatch, dokładną ścieżkę repo w katalogu projektów i załadowany workflow. Wysyła `POST /api/v1/p/<projectId>/runs` i zapisuje `runId` w claim. Dla innego portu dodaj `--url http://127.0.0.1:4322`. Uruchamiaj launcher na hoście koordynującym; nie przekazuje credentiali do zdalnych hostów.

## Co jest czym

| Element | Odpowiedzialność |
|---|---|
| `backlog/backlog.json` | Kanoniczny podział pracy, zależności, owner, pliki, estymata, acceptance, komendy weryfikacji |
| `tasks/<ID>.md` | Instrukcja jednej karty dla osoby/agentów kodujących |
| `.ai/cezar/workflows/flow-implement-task.yaml` | Sekwencja implement → review → task-specific verify; maksymalnie dwa retry |
| `.ai/skills/flow-implement-task/SKILL.md` | Realizacja jednej karty z zachowaniem OM i granic plików |
| `.ai/skills/flow-review-task/SKILL.md` | Osobny przegląd kryteriów i dowodów; nie edytuje kodu |
| `.local/current-task.json` | Powiązanie worktree z taskId, hash karty, początkowym commitem i branchem |
| `evidence/tasks/<ID>.md` | Czytelny dowód wykonania, warstwa testu i ograniczenia |
| `evidence/tasks/<ID>.json`, `<ID>.review.json` | Kryteria odbioru i wynik przeglądu do kontroli maszynowej |
| `.local/cezar/results/<ID>.json` | Faktycznie uruchomione komendy weryfikacyjne i ich exit codes |
| `.local/completions.json` | Ręczny odbiór zintegrowanego zadania: hash specyfikacji, commit, reviewer, dowód |

`.local/` nie jest commitowane. Raporty `evidence/tasks/` są częścią PR/commita. Nie przechowuj tam sekretów, pełnych odpowiedzi API ani danych klientów.

## Ważne: YAML nie jest planem zależności

Zweryfikowany Cezar 0.11.1 obsługuje **sekwencyjne** kroki workflow. Równoległość występuje między osobnymi runami. `dependsOn` nie jest polem jego YAML — parser usuwa ten nieznany klucz. Dependencies należą do naszego manifestu i skryptu `cezar:ready`.

Cezar może kontynuować po braku skilla, używając zwykłego promptu. Dlatego preflight wymaga lokalnych skilli i zgodnego frontmatter. Nie uznaj samego uruchomienia Cezara za dowód prawidłowego zestawu skilli.

Jeden zbiorczy spec nie powinien trafić do czterech równoległych `om-auto-implement-spec`: ten skill projektuje jeden implementation PR na cały spec. Nasz lokalny workflow realizuje **jedną kartę**, a Cezar jest jedynym właścicielem worktree/brancha.

## Podział pracy na cztery osoby

**Topologia hackathonowa: jeden host Cezara i jeden koordynujący checkout, do czterech agentów w jego osobnych worktree.** Czterech developerów jest właścicielami zadań i recenzuje swoje streamy; integrator prowadzi kolejkę i merge. To ten checkout przechowuje wspólne `.local/completions.json` i claims. Launcher atomowo rezerwuje zadanie na tym hoście. Cztery niezależne klony na różnych komputerach nie dzielą blokad ani odbiorów; taki wariant wymaga wspólnej tablicy i jawnego przydziału, poza automatycznymi gwarancjami tego launchera.

Używaj streamów przypisanych w backlogu. W danej fali wybierz tylko gotowe zadania z rozłącznymi `files`.

- Fundament danych, kontrakty, rejestr modułu i migracje mają jednego właściciela. Muszą trafić na `main` przed zależnymi taskami.
- Równolegle można rozwijać oddzielne adaptery, narzędzia agentów i komponenty UI operujące na scalonych kontraktach.
- Integrator scala pojedynczo, sprawdza połączony wynik, potem przyjmuje zadania. Spory o współdzielony plik kończą się zmianą planu fali, nie konkurującymi edycjami.
- Workflow developmentu nie zakłada więcej dostępnych roboczogodzin niż harmonogram zespołu; scope i estymaty są w backlogu. Demo/live/fixture/deferred pozostają jawne.

Cezar ma globalny `maxParallel`, domyślnie2. Ustaw4 w Settings → Resources, jeśli pamięć i limity modeli na to pozwalają. To ustawienie operatora w `~/.cezar/config.json`; samo repo nie nadpisuje zasobów komputera. Przy dwóch równoległych slotach backlog działa identycznie, część runów czeka.

**Nie uruchamiaj równolegle kilku procesów headless `cezar run` w tym samym klonie.** W przypiętej wersji mają osobne instancje RunStore i mogą nadpisać sobie indeks runów. Wszystkie równoległe zadania trafiają przez API do jednego cockpit i jego wspólnej kolejki. Ograniczenie sprawdzono niezależnie na rzeczywistym kodzie Cezara.

**Worktree nie izoluje bazy danych ani portów.** Unit/contract tests mogą działać równolegle. Testy uruchomionej aplikacji OM wykonuje integrator albo każde środowisko otrzymuje osobną bazę i port. Nie odpalaj czterech migracji przeciw tej samej bazie.

## Odbiór zadania i odblokowanie następnych

Run `done` oznacza koniec pracy Cezara, nie merge ani odbiór. Deklaracja implementera, synthetic review i rzeczywista komenda testu mają różne role.

`cezar-verify`:

1. Sprawdza zgodność taskId/hash i zachowanie Cezar brancha oraz początkowego commita.
2. Wymaga dowodu dla każdego acceptance oraz osobnego review bez blocker/major.
3. Odrzuca pliki zmienione poza zakresem tasku (wyjątek: jego własne raporty).
4. Uruchamia komendy `verification` z manifestu bez powłoki. Brak przyszłego harnessu, niezerowy exit albo timeout daje FAIL.
5. Zapisuje wynik wykonania. Nie przyjmuje zadania i nie odblokowuje dependencies.

Nie wystarcza samo `npm run verify` lub `npm test` jako kryterium funkcji. Każda karta wskazuje własny test zachowania. Test musi sprawdzać to, czego dotyczy karta; przykład danych nie może zastąpić wywołania runtime, jeżeli acceptance wymaga runtime.

Po review, scaleniu i sprawdzeniu wyniku na aktualnym `main` integrator wykonuje:

```bash
node scripts/cezar-accept.mjs <ID> --commit <PEŁNY_SHA_COMMITA_NA_MAIN> --reviewer <IMIĘ_LUB_LOGIN>
```

To polecenie nie scala zmian. Sprawdza, czy commit jest przodkiem lokalnego `main`, zawiera tę wersję zadania/karty oraz raport `evidence/tasks/<ID>.md`, i zapisuje ręczny odbiór. Opcja `--evidence <ścieżka>` pozwala wskazać istniejący raport przygotowania dla zadania już wykonanego; integrator nadal musi przeczytać, czego dowodzi raport.

Zapis ma postać:

```json
{
  "schemaVersion": 1,
  "accepted": {
    "A01": {
      "taskSpecHash": "SHA256 wpisu tasku i treści karty",
      "commit": "pełne40znakówSHA",
      "acceptedBy": "integrator",
      "acceptedAt": "2026-09-19T12:00:00.000Z",
      "evidenceFile": "evidence/tasks/A01.md"
    }
  }
}
```

Hash obejmuje całe wymaganie z manifestu oprócz opisowego `status`, plus kartę. Zmiana wymagań unieważnia odbiór i blokuje zależne zadania. Skrypt sprawdza też przechodnio odbiory wcześniejszych zależności.

Odbiór jest decyzją uprawnionego integratora, nie kryptograficznym podpisem. Osoba mogąca edytować repo i `.local` może zmienić jego zapis. Na hackathonie to jawny proces zespołowy; nie przedstawiamy go jako systemu kontroli uprawnień produkcyjnych.

## Restart i błędy

| Sytuacja | Działanie |
|---|---|
| Brak CLI lub loginu | Zainstaluj/zaloguj wybranego runnera na hoście Cezara; connector ChatGPT jest osobny |
| `base main unavailable` | Sklonuj repo z commitem i lokalnym branchem main; wykonaj fetch i aktualizację przed falą |
| Zależność w stanie verified, ale blocked | Sprawdź jej rzeczywisty dowód, scalony commit i wykonaj ręczny odbiór |
| Brak planowanego testu | Karta nie została ukończona. Zaimplementuj harness i zachowanie; nie usuwaj go z verification |
| Review changes_requested | Retry wraca do implementera; po dwóch nieudanych poprawkach zadanie wymaga decyzji integratora |
| Claim pozostaje po awarii | Sprawdź w cockpit, czy run nadal pracuje. Dopiero po stwierdzeniu zakończenia usuń jego `.local/cezar/claims/<ID>.json` lub przyjmij scalony wynik |
| Timeout przy wysłaniu do cockpit | Claim zostaje, ponieważ run mógł wystartować mimo utraty odpowiedzi. Sprawdź zadania w cockpit przed ponownym startem; nie dubluj pracy |
| Wymagany plik należy do innego zadania | Zgłoś integratorowi; rozszerzenie kontraktu/karty zmienia hash i wymaga ponownego planu |
| Cezar done, ale testy po merge czerwone | Nie przyjmuj tasku. Wróć do branchu, popraw, powtórz relevant gate i review |

Launcher nie wykonuje push, merge, tworzenia issue, wysyłek do klientów ani dopisywania nowych zadań. Task dispatch jest wyłączony dla uruchamianych przez niego runów, by zadanie nie powiększało backlogu i kosztu samodzielnie.

## Jak sprawdziliśmy pakiet

- `node --test tests/cezar.test.mjs`: testy realnych bramek — zależności/ancestry/hash, niedostępny harness, rzeczywiście czerwony test mimo deklaracji pass, scope plików, review reject, launch bez efektów ubocznych.
- `node --import tsx scripts/cezar-validate-upstream.mjs --source <checkout-przypiętego-Cezara> --mock true`: oryginalny loader i engine Cezara. Sprawdza izolowany mock run oraz negatywną kontrolę: rzeczywisty projektowy workflow ma odrzucić mocka, który niczego nie zaimplementował.
- Wynik tego wykonania: `evidence/cezar-upstream.json`. `mock` nie jest prawdziwym modelem kodującym, GitHub auth ani uruchomieniem produktu OM.

Wersje i piny: `config/upstream.json`. Metoda: rzeczywiste źródła [Cezara0.11.1](https://github.com/open-mercato/cezar/tree/4763447f36b05e0c3934c77798335827f4398de4) i [OM Skills](https://github.com/open-mercato/skills/tree/7c81ffe68d99a9263143110c150e903d910f7526). Dowody agenta biznesowego są w osobnym raporcie walidacji produktu.
