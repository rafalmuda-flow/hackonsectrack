# Mapa skilli — jedna funkcja, jeden właściciel

## Deduplikacja wszystkich wskazanych skilli

Słownik: retained = wybrany fundament funkcji; merged = przydatny fragment trafia do tego samego właściciela, bez osobnego agenta; optional = późniejsze źródło/rozszerzenie, domyślnie wyłączone; excluded = nie instalujemy i nie uruchamiamy. Retained nie oznacza bezkrytycznego importu pełnego SKILL.md. W repo zapisujemy nasze precyzyjne instrukcje plus atrybucję; gdy kopiujemy kod/tekst, zachowujemy właściwą licencję i pin wersji.

| Źródło | Decyzja | Co przejmujemy / dlaczego | Jedyny właściciel funkcji |
|---|---|---|---|
| [prospecting](https://github.com/coreyhaines31/marketingskills/blob/main/skills/prospecting/SKILL.md) | retained | Lista kandydatów i jawne kryteria; zastępujemy Hot/Warm i scoring stanami yes/no/unknown. Bez prywatnego wzbogacania danych osób. | Kwalifikacja kandydata |
| [demand-signals](https://github.com/coreyhaines31/marketingskills/blob/main/skills/prospecting/references/demand-signals.md) | merged | URL, data, cytat/obserwacja i rozdzielenie faktu od wniosku. To część prospecting, nie drugi silnik. | Kwalifikacja kandydata |
| [first-customer-finder](https://github.com/Kappaemme-git/codex-first-customer-finder-skill) | merged | Czytelny raport źródeł i hipotezy potrzeby; nie drugi generator listy. | Pakiet wartości |
| [Octolens](https://github.com/octolens/skill/blob/main/SKILL.md) | optional | Publiczne deklaracje potrzeby jako dodatkowe źródło. Nie używamy jego listy wzmianek jako pełnej historii konta. | Adapter sygnałów; interpretacja nadal w diagnozie |
| [competitor-profiling](https://github.com/coreyhaines31/marketingskills/blob/main/skills/competitor-profiling/SKILL.md) | merged | Krótki profil znanej firmy i jej oferty, bez pełnego audytu SEO/rynkowego. | Research odbiorcy i marki |
| [customer-research](https://github.com/coreyhaines31/marketingskills/blob/main/skills/customer-research/SKILL.md) | retained | Potrzeby odbiorców firmy z dostępnych opinii/pytań i materiałów, z ograniczeniami próby. | Research odbiorcy i marki |
| [social](https://github.com/coreyhaines31/marketingskills/blob/main/skills/social/SKILL.md) | retained | Jeden post dopasowany do kanału, celu i głosu. Bez planowania całej komunikacji i publikacji. | Autor próbki; później istniejący content pipeline |
| [social/listening](https://github.com/coreyhaines31/marketingskills/blob/main/skills/social/references/listening.md) | merged | Wzór źródło → obserwacja → przegląd. Oryginalne odrzucanie „AI slop” nie pasuje do naszego celu i jest usunięte. | Kwalifikacja kandydata |
| [ads / dawniej paid-ads](https://github.com/coreyhaines31/marketingskills/blob/main/skills/ads/SKILL.md) | optional | Audyt publicznych kreacji w dalszej wersji. Zarządzanie kampanią pozostaje poza acquisition. | Research reklam, bez uprawnień write/spend |
| [creative-research-automation](https://github.com/coreyhaines31/marketingskills/blob/main/skills/ads/references/creative-research-automation.md) | merged | Pytania do analizy kreacji i ofert; bez traktowania długości emisji jako wyniku kampanii. | Research odbiorcy i marki |
| [marketing-loops](https://github.com/coreyhaines31/marketingskills/blob/main/skills/marketing-loops/SKILL.md) | merged | Przeglądy wyników, warunki stop i powtarzalność. Harmonogram i stan wyłącznie w Open Mercato. | Orkiestracja i pomiar |
| [cold-email](https://github.com/coreyhaines31/marketingskills/blob/main/skills/cold-email/SKILL.md) | optional | Krótki draft wiadomości po akceptacji materiału. Bez automatycznej sekwencji/wysyłki, bez sugerowania zgody na podstawie publicznego adresu. | Przygotowanie przekazania |
| [Firecrawl search/map/scrape/crawl/agent](https://github.com/firecrawl/skills) | retained | Jeden adapter stron WWW: pobranie wskazanych źródeł i danych portfolio. Zapis URL, czasu, statusu i ograniczeń. | Zbieranie źródeł |
| [Firecrawl monitor](https://github.com/firecrawl/cli/blob/main/skills/firecrawl-monitor/SKILL.md) | optional | Późniejsze wykrycie zmiany znanej strony. Open Mercato pozostaje źródłem harmonogramu; nie uruchamiamy równoległego niezależnego schedulera. | Zbieranie źródeł |
| [Firecrawl lead-gen](https://github.com/firecrawl/firecrawl-workflows) | excluded | W katalogu jest gotowy workflow lead-gen, lecz pełnej instrukcji nie zweryfikowano. Dubluje discovery/qualification; wybieramy jawne primitives zamiast dodatkowej czarnej skrzynki. | — |
| [Apify ultimate-scraper](https://github.com/apify/agent-skills/blob/main/skills/apify-ultimate-scraper/SKILL.md) | retained | Adapter wybranych, przypiętych Actors do publicznych postów. Produkcyjny agent nie dobiera sam nieograniczonej liczby płatnych Actors. | Zbieranie źródeł |
| [Apify marketing-agency-database](https://github.com/apify/awesome-skills/blob/main/skills/apify-marketing-agency-database/SKILL.md) | optional | Katalog agencji jako seed. Firma wymieniona w portfolio wymaga osobnej weryfikacji; cennik agencji nie ujawnia ceny klienta. | Zbieranie kandydatów |
| [Apify buying-signal-detection](https://github.com/apify/awesome-skills/blob/main/skills/apify-buying-signal-detection/SKILL.md) | merged | Provenance, deduplikacja, ograniczenie kosztu. Usuwamy split scheduler/CSV jako bazę i first-seen-wins: wszystkie nowe dowody dopisujemy do istniejącej firmy. Zatrudnianie/funding są poza MVP. | Zbieranie kandydatów; stan w OM |
| [Apify ads-intelligence](https://github.com/apify/awesome-skills/blob/main/skills/apify-ads-intelligence/SKILL.md) | optional | Dane bibliotek reklam jako źródło dla jednego researchera; nie drugi analityk marketingu. Brak wnioskowania o ROAS/budżecie z liczby reklam. | Zbieranie źródeł |
| [Apify company-data-api](https://github.com/apify/awesome-skills/blob/main/skills/apify-company-data-api/SKILL.md) | excluded | Metadane profili Clutch nie są potrzebne pierwszej próbce. Pole clients to segmenty/udziały klientów, nie lista nazw/logo z portfolio. | — |
| [Apify easy-competitive-intelligence](https://github.com/apify/awesome-skills/blob/main/skills/apify-easy-competitive-intelligence/SKILL.md) | excluded | Dubluje research; nie przejmujemy wnioskowania „brak danych = brak aktywności”. Wybrane źródło można dodać do adaptera po osobnym teście. | — |
| [humanizer](https://github.com/blader/humanizer/blob/main/SKILL.md) | merged | Polski przegląd stylu wewnątrz kontroli redakcyjnej. Nie detekcja autorstwa AI; nie osobny scoring firmy. | Niezależny recenzent jakości |
| [copy-editing](https://github.com/coreyhaines31/marketingskills/blob/main/skills/copy-editing/SKILL.md) | retained | Jasność, konkret, znaczenie dla odbiorcy, dowody; ta sama rubryka starego i nowego tekstu. Oddzielamy diagnozę od pisania i oceny próbki. | Diagnoza oraz niezależny recenzent; osobne wykonania |
| [Composio lead-research-assistant](https://github.com/ComposioHQ/awesome-claude-skills/blob/master/lead-research-assistant/SKILL.md) | excluded | Powiela ICP/listę/outreach, wraca do arbitralnego scoringu. Brak unikalnej funkcji dla MVP. | — |
| [sales-enablement](https://github.com/coreyhaines31/marketingskills/blob/main/skills/sales-enablement/SKILL.md) | merged | Czytelny one-pager i odpowiedzi na obiekcje. Usuwamy generowanie decków/ROI bez danych. | Pakiet wartości |
| [offers](https://github.com/coreyhaines31/marketingskills/blob/main/skills/offers/SKILL.md) | merged | Jedna jawna oferta i klientowskie obowiązki; bez bonusów, sztucznej pilności czy gwarancji dopisywanych przez model. | Właściciel oferty + konfiguracja kampanii |
| [JobsPipe job-search/stack-scan](https://skills.sh/jobspipe/skills) | excluded | Zatrudnianie i stack nie są potrzebne do sprawdzenia treści/częstotliwości. Dalsze sygnały dopiero po dowodzie wartości głównego kanału. | — |

Ta mapa nie oznacza, że wszystkie upstream pakiety muszą być dependencies. Kod produkcyjny potrzebuje adapterów danych, własnych kontraktów i małego zestawu ograniczonych instrukcji agentów. Aktualizacje upstream nie mogą samoczynnie zmienić kryteriów oceny albo uruchomić wysyłki.


## Jak używamy tej mapy

1. Kanoniczny proces jest w [01-PROCESS.md](01-PROCESS.md). Żaden upstream skill nie zmienia jego bramek, stanów ani ról.
2. Adaptujemy tylko wskazane fragmenty. Nie instalujemy całego katalogu marketingskills, Apify ani Firecrawl jako nieograniczonych instrukcji runtime.
3. Każdy adapter ma jawny koszt/limit, source provenance, tryb fixture/live i przypiętą wersję.
4. Przejmowanie kodu lub dosłownych fragmentów wymaga atrybucji/licencji; aktualizacja upstream jest zadaniem review, nie automatyczną zmianą zachowania.
5. Role LLM zwracają wynik do walidacji. Upstream instrukcje o wysyłce, własnych schedulerach, CSV jako bazie czy samoocenie agenta są wyłączone.

## Status weryfikacji źródeł

Nowe/niepewne aspekty sprawdzono w źródłach pierwotnych GitHub: prospecting, Apify buying-signal-detection/company-data-api/easy-competitive-intelligence, offers, sales-enablement, katalog Firecrawl i Composio. Pozostałe pozycje opierają się na wcześniejszym przeglądzie tej rozmowy i wskazanych primary links. Nie wykonano benchmarku źródeł live ani nie uznano README za dowód kompletności danych.

Pełna instrukcja Firecrawl lead-gen nie została odczytana; źródłem jest katalog. Nie ma podstaw do twierdzenia, że sam skill znajdzie aktualnych klientów agencji albo wykryje wszystkie posty profilu. Rozdzielone harmonogramy Apify/Claude i CSV zastępuje OM; first-seen-wins zastępuje dopisywanie wszystkich dowodów do istniejącej firmy.
