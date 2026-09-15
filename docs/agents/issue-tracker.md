# Issue tracker: GitHub

Задачи и спецификации этого проекта живут в GitHub Issues.
Используй gh CLI. Репозиторий определяется по git remote.

## Основные операции

- Создать задачу: gh issue create --title "..." --body-file <file>
- Прочитать задачу с обсуждением: gh issue view <number> --comments
- Получить метки: gh issue view <number> --json labels
- Найти задачи: gh issue list --state open --json number,title,body,labels,comments
  При необходимости добавляй фильтры --label и --state.
- Добавить комментарий: gh issue comment <number> --body-file <file>
- Добавить или снять метку:
  gh issue edit <number> --add-label "..."
  gh issue edit <number> --remove-label "..."
- Закрыть задачу: gh issue close <number>

Для многострочного текста используй временный файл и --body-file.

«Опубликовать в трекере» означает создать GitHub issue.
«Получить соответствующий тикет» означает прочитать issue и комментарии.

## Pull requests as a triage surface

**PRs as a request surface: no.**

Если флаг включён, применяй те же состояния и метки к внешним PR.
Используй gh pr view, gh pr diff, gh pr list, gh pr comment,
gh pr edit и gh pr close. Внешними считай PR с authorAssociation
CONTRIBUTOR, FIRST_TIME_CONTRIBUTOR или NONE.

Issues и PR используют общую нумерацию. Если тип ссылки #<number>
неясен, проверь gh pr view, затем gh issue view.

## Работа с wayfinder

- Карта — issue с меткой wayfinder:map и разделами
  Notes / Decisions-so-far / Fog.
- Дочерние тикеты связывай с картой через GitHub sub-issues.
  Если они недоступны, используй список задач в карте и строку
  Part of #<map> в начале дочернего тикета.
- Тип тикета обозначай меткой wayfinder:<type>:
  research, prototype, grilling или task.
- Блокировки записывай через нативные GitHub issue dependencies:
  gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by
  -F issue_id=<blocker-db-id>
  Здесь нужен database id блокирующей задачи, полученный через
  gh api repos/<owner>/<repo>/issues/<n> --jq .id.
- Если зависимости недоступны, используй строку Blocked by: #<n>.
  Тикет разблокирован, когда все блокирующие задачи закрыты.
- Следующий тикет — первый открытый дочерний тикет в порядке карты
  без исполнителя и открытых блокировок.
- При взятии в работу назначь себя:
  gh issue edit <number> --add-assignee @me.
- При завершении добавь комментарий с результатом, закрой тикет
  и запиши краткий итог со ссылкой в Decisions-so-far карты.
