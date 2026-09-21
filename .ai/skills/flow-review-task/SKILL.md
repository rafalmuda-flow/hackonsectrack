---
name: flow-review-task
description: Review one implemented FLOW Acquisition task against its source card, real Open Mercato code and acceptance evidence. Produce a pass or actionable findings without changing the implementation or marking dependencies complete.
---

# Niezależny przegląd jednej karty

Odczytaj `.local/current-task.json`, kartę i wpis w `backlog/backlog.json`, `AGENTS.md`, diff względem `baseCommit` oraz `evidence/tasks/<ID>.md` i `.json`. Raport implementera jest twierdzeniem do sprawdzenia.

Sprawdź wszystkie kryteria odbioru na podstawie kodu i wykonania, zgodność z istniejącymi mechanizmami OM, granice tenant+org, zachowanie przy braku danych/błędzie, idempotency i wersje, jeśli dotyczy. Oceń czy test bada zachowanie, a nie porównuje wyłącznie własną stałą lub mocka z samym sobą. Fixture, wywołanie handlera, native runner i pełna aplikacja pozostają oddzielnymi poziomami dowodu.

Kod poza zakresem karty, nieistniejący mechanizm OM, pominięte acceptance lub brak rzeczywistego testu to blocker/major. Nie oceniaj planowanych integracji jako wykonanych. Możesz wykonać komendę weryfikacyjną karty. Nie edytuj kodu ani manifestu; poprawki wracają do implementera przez retry.

Zapisz `evidence/tasks/<ID>.review.json`:

```json
{
  "taskId": "ID",
  "taskSpecHash": "hash z .local/current-task.json",
  "verdict": "pass",
  "findings": []
}
```

Dla problemu użyj `verdict:"changes_requested"` i wpisu `{ "severity":"major", "file":"ścieżka", "finding":"konkretny błąd i jego skutek", "fix":"wymagana poprawka" }`. Blocker lub major wyklucza pass. W raporcie końcowym nazwij sprawdzone warstwy i ograniczenia. Zakończenie wcześniejszej implementacji nie zwalnia z wykonania tego review. Nie scalaj, nie oznaczaj zadania accepted, nie wysyłaj żadnej wiadomości zewnętrznej.
