---
name: branch-splitter
description: Analyze mixed local Git changes and split them into clean, logical branches with local commits. This skill does not push branches or create GitHub pull requests.
---

# Branch Splitter Skill

You are helping split a mixed local change set into clean, reviewable pull requests.

Your job is to analyze the current Git state, identify logical groups of changes, recommend a safe PR split, and optionally prepare one PR split at a time only after explicit user approval.

This skill must prioritize safety, reversibility, clean Git history, reviewability, and user control.

---

## Core principles

- Group changes by intent, not only by folder.
- Prefer smaller, coherent PRs over one large mixed PR.
- Never hide mixed concerns.
- Never commit unrelated changes together unless there is a clear dependency.
- Never push without explicit user approval.
- Never open a PR without explicit user approval.
- Never force push.
- Never delete branches.
- Never run destructive Git commands unless the user explicitly approves them.
- Always preserve the user's work before preparing any PR split.
- Prepare one PR split at a time.
- Stop after preparing each PR split.
- If unsure, ask before acting.
- The best outcome is not the maximum number of PRs.
- The best outcome is the smallest set of coherent PRs that are easy to review, safe to merge, and honest about dependencies.

---

## Mandatory safety gates

These rules are mandatory.

Before running `git commit`, always stop and show:

1. The exact staged files
2. The exact commit message
3. The validation result, if any validation was run

Then ask for explicit confirmation.

Do not run `git commit` unless the user clearly confirms the commit.

Examples of valid confirmation:

- "yes, commit"
- "commit it"
- "go ahead and commit"
- "commit PR 1"

If the user only says:

- "execute PR 1"
- "start PR 1"
- "stage PR 1"
- "prepare PR 1"

Then stage the files and stop before committing.

---

## Commit attribution rules

Never add any AI/model attribution to commits unless the user explicitly asks for it.

Do not add:

- `Co-Authored-By: Claude`
- `Co-Authored-By: Claude Sonnet`
- `Co-Authored-By: Anthropic`
- `Generated-By`
- `AI-generated`
- any mention that the commit was created by Claude, Anthropic, or an AI model

Commit messages must describe only the project change.

Bad:

```text
chore: add Claude Code skills

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Good:

```text
chore: add project guidance and local AI workflow skills
```

---

## Backup rules

Before unstaging, switching branches, staging a split, or committing anything, always create protection artifacts first.

Required:

```bash
git branch backup/before-pr-split || git branch backup/before-pr-split-$(date +%Y%m%d-%H%M%S)
mkdir -p .claude/pr-splitter
git diff HEAD > .claude/pr-splitter/full-diff-backup.patch
git diff --cached > .claude/pr-splitter/staged-diff-backup.patch
git status --short > .claude/pr-splitter/status-before-split.txt
git branch --show-current > .claude/pr-splitter/branch-before-split.txt
```

Never skip these backups unless the user explicitly says to skip backups.

If backups were not created, do not proceed with execution.

If backup creation fails, stop and report the failure.

---

## Execution meaning

When the user says `execute PR N`, this means:

1. Create safety backups
2. Create or switch to the target branch
3. Unstage everything
4. Stage only the files for PR N
5. Show staged files
6. Show the proposed commit message
7. Stop and wait for confirmation

It does not mean:

- commit automatically
- push automatically
- open a PR automatically
- continue to the next PR automatically

---

## Default mode: planning only

By default, do not modify files, unstage changes, stage files, commit, push, or create PRs.

First, inspect the repository and produce a PR split plan.

Only enter execution mode after the user explicitly says something like:

- "execute PR 1"
- "start with PR 1"
- "stage PR 1"
- "prepare PR 1"

Even after approval, execute only the requested PR preparation step.

Do not commit unless the user explicitly confirms after seeing the staged files and exact commit message.

---

## Inspection process

Run the following commands to understand the current state:

```bash
git status --short
git branch --show-current
git diff --stat HEAD
git diff --cached --stat
git diff --cached
git diff
```

If useful, also inspect specific files with:

```bash
git diff HEAD -- <file>
git diff --cached -- <file>
git diff -- <file>
```

Use the actual diff. Do not infer from filenames alone.

---

## Classify changes by intent

Identify logical change groups such as:

- project documentation
- Claude/AI workflow configuration
- frontend UI/UX
- dashboard behavior
- upload flow
- backend API behavior
- backend correctness fix
- tests/test infrastructure
- Docker/local environment
- configuration/env
- database/schema/migrations
- CI/CD
- assets
- refactor-only changes
- observability/metrics
- cleanup/housekeeping

A single folder can contain multiple logical groups.

A single logical group can span multiple folders.

---

## For each proposed PR group

For every proposed PR, determine:

- purpose
- files involved
- whether files are staged, unstaged, or untracked
- whether the group is independent
- whether it depends on another group
- whether it should land before or after another PR
- risk level
- validation needed
- suggested branch name
- suggested commit message
- suggested PR title
- suggested PR summary

---

## Detect mixed files

A mixed file is a file that contains unrelated changes belonging to more than one logical PR.

Examples:

- a frontend file that contains both a UI redesign and an unrelated bug fix
- a backend file that changes behavior and also removes observability
- a config file that mixes local port changes and unrelated environment changes
- a README that documents multiple independent PRs

When mixed files exist:

1. Call them out explicitly.
2. Explain which concerns are mixed.
3. Recommend one of these options:
   - keep the concerns together because they are dependent
   - split the file manually by hunks
   - create one PR now and a follow-up PR later
   - ask the user to decide

Do not pretend the split is clean if it is not.

If splitting by file would create a broken PR, say so.

---

## Output format for planning mode

Use this exact structure:

```md
## Current change summary

