# Źródła, decyzje i pochodzenie

Stan opracowania: 19.09.2026. Źródła techniczne sprawdzono w rzeczywistym kodzie. Testy mają oddzielny status w [09-VALIDATION.md](09-VALIDATION.md). Link do upstream nie oznacza, że jego cały pakiet został przetestowany lub włączony.

## Metoda specyfikacji — co przejęliśmy

| Źródło | Zastosowanie tutaj |
|---|---|
| [OM Spec Writing](https://github.com/open-mercato/skills/tree/main/skills/om-spec-writing) | Problem/ograniczenia przed rozwiązaniem; kontrakty; scenariusze awarii; fazy i małe odbieralne zadania; niezależny przegląd. Użytkownik upoważnił do autonomicznych, jawnych założeń. |
| [arc42](https://arc42.org/overview/) | Osobne widoki: kontekst, struktura, wykonanie i środowisko; decyzje i ryzyka obok wymagania, którego dotyczą. Nie powielamy 12 sekcji bez potrzeby. |
| [C4](https://c4model.com/) | Rozróżnienie systemu, komponentu i kodu; na schemacie odpowiedzialności zamiast listy technologii. |
| [GitHub Spec Kit](https://github.com/github/spec-kit) | Rozdzielenie intencji, planu technicznego i zadań. Nie dokładamy drugiego generatora/orkiestratora do Cezara. |

Praktyczna reguła: developer otwiera jedną kartę i widzi cel, wejście, kontrakt wyniku, swoje pliki, zależności, kryteria i polecenie weryfikacji. Krok procesu Pxx, user story USxx, zadanie Txx oraz dowód mają wzajemne odnośniki. Szczegół czyta się wtedy, gdy jest potrzebny; start nie wymaga czytania całej dokumentacji.

## Rejestr decyzji

| ID | Decyzja | Powód i warunek zmiany |
|---|---|---|
| ADR01 | acquisition jest modułem OM | Stan, uprawnienia, dane i workflow mają jeden host. Nowy backend wymaga nowej decyzji architektonicznej. |
| ADR02 | Cezar służy wyłącznie programowaniu | Jego izolacja Git/workflow nie zastępuje biznesowego Agent Orchestratora. |
| ADR03 | Jedna natywna instancja WorkflowInstance | Ponowienie, wstrzymanie, wznowienie i projekcja sprawy nie tworzą konkurujących automatów. |
| ADR04 | P0 seed+import+WWW | Bez obowiązku płatnych kont do uruchomienia demo. Dane z działających profili społecznościowych dodajemy po potwierdzeniu dostępu/kompletności. |
| ADR05 | Reguły yes/no/unknown | Każda kwalifikacja ma dowód i czytelną przyczynę, bez arbitralnego scoringu leadów. |
| ADR06 | Sama AI-stylistyka nie jest dowodem problemu | Oceniamy wartość dla odbiorcy i faktografię; nie autorstwo ani szkodę reputacyjną. |
| ADR07 | Oferta może być proposal w internal_demo | Pozwala testować research; blokuje podawanie niezatwierdzonej ceny i komercyjną gotowość. |
| ADR08 | Autor i sędzia niezależni | Osobny kontekst, anonimowe warianty, ten sam standard; wynik może preferować oryginał. |
| ADR09 | Dane źródłowe i wyniki niezmienne | Zgoda wiąże hash i numer rewizji, nie „ostatni dokument”. |
| ADR10 | Maksymalnie jedna korekta AI po błędzie | Koszt i czas są ograniczone, nierozwiązany problem trafia do człowieka. |
| ADR11 | P0 handoff do eksportu | Nie ma istniejącego repozytorium obsługi agencyjnej. Eksport nie udaje potwierdzenia odbioru przez agency ani zakupu. |
| ADR12 | Pakiet native eval oddzielny | Rzeczywisty model i bazę SQL można sprawdzić bez pełnego UI; wynik ma precyzyjnie opisany zakres. |
| ADR14 | P11 składa host z zatwierdzonych artefaktów | Native ewaluacja wykazała dopisywanie faktów przez autora pakietu. Modelowa notatka jest opcjonalna i wymaga review; nie jest źródłem treści pakietu P0. |
| ADR13 | Piny zależności i manifest źródeł | Odtwarzalność jest ważniejsza niż pobieranie najnowszej wersji podczas hackathonu. |

## Pochodzenie istniejącego procesu

Przeczytano wcześniejszy `Open_Mercato_Architektura_i_Backlog_v2.html` i aktualny hub [Hackathon Open Mercato](https://app.notion.com/p/3dc9e640565881beb38dc763d0d51315). Pierwszy jest wzorem rozpisania odpowiedzialności i natywnych kontraktów; drugi źródłem ograniczenia czasu. Nie kopiujemy jego starego backlogu ani liczby 48 zadań P0 jako zakresu nowej funkcji. Źródło zawierało niepełny blok z linkiem do repozytorium; użytkownik jednoznacznie wybrał nowe repo, więc nie zgadujemy istniejącego kodu. Konfiguracja modelu została użyta wyłącznie do uprawnionych testów; żadne dane dostępowe nie wchodzą do tego pakietu.

Aktualny hub dopuszczał runner z otwartym kodem (OSS), wcześniejsza architektura wymagała native enterprise. Najnowsza dyspozycja użytkownika wskazuje Open Mercato i testy jego agentów jako cel. Wybrano natywne komponenty do developerskiej ewaluacji, z jawnym ograniczeniem licencji i bez kopiowania enterprise.

## Upstream i licencje

Dokładne piny w [config/upstream.json](../config/upstream.json), pełna mapa 27 pozycji skilli w [02-SKILL-MAP.md](02-SKILL-MAP.md).

- [Open Mercato](https://github.com/open-mercato/open-mercato): użycie publicznych kontraktów, bez kopiowania kodu core/enterprise do repozytorium. Core na licencji MIT; enterprise ma osobne warunki.
- [Cezar](https://github.com/open-mercato/cezar): oryginalny parser/worktree sprawdzony, nasze workflow i launcher napisane dla tego projektu.
- [MarketingSkills](https://github.com/coreyhaines31/marketingskills), [Humanizer](https://github.com/blader/humanizer): wykorzystane koncepcje i adaptacja instrukcji, nie instalacja wszystkich skilli. Zachowujemy atrybucję; przy kopiowaniu dalszego kodu/treści zachowaj oryginalne informacje licencyjne.
- [Apify agent skills](https://github.com/apify/agent-skills), [Firecrawl skills](https://github.com/firecrawl/skills), [Octolens skill](https://github.com/octolens/skill): adaptery danych mają własne koszty, ograniczenia i warunki usług.

Repo zawiera autorską specyfikację, prompty i implementację pomocniczą przygotowaną dla FLOW. Nie nadajemy automatycznie licencji open-source waszemu produktowi. Licencje zależności pozostają własnością ich autorów.
