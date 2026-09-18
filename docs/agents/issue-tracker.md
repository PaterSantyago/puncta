# Issue tracker: GitHub

Use GitHub Issues for project tasks and specifications.
Use the `gh` CLI. Identify the repository from the Git remote.

## Basic operations

- Create an issue: `gh issue create --title "..." --body-file <file>`
- Read an issue and its discussion: `gh issue view <number> --comments`
- Get labels: `gh issue view <number> --json labels`
- Find issues: `gh issue list --state open --json number,title,body,labels,comments`.
  Add `--label` and `--state` filters as necessary.
- Add a comment: `gh issue comment <number> --body-file <file>`
- Add a label: `gh issue edit <number> --add-label "..."`
- Remove a label: `gh issue edit <number> --remove-label "..."`
- Close an issue: `gh issue close <number>`

For multiline text, use a temporary file and `--body-file`.

“Publish in the tracker” means create a GitHub issue.
“Get the corresponding ticket” means read the issue and its comments.

## Pull requests as a triage surface

**PRs as a request surface: no.**

If this flag is enabled, apply the same states and labels to external PRs.
Use `gh pr view`, `gh pr diff`, `gh pr list`, `gh pr comment`,
`gh pr edit`, and `gh pr close`.
A PR is external if its `authorAssociation` is `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE`.

Issues and PRs share a number sequence. If a `#<number>` reference is unclear, check `gh pr view`, then `gh issue view`.

## Work with wayfinder

- A map is an issue with the `wayfinder:map` label and these sections:
  `Notes`, `Decisions-so-far`, and `Fog`.
- Link child tickets to the map with GitHub sub-issues.
  If sub-issues are unavailable, use a task list in the map.
  In that case, also add `Part of #<map>` at the start of each child ticket.
- Identify the ticket type with a `wayfinder:<type>` label:
  `research`, `prototype`, `grilling`, or `task`.
- Record blockers with native GitHub issue dependencies:

  ```sh
  gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>
  ```

  Use the blocking issue's database ID. Get it with:

  ```sh
  gh api repos/<owner>/<repo>/issues/<n> --jq .id
  ```

- If dependencies are unavailable, use `Blocked by: #<n>`.
  A ticket is unblocked when all blocking issues are closed.
- Select the first open child ticket in map order that has no assignee and no open blockers.
- Assign the ticket to yourself when you start work:
  `gh issue edit <number> --add-assignee @me`.
- When the work is complete, add a result comment and close the ticket.
  Record a short result and link in the map's `Decisions-so-far` section.