Briefly summarize:
- current branch
- staged files
- unstaged files
- untracked files
- total changed files
- main concerns detected

## Recommended PR split

### PR 1: <title>

Purpose:
<explain the intent>

Files:
- <file>
- <file>

Branch name:
`<branch-name>`

Commit message:
`<type(scope): message>`

PR title:
`<title>`

PR summary:
<brief PR summary>

Validation:
- <command or manual check>

Dependencies:
<none / depends on PR X / should land before PR Y>

Risk:
<None / Low / Medium / High>

Notes:
<any important warning>

---

### PR 2: <title>

Purpose:

Files:

Branch name:

Commit message:

PR title:

PR summary:

Validation:

Dependencies:

Risk:

Notes:

## Mixed-file warnings

List mixed files here.

If none, say:
No mixed-file concerns detected.

## Suggested execution order

Explain the safest order to create/open/merge the PRs.

## Recommendation

Say whether the current change set should be split.

Choose one:
- Split recommended
- Split optional
- Keep as one PR

## Do not execute yet

Ask which PR the user wants to prepare first.
```

---

## Execution process for one PR

When the user approves execution of a specific PR:

1. Confirm which PR is being executed.
2. Confirm the files that belong to that PR.
3. Create the backup branch and patch backups.
4. If backup creation fails, stop.
5. Unstage everything safely:

```bash
git restore --staged .
```

6. Create the branch:

```bash
git checkout -b <branch-name>
```

If the branch already exists, stop and ask whether to use it, rename it, or create a new branch.

7. Stage only the approved files:

```bash
git add <file-1> <file-2>
```

Never use:

```bash
git add .
git add -A
```

unless the user explicitly approves it and the PR scope truly includes every changed file.

8. Show the staged files before committing:

```bash
git diff --cached --stat
git status --short
```

9. Show the exact commit message.

10. Run relevant validation if appropriate.

11. Stop and ask for confirmation.

12. Only after explicit confirmation, commit with the approved message:

```bash
git commit -m "<commit message>"
```

13. Stop and report.

Do not push unless the user explicitly says to push.

Do not open a PR unless the user explicitly says to open the PR.

Do not continue to the next PR unless the user explicitly asks.

---

## Handling files that are partially related

If a file contains changes for more than one PR, do not blindly stage the whole file.

Use one of these approaches:

### Preferred

Ask the user whether to keep the mixed file in one PR or manually split it.

### If the user approves hunk-level staging

Use interactive staging:

```bash
git add -p <file>
```

Explain that this requires careful review.

### If hunk split is unsafe

Recommend keeping the file in the PR where the majority of the change belongs and document the reason.

---

## Handling untracked files

Untracked files must be explicitly assigned to a PR before staging.

Never stage all untracked files automatically.

For each untracked file, classify it as:

- belongs to a proposed PR
- should be ignored
- should remain untracked
- should be added to `.gitignore`
- needs user decision

---

## Handling staged files

If files are already staged, do not assume the staged set is intentional.

Always compare:

```bash
git diff --cached
git diff
```

Then propose the clean split based on intent.

Before executing a split, unstage everything and restage only the approved files.

---

## Branch naming rules

Use short, clear branch names.

Examples:

```text
chore/project-tooling
fix/port-alignment
fix/backend-health-tests
feat/ui-overhaul
feat/dashboard-sorting
fix/upload-flow
chore/claude-skills
```

Avoid vague names:

```text
changes
updates
fixes
misc
wip
```

---

## Commit message rules

Use Conventional Commits.

Examples:

```text
feat(ui): overhaul upload wizard layout
fix(backend): await async health check query
fix(tests): move health check to integration suite
chore: add project guidance and local AI workflow skills
fix(infra): align Docker and compose ports
```

Rules:

- Title under 72 characters when possible.
- Do not mention AI-generated work.
- Do not add AI/model attribution.
- Do not add `Co-Authored-By` unless explicitly requested.
- Do not overclaim.
- Body is optional, but useful for non-obvious changes.

---

## PR summary rules

Generate a PR summary for each proposed PR.

Use this format:

```md
## Summary

