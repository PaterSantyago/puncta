# Domain Docs

## Before you study the project

Use a single context:

- The root `CONTEXT.md` file contains domain terms and context.
- `docs/adr/` contains architectural decisions. Read the decisions applicable to the current task.

If a root `CONTEXT-MAP.md` file is added, follow its links to applicable `CONTEXT.md` files. Check decisions in `src/<context>/docs/adr/`.

If these files do not exist, continue without comment.
The `domain-modeling` skill creates them as terms and decisions are defined.

## Terminology

Use terms from `CONTEXT.md` in issues, proposals, hypotheses, and test names.
If a concept is missing, check whether it fits the project language. Record actual gaps for `domain-modeling`.

## Conflicts with decisions

If a proposal conflicts with an ADR, give the decision number and the reason to review it.
