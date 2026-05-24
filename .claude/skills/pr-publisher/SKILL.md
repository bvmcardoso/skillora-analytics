---
name: pr-publisher
description: Publish the current prepared local branch to GitHub and create a pull request safely. Use this after branch-splitter has created a local branch and commit. This skill only operates on the current branch by default and never publishes multiple branches automatically.
---

# PR Publisher Skill

You are helping publish one already prepared local branch as a GitHub pull request.

Your job is to inspect the current Git branch, verify whether it has local commits, check whether it has already been pushed, check whether a pull request already exists for this branch, and then safely push and create a PR only after explicit user approval.

This skill must prioritize safety, clarity, avoiding duplicate PRs, and operating on the current branch only.

---

## Core principles

- Operate on the current branch only by default.
- Never scan all branches and create PRs automatically.
- Never publish multiple branches in one run.
- Never create duplicate PRs.
- Never modify files.
- Never stage files.
- Never commit.
- Never amend commits.
- Never rebase.
- Never merge.
- Never force push.
- Never delete branches.
- Never push without explicit approval.
- Never create a PR without explicit approval.
- Always inspect the current Git and GitHub state first.
- Always explain what will happen before doing it.
- Stop after publishing the current branch.
- Do not continue to other branches automatically.

---

## Responsibility boundary

This skill handles publishing only.

It may:

- inspect the current branch
- inspect local commits
- inspect remote tracking state
- inspect existing PRs for the current branch
- suggest a PR title/body
- push the current branch after approval
- create a GitHub PR after approval
- show the created PR URL

It must not:

- split files
- stage files
- commit files
- change branches without asking
- inspect all branches for publishing unless explicitly requested
- edit code
- rewrite history
- merge PRs
- close PRs
- delete branches

If the working tree has uncommitted changes, stop and warn the user.

---

## Branch scope rules

By default, inspect and publish only the current branch.

Never scan all local branches and create PRs automatically.

Never publish multiple branches in one run.

If the user asks to check all branches, enter inventory mode only:

- list branches
- show push/PR status
- recommend next actions
- do not push
- do not create PRs
- do not switch branches unless explicitly asked

Publishing is allowed only for the current branch and only after explicit approval.

---

## Default mode: inspection only

By default, do not push and do not create a PR.

First inspect the current state and produce a publish plan.

Only execute push or PR creation after the user explicitly says something like:

- "push it"
- "push this branch"
- "create the PR"
- "publish it"
- "go ahead and create the PR"
- "push and create the PR"

If the user says only:

- "check"
- "inspect"
- "what now"
- "publish plan"
- "pr-publisher"
- "/pr-publisher"

Then inspect and report only.

---

## Inspection process

Run these commands first:

```bash
git branch --show-current
git status --short
git remote -v
git log --oneline -5
```

Then inspect upstream state:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u}
```

If there is no upstream, that is okay. Report it.

Then inspect commits relative to the base branch.

Try `main` first:

```bash
git log --oneline main..HEAD
git diff --stat main..HEAD
```

If the repository uses `master` instead of `main`, use:

```bash
git log --oneline master..HEAD
git diff --stat master..HEAD
```

Then inspect GitHub PR state for the current branch only:

```bash
current_branch="$(git branch --show-current)"
gh pr list --head "$current_branch" --json number,title,url,state,headRefName,baseRefName
```

If `gh` is not installed or not authenticated, stop and explain that the user needs to create the PR manually or authenticate GitHub CLI.

---

## Existing PR check is mandatory

Before creating a PR, always check whether a PR already exists for the current branch.

Use:

```bash
current_branch="$(git branch --show-current)"
gh pr list --head "$current_branch" --json number,title,url,state,headRefName,baseRefName
```

If this command returns any PR:

- do not create another PR
- show the existing PR number/title/URL/state
- report that the branch already has a PR
- stop

Never create a second PR for the same branch.

---

## Working tree safety

Before pushing or creating a PR, check:

```bash
git status --short
```

If there are uncommitted changes, stop and report them.

Do not push or create a PR from a dirty working tree unless the user explicitly says they understand and still want to proceed.

A clean working tree means no staged, unstaged, or untracked changes.

Exception:

Untracked local-only backup files under `.claude/` may exist. Report them clearly and ask whether they should be ignored for publishing.

Do not assume `.claude/` backup files are safe to ignore unless the user confirms.

---

## Branch safety

Never publish directly from:

```text
main
master
develop
staging
production
```

If the current branch is one of these, stop and explain that a feature/fix/chore branch is required.

Good branch examples:

```text
chore/project-tooling
fix/port-alignment
fix/health-async-and-test-structure
feat/ui-overhaul
```

---

## Upstream detection

Check whether the current branch has an upstream:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u}
```

If there is no upstream, report:

```md
Upstream:
None. This branch has not been pushed yet.
```

If upstream exists, report it:

```md
Upstream:
origin/<branch-name>
```

---

## Push rules

If the branch has no upstream, propose:

```bash
git push -u origin <branch-name>
```

If the branch already has upstream, propose:

```bash
git push
```

Before running push, show:

- current branch
- commits to publish
- remote target
- exact push command

Then ask for confirmation.

Do not push unless the user explicitly confirms.

Never use:

```bash
git push --force
git push --force-with-lease
```

unless the user explicitly requests it and confirms the risk.

---

## PR creation rules

Before creating the PR, generate and show:

- PR title
- PR body
- base branch
- head branch
- exact `gh pr create` command

Then ask for confirmation.

Default base branch:

```text
main
```

If the repository uses another base branch, detect it or ask the user.

Use this command format:

```bash
gh pr create --base main --head <branch-name> --title "<title>" --body "<body>"
```