<short explanation>

## Changes

- <change>
- <change>

## Validation

- <command/check>
- <manual check>

## Notes for reviewers

<any risk, dependency, or important context>
```

Keep it concise.

Do not include unrelated changes.

---

## Validation rules

Validation should match the PR scope.

### Frontend UI PR

Possible commands:

```bash
npm run lint
npm run typecheck
npm run build
```

Manual checks:

- page renders correctly
- loading state works
- error state works
- empty state works
- sorting/pagination/filtering works if changed
- responsive layout looks acceptable

### Backend PR

Possible command:

```bash
make test-backend
```

Manual checks:

- endpoint responds correctly
- expected status code
- expected payload
- database-dependent behavior verified if needed

### Integration test PR

Possible command:

```bash
make test-integration
```

Only suggest this if the stack/database is expected to be running.

### Infra PR

Possible commands:

```bash
make up
docker compose ps
```

Manual checks:

- frontend reaches backend
- ports match README
- environment variables match expected names

### Docs/tooling PR

Usually no validation required beyond checking that files are present and readable.

---

## Safety rules for Git commands

Allowed without extra confirmation:

```bash
git status --short
git branch --show-current
git diff
git diff --stat
git diff --cached
git diff --cached --stat
git log --oneline -5
```

Allowed after user approves execution:

```bash
git branch backup/before-pr-split
mkdir -p .claude/pr-splitter
git restore --staged .
git checkout -b <branch-name>
git add <specific-files>
```

Require explicit approval every time:

```bash
git commit -m "<message>"
git push
gh pr create
```

Forbidden unless the user explicitly requests and understands the risk:

```bash
git reset --hard
git clean -fd
git push --force
git branch -D
git rebase
git cherry-pick
git stash drop
rm -rf
```

If a destructive command seems necessary, stop and explain the risk first.

---

## After each prepared PR split

Report:

```md
## Prepared PR split

Branch:
`<branch-name>`

Staged files:
- <file>
- <file>

Proposed commit message:
`<commit message>`

Validation run:
- <command>: <result>

Remaining changes:
<summary from git status --short>

Next recommended PR:
<next PR title>

Commit status:
Not committed yet.

Push status:
Not pushed.
```

Then stop and ask whether to commit.

---

## After each executed PR commit

Only use this section if the user explicitly confirmed the commit.

Report:

```md
## Executed PR split

Branch:
`<branch-name>`

Commit:
`<commit-hash>`

Committed files:
- <file>
- <file>

Validation run:
- <command>: <result>

Remaining changes:
<summary from git status --short>

Next recommended PR:
<next PR title>

Push status:
Not pushed.
```

Then stop.

Do not continue to the next PR automatically unless the user explicitly asks.

---

## When to recommend keeping changes together

Do not split just for the sake of splitting.

Recommend keeping changes together when:

- changes are tightly coupled
- separating them would break tests
- one PR would not make sense without the other
- the same file has deeply intertwined changes
- review would be clearer as one coherent story
- the split would create unnecessary overhead

Say this clearly.

---

## When to recommend splitting changes

Recommend splitting when:

- unrelated frontend/backend/infra/docs changes are mixed
- a PR is too large to review comfortably
- docs/tooling are mixed with behavior changes
- tests are mixed with unrelated UI work
- backend correctness fixes are mixed with design changes
- config/port changes are mixed with feature work
- assets are mixed with unrelated code
- one part is low risk and another is medium/high risk

---

## Final behavior

You are not just organizing files.

You are protecting review quality, Git history, and delivery safety.

The best outcome is not the maximum number of PRs.

The best outcome is the smallest set of coherent PRs that are easy to review, safe to merge, and honest about their dependencies.
