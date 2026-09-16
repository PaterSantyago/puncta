## Agent skills

### Issue tracker

Задачи и спецификации ведём в GitHub Issues. Перед работой с ними читай `docs/agents/issue-tracker.md`.

### Triage labels

Используем пять стандартных меток triage. Перед классификацией задач читай `docs/agents/triage-labels.md`.

### Domain docs

Используем single-context: корневой `CONTEXT.md` и `docs/adr/`. Перед изучением проекта читай `docs/agents/domain.md`.

### Project skills

По текущей задаче читай соответствующий `SKILL.md` ниже. Применяй рекомендации в рамках согласованных контрактов проекта.

- **Проверки свойств** — при генерации, ревью или разборе падений тестов идемпотентности, защиты текста и эквивалентности входов: [property-based-testing](.agents/skills/property-based-testing/SKILL.md). Сочетай их с независимыми языковыми эталонами.
- **Браузеры** — при проверке React в браузере, отладке hydration и работе с тестами Playwright: [playwright-cli](.agents/skills/playwright-cli/SKILL.md).
- **Сборка пакетов** — при изменении настроек tsdown, declarations, exports, внешних зависимостей или упаковки ресурсов локалей: [tsdown](.agents/skills/tsdown/SKILL.md). Сверяй примеры с установленной версией инструмента.
- **Проектирование** — при выборе интерфейсов и границ модулей ядра, локалей или адаптера: [a-philosophy-of-software-design](.agents/skills/a-philosophy-of-software-design/SKILL.md).
- **Рефакторинг** — при изменении структуры кода с сохранением наблюдаемого поведения: [refactoring](.agents/skills/refactoring/SKILL.md).
- **Алгоритмы** — при реализации или ревью обработки Unicode, диапазонов исходного текста, таблиц правил и инвариантов: [code-complete](.agents/skills/code-complete/SKILL.md).
