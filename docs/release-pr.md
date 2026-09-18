This PR consumes native pnpm change intents into independent versions, internal ranges and repository changelogs. Review `release/plan.json` and each package's `CHANGELOG.md`.

The `check` workflow must succeed on this PR's current head. The preparation workflow explicitly dispatches it because pushes made with `GITHUB_TOKEN` do not trigger normal PR workflows. After merge, main CI verifies the final archives. The authorization workflow checks this PR's origin, merge commit, head checks, and archive digests. Then it saves a `release-<commit>` artifact.

This PR does not publish to npm. First publication is a separate owner task using these exact verified archives under `next`.