If the branch was not pushed yet, push first after approval.

Do not create a PR without the branch being available on the remote.

Do not create a PR if `gh pr list --head "$current_branch"` returns an existing PR.

---

## PR title rules

Use the current branch and commit message to infer the title.

Examples:

```text
chore: add project guidance and local AI workflow skills
fix(infra): align Docker and compose ports
fix(backend): await async health check and move test to integration
feat(ui): overhaul dashboard, upload wizard, and file upload
```

Do not mention:

- Claude authored this
- AI-generated
- automated by AI
- generated by model
- Co-Authored-By
- Anthropic

---

## PR body rules

Generate a concise PR body.

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

If validation was not run, say:

```md
## Validation

- Not run. Reason: <reason>
```

Do not overclaim validation.

Do not say tests passed unless they actually ran and passed.

Do not mention AI authorship.

---

## Output format for inspection mode

Use this exact structure:

```md
## PR publish inspection

Current branch:
`<branch-name>`

Working tree:
<clean / dirty>

Base branch:
`<main/master/other>`

Local commits not on base:
- <commit>
- <commit>

Diff summary:
<git diff --stat base..HEAD>

Upstream:
<none / origin/branch-name>

Existing PR:
<none / PR URL>

Recommended action:
<push branch / create PR / already published / stop due to issue>

Suggested PR title:
`<title>`

Suggested PR body:

## Summary

...

## Changes

...

## Validation

...

## Notes for reviewers

## Do not execute yet

Ask whether the user wants to push and/or create the PR.
```

---

## Publishing flow

When the user approves publishing:

1. Confirm current branch.
2. Confirm the current branch is not `main`, `master`, `develop`, `staging`, or `production`.
3. Confirm working tree is clean or explicitly approved despite being dirty.
4. Confirm no PR already exists for the current branch.
5. Push branch if needed.
6. Re-check whether a PR exists after push.
7. Create PR if requested and if none exists.
8. Show PR URL.
9. Stop.

Do not continue to another branch.

---

## If branch is already pushed but no PR exists

Report:

```md
Branch is already pushed.
No PR exists yet.

Suggested next step:
Create PR from `<branch-name>` into `main`.
```

Then show the PR title/body and ask for approval before running:

```bash
gh pr create --base main --head <branch-name> --title "<title>" --body "<body>"
```

---

## If branch is not pushed

Report:

```md
Branch has no upstream remote.

Suggested next step:
Push branch with upstream:

`git push -u origin <branch-name>`

After push, create the PR.
```

Ask for approval before pushing.

---

## If PR already exists

Report:

```md
Existing PR found.

PR:
<PR URL>

State:
<open/closed/merged>

No new PR will be created.
```

Stop.

Do not create another PR.

---

## If working tree is dirty

Report:

```md
Working tree is dirty.

Uncommitted changes:
<git status --short output>

Publishing is blocked by default because this branch has uncommitted changes.

Options:
1. Commit/stash these changes first
2. Switch to the correct branch after preserving work
3. Proceed only if you explicitly approve publishing from a dirty tree
```

Do not push or create PR automatically.

---

## If GitHub CLI is unavailable

If `gh` is not installed or not authenticated, report:

```md
GitHub CLI is unavailable or not authenticated.

I can still prepare:
- push command
- PR title
- PR body

You can then create the PR manually on GitHub.
```

Do not attempt alternative unsafe flows.

---

## Inventory mode

Inventory mode is read-only.

Only enter inventory mode if the user explicitly asks to inspect all branches, list branch status, or check which branches still need PRs.

Examples:

- "check all branches"
- "show branch inventory"
- "which branches still need PRs?"
- "list unpublished branches"

In inventory mode, you may inspect branches and PR status, but you must not push or create PRs.

Allowed commands in inventory mode:

```bash
git branch
git branch -vv
git for-each-ref --format='%(refname:short) %(upstream:short)' refs/heads
gh pr list --state all --json number,title,url,state,headRefName,baseRefName
```

Inventory output format:

```md
## Branch inventory

### <branch-name>

Upstream:
<none / origin/branch-name>

Local status:
<ahead/behind/even/unknown>

Existing PR:
<none / PR URL>

Recommended action:
<none / publish current branch manually / switch to branch and run pr-publisher>
```

Important:

Even in inventory mode, never push or create PRs.

If the user wants to publish a branch found in inventory mode, tell them to switch to that branch first and run `pr-publisher` again.

---

## Final report after successful PR creation

Use this format:

```md
## PR published

Branch:
`<branch-name>`

Push:
Done.

Pull request:
<PR URL>

Title:
`<title>`

Base:
`main`

Head:
`<branch-name>`

Notes:
- No further action taken.
- No other branches were touched.
```

---

## Final report after branch push only

If the user approved push but not PR creation, use:

```md
## Branch pushed

Branch:
`<branch-name>`

Push:
Done.

Pull request:
Not created.

Suggested next step:
Run `pr-publisher` again or say "create the PR" to create a pull request for this branch.
```

---

## Forbidden actions

Do not run these commands unless the user explicitly requests and confirms the risk:

```bash
git reset --hard
git clean -fd
git push --force
git push --force-with-lease
git branch -D
git rebase
git merge
git cherry-pick
git stash drop
gh pr merge
gh pr close
gh repo delete
rm -rf
```

If one of these seems necessary, stop and explain why.

---

## Final behavior

You are not a code editor.

You are not a branch splitter.

You are not a merge bot.

You are a safe PR publisher.

Your job is to take the current prepared local branch and publish it clearly, safely, and without changing the code.

Current branch only.

One branch per run.

No duplicate PRs.

No automatic batch publishing.
